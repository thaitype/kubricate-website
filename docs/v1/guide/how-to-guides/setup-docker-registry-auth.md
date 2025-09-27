---
outline: deep
---

# How to configure Docker registry authentication with secrets

**Prerequisites**
- You have a SecretManager configured and working
- You need to pull images from a private Docker registry
- You can run `kubricate generate` successfully

## Set up registry credentials in environment

Add Docker registry credentials with the secret prefix:

```bash
# .env
KUBRICATE_SECRET_DOCKER_USERNAME=your-username
KUBRICATE_SECRET_DOCKER_PASSWORD=your-password
KUBRICATE_SECRET_DOCKER_EMAIL=your-email@example.com
KUBRICATE_SECRET_DOCKER_SERVER=https://index.docker.io/v1/
```

For private registries, update the server URL:

```bash
# For GitHub Container Registry
KUBRICATE_SECRET_DOCKER_SERVER=https://ghcr.io

# For AWS ECR
KUBRICATE_SECRET_DOCKER_SERVER=123456789012.dkr.ecr.us-west-2.amazonaws.com

# For Google Container Registry
KUBRICATE_SECRET_DOCKER_SERVER=https://gcr.io
```

## Configure SecretManager for registry auth

Create a SecretManager that handles Docker registry authentication:

```ts
// src/setup-registry-auth.ts
import { EnvConnector } from '@kubricate/plugin-env'
import { DockerRegistrySecretProvider } from '@kubricate/plugin-kubernetes'
import { SecretManager } from 'kubricate'

export const registrySecretManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider('DockerRegistrySecretProvider', new DockerRegistrySecretProvider({
    name: 'registry-credentials'
  }))
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('DockerRegistrySecretProvider')
  .addSecret({ name: 'DOCKER_USERNAME' })
  .addSecret({ name: 'DOCKER_PASSWORD' })
  .addSecret({ name: 'DOCKER_EMAIL' })
  .addSecret({ name: 'DOCKER_SERVER' })
```

## Apply registry auth to your stack

Use registry authentication in your stack configuration:

```ts
// src/stacks.ts
import { simpleAppTemplate } from '@kubricate/stacks'
import { Stack } from 'kubricate'
import { registrySecretManager } from './setup-registry-auth'

export const privateApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'private-app',
  imageName: 'your-registry.com/private-image',
  namespace: 'production'
})
.useSecrets(registrySecretManager, c => {
  c.registry('registry-credentials').auth()
})
```

**Result:** Your deployment can now pull images from your private registry.

## Configure multiple registry authentication

To authenticate with multiple private registries:

```ts
// src/setup-multi-registry.ts
export const multiRegistryManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())

  // GitHub Container Registry
  .addProvider('GitHubRegistry', new DockerRegistrySecretProvider({
    name: 'github-registry-auth'
  }))

  // AWS ECR
  .addProvider('ECRRegistry', new DockerRegistrySecretProvider({
    name: 'ecr-registry-auth'
  }))

  .setDefaultConnector('EnvConnector')

  // GitHub secrets
  .addSecret({ name: 'GITHUB_USERNAME', provider: 'GitHubRegistry' })
  .addSecret({ name: 'GITHUB_TOKEN', provider: 'GitHubRegistry' })
  .addSecret({ name: 'GITHUB_EMAIL', provider: 'GitHubRegistry' })
  .addSecret({ name: 'GITHUB_SERVER', provider: 'GitHubRegistry' })

  // ECR secrets
  .addSecret({ name: 'ECR_USERNAME', provider: 'ECRRegistry' })
  .addSecret({ name: 'ECR_PASSWORD', provider: 'ECRRegistry' })
  .addSecret({ name: 'ECR_EMAIL', provider: 'ECRRegistry' })
  .addSecret({ name: 'ECR_SERVER', provider: 'ECRRegistry' })
```

