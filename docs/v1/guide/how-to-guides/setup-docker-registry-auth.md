---
outline: deep
---

# How to configure Docker registry authentication with secrets

**Prerequisites**
- You have a SecretManager configured and working
- You need to pull images from a private Docker registry
- You can run `kubricate generate` successfully

## Set up registry credentials in environment

Add Docker registry credentials with the secret prefix. The value must be a JSON object that matches `DockerConfigSecretProvider`’s schema (`{ username, password, registry }`).

```bash
# .env
KUBRICATE_SECRET_DOCKER_SECRET='{"username":"your-user","password":"your-pass","registry":"https://index.docker.io/v1/"}'
```

Update `registry` for other registries:

```bash
# GitHub Container Registry
KUBRICATE_SECRET_DOCKER_SECRET='{"username":"gh-user","password":"gh-token","registry":"https://ghcr.io"}'

# AWS ECR (example registry endpoint)
KUBRICATE_SECRET_DOCKER_SECRET='{"username":"AWS","password":"<ecr-token>","registry":"123456789012.dkr.ecr.us-west-2.amazonaws.com"}'

# Google Artifact Registry
KUBRICATE_SECRET_DOCKER_SECRET='{"username":"oauth2accesstoken","password":"<gcp-token>","registry":"https://us-docker.pkg.dev"}'
```

## Configure SecretManager for registry auth

Create a SecretManager that reads the JSON secret and renders the registry credentials:

```ts
// src/setup-registry-auth.ts
import { EnvConnector } from '@kubricate/plugin-env'
import { DockerConfigSecretProvider, OpaqueSecretProvider } from '@kubricate/plugin-kubernetes'
import { SecretManager } from 'kubricate'

export const registrySecretManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({ name: 'app-secrets' }))
  .addProvider('DockerConfigSecretProvider', new DockerConfigSecretProvider({
    name: 'registry-credentials'
  }))
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')
  .addSecret({ name: 'DOCKER_SECRET', provider: 'DockerConfigSecretProvider' })
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
  .useSecrets(registrySecretManager, injector => {
    injector.secrets('DOCKER_SECRET').inject('imagePullSecret')
  })
```

**Result:** The generated deployment declares `imagePullSecrets: [{ name: 'registry-credentials' }]` and the Docker config secret.

## Configure multiple registry authentication

To authenticate with multiple private registries, create additional providers and secrets—each secret still stores `{ username, password, registry }` JSON.

```ts
// src/setup-multi-registry.ts
export const multiRegistryManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider('GitHubRegistry', new DockerConfigSecretProvider({ name: 'github-registry-auth' }))
  .addProvider('EcrRegistry', new DockerConfigSecretProvider({ name: 'ecr-registry-auth' }))
  .setDefaultConnector('EnvConnector')
  .addSecret({ name: 'GITHUB_DOCKER_SECRET', provider: 'GitHubRegistry' })
  .addSecret({ name: 'ECR_DOCKER_SECRET', provider: 'EcrRegistry' })
```

```bash
# .env
KUBRICATE_SECRET_GITHUB_DOCKER_SECRET='{"username":"gh-user","password":"gh-token","registry":"https://ghcr.io"}'
KUBRICATE_SECRET_ECR_DOCKER_SECRET='{"username":"AWS","password":"<ecr-token>","registry":"123456789012.dkr.ecr.us-west-2.amazonaws.com"}'
```

Apply different registry auth to different stacks:

```ts
// src/stacks.ts
export const githubApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'github-app',
  imageName: 'ghcr.io/your-org/app'
}).useSecrets(multiRegistryManager, injector => {
  injector.secrets('GITHUB_DOCKER_SECRET').inject('imagePullSecret')
})

export const ecrApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'ecr-app',
  imageName: '123456789012.dkr.ecr.us-west-2.amazonaws.com/app'
}).useSecrets(multiRegistryManager, injector => {
  injector.secrets('ECR_DOCKER_SECRET').inject('imagePullSecret')
})
```

## Verify registry authentication

Generate manifests and check for image pull secrets:

```bash
bun kubricate generate
```

Check the generated deployment includes `imagePullSecrets` and the docker config secret:

```yaml
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
| `ErrImagePull` | Wrong registry value | Confirm `registry` matches the image host |
| No imagePullSecrets | Secret not injected | Call `inject('imagePullSecret')` with the registry secret |

Quick debugging steps:

```bash
# Check generated secret content
kubectl get secret registry-credentials -o yaml

# Test Docker credentials manually
echo $KUBRICATE_SECRET_DOCKER_SECRET | jq -r '.password' | \
  docker login $(echo $KUBRICATE_SECRET_DOCKER_SECRET | jq -r '.registry') \
    -u $(echo $KUBRICATE_SECRET_DOCKER_SECRET | jq -r '.username') --password-stdin

# Check pod events for pull errors
kubectl describe pod <pod-name>
```

Common fixes:

```ts
// ❌ Secret declared but not injected
.useSecrets(registrySecretManager, c => {
  // No inject call, so imagePullSecrets are missing
})

// ✅ Proper registry authentication
.useSecrets(registrySecretManager, c => {
  c.secrets('DOCKER_SECRET').inject('imagePullSecret')
})
```

## Use with CI/CD pipelines

For automated deployments, set registry credentials as CI secrets:

```yaml
# .github/workflows/deploy.yml
env:
  KUBRICATE_SECRET_DOCKER_SECRET: ${{ secrets.DOCKER_SECRET_JSON }}

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
