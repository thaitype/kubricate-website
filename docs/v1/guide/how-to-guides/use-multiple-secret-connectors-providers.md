---
outline: deep
---

# How to use multiple secret providers and connectors

**Prerequisites**
- You have a basic SecretManager setup working
- You understand how to configure .env files
- You can run `kubricate generate` successfully

## Configure multiple providers

Set up both `OpaqueSecretProvider` for environment variables and `DockerConfigSecretProvider` for Docker registry authentication:

```ts
// src/setup-secrets.ts
import { EnvConnector } from '@kubricate/plugin-env'
import { OpaqueSecretProvider, DockerConfigSecretProvider } from '@kubricate/plugin-kubernetes'
import { SecretManager } from 'kubricate'

export const secretManager = new SecretManager()
  // Add connector
  .addConnector('EnvConnector', new EnvConnector())

  // Add multiple providers
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({
    name: 'app-secrets'
  }))
  .addProvider('DockerRegistryProvider', new DockerConfigSecretProvider({
    name: 'docker-registry-secrets'
  }))

  // Set defaults
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')

  // Declare secrets with different providers
  .addSecret({ name: 'DATABASE_URL' })  // Uses default OpaqueSecretProvider
  .addSecret({ name: 'API_KEY' })       // Uses default OpaqueSecretProvider
  .addSecret({
    name: 'DOCKER_REGISTRY_AUTH',
    provider: 'DockerRegistryProvider'  // Override to use DockerConfigSecretProvider
  })
```

**Result:** You now have two providers available, with OpaqueSecretProvider as the default for most secrets.

## Override providers per secret

Use different providers for different types of secrets:

```ts
export const secretManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({ name: 'app-secrets' }))
  .addProvider('DockerRegistryProvider', new DockerConfigSecretProvider({ name: 'registry-auth' }))
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')

  // Environment variables (default provider)
  .addSecret({ name: 'DATABASE_URL' })
  .addSecret({ name: 'JWT_SECRET' })
  .addSecret({ name: 'REDIS_URL' })

  // Docker registry authentication (specific provider)
  .addSecret({
    name: 'PRIVATE_REGISTRY_AUTH',
    provider: 'DockerRegistryProvider'
  })
  .addSecret({
    name: 'GITHUB_REGISTRY_AUTH',
    provider: 'DockerRegistryProvider'
  })
```

**Result:** Different secret types use appropriate providers automatically.

## Configure environment variables

Set up different environment variable formats for different providers:

```bash
# .env

# Standard secrets for OpaqueSecretProvider (environment variables)
KUBRICATE_SECRET_DATABASE_URL=postgres://user:password@localhost:5432/mydb
KUBRICATE_SECRET_JWT_SECRET=your-jwt-secret-key
KUBRICATE_SECRET_REDIS_URL=redis://localhost:6379

# Docker registry secrets for DockerConfigSecretProvider (JSON format)
KUBRICATE_SECRET_PRIVATE_REGISTRY_AUTH='{"username":"your-user","password":"your-token","registry":"your-registry.com"}'
KUBRICATE_SECRET_GITHUB_REGISTRY_AUTH='{"username":"github-user","password":"ghp_token","registry":"ghcr.io"}'
```

**Key differences:**
- **OpaqueSecretProvider**: Simple key-value format
- **DockerConfigSecretProvider**: JSON object with `username`, `password`, `registry` fields

## Apply secrets to stacks

Use the configured secrets in your stacks with default injection strategies:

```ts
// src/stacks.ts
import { simpleAppTemplate } from '@kubricate/stacks'
import { Stack } from 'kubricate'
import { secretManager } from './setup-secrets'

export const webApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'web-app',
  imageName: 'your-registry.com/private-image',
  namespace: 'production'
})
.useSecrets(secretManager, c => {
  // Environment variables (OpaqueSecretProvider default: env injection)
  c.secrets('DATABASE_URL').inject()
  c.secrets('JWT_SECRET').inject()
  c.secrets('REDIS_URL').forName('CACHE_URL').inject()

  // Docker registry auth (DockerConfigSecretProvider default: imagePullSecret injection)
  c.secrets('PRIVATE_REGISTRY_AUTH').inject()
})
```

**Result:**
- Environment variables are injected as container env vars
- Docker registry auth is automatically added to `imagePullSecrets`

## Apply secrets

When we setup the `.env` files, we can use `kubricate secret apply` to create/update secrets in the target providers, in this case, both Opaque and DockerConfig secrets will be created in Kubernetes.

```bash
bun kubricate secret apply
```

and you can check the created secrets in your Kubernetes cluster:

```bash
kubectl get secrets
```

## Verify configuration

Check that secrets are applied correctly:

```bash
bun kubricate generate
```

Inspect the generated manifests:

```yaml
# output/webApp.yml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      # Docker registry authentication automatically applied
      imagePullSecrets:
      - name: registry-auth
      containers:
      - name: web-app
        image: your-registry.com/private-image:latest
        # Environment variables from OpaqueSecretProvider
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: DATABASE_URL
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: JWT_SECRET
        - name: CACHE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: REDIS_URL
---
# Standard Kubernetes Secret for environment variables
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
  DATABASE_URL: <base64-encoded-value>
  JWT_SECRET: <base64-encoded-value>
  REDIS_URL: <base64-encoded-value>
---
# Docker config secret for registry authentication
apiVersion: v1
kind: Secret
metadata:
  name: registry-auth
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: <base64-encoded-docker-config>
```

## Debug common issues

| Error | Cause | Fix |
|-------|-------|-----|
| `Provider not found` | Wrong provider name in `.addSecret()` | Check provider key matches `.addProvider()` name |
| `Secret format invalid` | Wrong JSON format for Docker secrets | Use `{"username":"","password":"","registry":""}` format |
| No imagePullSecrets | DockerConfigSecretProvider not injected | Ensure `.inject()` is called on Docker secrets |

Quick debugging steps:

```ts
// Check what providers are registered
const resources = stack.build()
console.log('Available resource IDs:', Object.keys(resources))

// Check generated manifests contain expected secrets
console.log('Generated resources:', JSON.stringify(resources, null, 2))
```

## Multiple connectors (future-ready)

While currently only EnvConnector is available, the API supports multiple connectors:

```ts
export const secretManager = new SecretManager()
  // Multiple connectors (when available)
  .addConnector('EnvConnector', new EnvConnector())
  // .addConnector('VaultConnector', new VaultConnector()) // Future
  // .addConnector('AzureKVConnector', new AzureKVConnector()) // Future

  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({ name: 'app-secrets' }))

  // Set default connector
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')

  // Override connector per secret (when multiple connectors available)
  .addSecret({ name: 'DATABASE_URL' })  // Uses default EnvConnector
  .addSecret({
    name: 'VAULT_SECRET',
    connector: 'VaultConnector'  // Future: override to use different connector
  })
```

**Current state:** Only EnvConnector is implemented, but the API is ready for future connector additions like Vault, Azure Key Vault, or 1Password.

## Next Steps

**Related how-to guides:**
- [Working with Secret Manager](./working-with-secret-manager) for basic secret setup
- [Scaling with Secret Registry](./scaling-with-secret-registry) for multi-team environments
- [Inject Secrets to Sidecar](./inject-secrets-sidecar) for advanced injection patterns