```bash
# .env - Multiple registry credentials
# GitHub Container Registry
KUBRICATE_SECRET_GITHUB_USERNAME=your-github-username
KUBRICATE_SECRET_GITHUB_TOKEN=ghp_your_personal_access_token
KUBRICATE_SECRET_GITHUB_EMAIL=your-email@example.com
KUBRICATE_SECRET_GITHUB_SERVER=https://ghcr.io

# AWS ECR
KUBRICATE_SECRET_ECR_USERNAME=AWS
KUBRICATE_SECRET_ECR_PASSWORD=your-ecr-token
KUBRICATE_SECRET_ECR_EMAIL=your-email@example.com
KUBRICATE_SECRET_ECR_SERVER=123456789012.dkr.ecr.us-west-2.amazonaws.com
```

Apply different registry auth to different stacks:

```ts
// src/stacks.ts
export const githubApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'github-app',
  imageName: 'ghcr.io/your-org/app'
})
.useSecrets(multiRegistryManager, c => {
  c.registry('github-registry-auth').auth()
})

export const ecrApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'ecr-app',
  imageName: '123456789012.dkr.ecr.us-west-2.amazonaws.com/app'
})
.useSecrets(multiRegistryManager, c => {
  c.registry('ecr-registry-auth').auth()
})
```

## Verify registry authentication

Generate manifests and check for image pull secrets:

```bash
bun kubricate generate
```

Check the generated deployment includes `imagePullSecrets`:

```yaml
# output/privateApp.yml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      imagePullSecrets:
      - name: registry-credentials
      containers:
      - name: private-app
        image: your-registry.com/private-image:latest
---
apiVersion: v1
kind: Secret
metadata:
  name: registry-credentials
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: <base64-encoded-credentials>
```

Test image pulling by applying to a cluster:

```bash
kubectl apply -f output/privateApp.yml
kubectl get pods -w  # Watch for successful image pulls
```

## Debug registry authentication issues

| Error | Cause | Fix |
|-------|-------|-----|
| `ImagePullBackOff` | Wrong credentials | Check username/password in .env |
| `ErrImagePull` | Wrong registry server | Verify DOCKER_SERVER URL |
| No imagePullSecrets | Missing `.auth()` call | Add `.auth()` to registry config |

Quick debugging steps:

```bash
# Check generated secret content
kubectl get secret registry-credentials -o yaml

# Test Docker credentials manually
echo $KUBRICATE_SECRET_DOCKER_PASSWORD | docker login $KUBRICATE_SECRET_DOCKER_SERVER -u $KUBRICATE_SECRET_DOCKER_USERNAME --password-stdin

# Check pod events for pull errors
kubectl describe pod <pod-name>
```

Common fixes:

```ts
// ❌ Missing authentication call
.useSecrets(registrySecretManager, c => {
  // Registry secret exists but not applied to deployment
})

// ✅ Proper registry authentication
.useSecrets(registrySecretManager, c => {
  c.registry('registry-credentials').auth()  // Apply to deployment
})
```

## Use with CI/CD pipelines

For automated deployments, set registry credentials as CI secrets:

```yaml
# .github/workflows/deploy.yml
env:
  KUBRICATE_SECRET_DOCKER_USERNAME: ${{ secrets.DOCKER_USERNAME }}
  KUBRICATE_SECRET_DOCKER_PASSWORD: ${{ secrets.DOCKER_PASSWORD }}
  KUBRICATE_SECRET_DOCKER_EMAIL: ${{ secrets.DOCKER_EMAIL }}
  KUBRICATE_SECRET_DOCKER_SERVER: ${{ secrets.DOCKER_SERVER }}

steps:
  - name: Generate manifests
    run: bun kubricate generate

  - name: Deploy to cluster
    run: kubectl apply -f output/
```

**Result:** Your CI/CD pipeline can authenticate with private registries and deploy successfully.

## Next Steps

**Related how-to guides:**
- [Working with Secret Manager](./working-with-secret-manager) for basic secret injection patterns
- [Scaling with Secret Registry](./scaling-with-secret-registry) for multi-team registry setups