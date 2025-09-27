---
outline: deep
---

# How to Manage Secrets with SecretManager

**Prerequisites**
- You can define a Stack with `Stack.fromTemplate`
- You have run `kubricate generate` successfully

## Inject secrets from .env files

To get secrets from your local `.env` file into container environment variables:

1. Create a SecretManager:

```ts
// src/setup-secrets.ts
import { EnvConnector } from '@kubricate/plugin-env'
import { OpaqueSecretProvider } from '@kubricate/plugin-kubernetes'
import { SecretManager } from 'kubricate'

export const secretManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({
    name: 'app-secrets'
  }))
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')
  .addSecret({ name: 'DATABASE_URL' })
  .addSecret({ name: 'API_KEY' })
```

2. Add secrets to `.env` with the `KUBRICATE_SECRET_` prefix:

```bash
# .env
KUBRICATE_SECRET_DATABASE_URL=postgresql://localhost:5432/mydb
KUBRICATE_SECRET_API_KEY=sk_test_123456789
```

3. Inject into your stack:

```ts
// src/stacks.ts
import { simpleAppTemplate } from '@kubricate/stacks'
import { Stack } from 'kubricate'
import { secretManager } from './setup-secrets'

const apiService = Stack.fromTemplate(simpleAppTemplate, {
  name: 'api-service',
  imageName: 'api'
})
.useSecrets(secretManager, c => {
  c.secrets('DATABASE_URL').inject()
  c.secrets('API_KEY').inject()
})
```

## Rename secrets during injection

To use different environment variable names in containers than in your secret storage:

```ts
const apiService = Stack.fromTemplate(simpleAppTemplate, {
  name: 'api-service',
  imageName: 'api'
})
.useSecrets(secretManager, c => {
  // Secret name → Environment variable name
  c.secrets('pg_connection_string').forName('DATABASE_URL').inject()
  c.secrets('stripe_api_key').forName('STRIPE_SECRET_KEY').inject()
})
```

## Target specific containers

To inject different secrets into different containers in multi-container pods:

```ts
const multiContainerApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'multi-container-app',
  imageName: 'app'
})
.useSecrets(secretManager, c => {
  // Main container (index 0)
  c.secrets('APP_SECRET').inject('env', { containerIndex: 0 })
  // Sidecar container (index 1)
  c.secrets('SIDECAR_TOKEN').inject('env', { containerIndex: 1 })
})
```

## Target specific resources

To inject secrets into specific resources when your stack has multiple deployments:

```ts
.useSecrets(secretManager, c => {
  c.secrets('WEB_SECRET').inject().intoResource('webDeployment')
  c.secrets('WORKER_SECRET').inject().intoResource('workerDeployment')
})
```

If most secrets target the same resource:

```ts
.useSecrets(secretManager, c => {
  c.setDefaultResourceId('webDeployment')
  c.secrets('APP_SECRET').inject()      // → webDeployment
  c.secrets('WORKER_SECRET').inject().intoResource('workerDeployment') // override
})
```

## Set up Docker registry authentication

To pull images from private registries:

1. Add Docker config provider:

```ts
import { DockerConfigSecretProvider } from '@kubricate/plugin-kubernetes'

export const secretManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider('DockerConfigSecretProvider', new DockerConfigSecretProvider({
    name: 'registry-secrets'
  }))
  .addSecret({ name: 'DOCKER_REGISTRY_TOKEN', provider: 'DockerConfigSecretProvider' })
```

2. Set registry credentials in `.env` (Kubernetes expects dockerconfig secrets in JSON format):

```bash
# .env
KUBRICATE_SECRET_DOCKER_REGISTRY_TOKEN={"username":"myuser","password":"mypass","registry":"registry.example.com"}
```

3. Inject the registry secret:

```ts
const apiService = Stack.fromTemplate(simpleAppTemplate, {
  name: 'api-service',
  imageName: 'registry.example.com/api'
})
.useSecrets(secretManager, c => {
  c.secrets('DOCKER_REGISTRY_TOKEN').inject()
})
```

The secret automatically becomes an `imagePullSecret`.

## Debug secret injection failures

| Error Message | Cause | Fix |
|---------------|-------|-----|
| `No injection strategy defined` | Forgot `.inject()` | Add `.inject()` |
| `Multiple strategies supported, kind required` | Didn't specify strategy | Use `.inject('env')` |
| `Resource ID not found` | Wrong resource key | Check `Object.keys(stack.build())` |

Quick debugging steps:

```ts
// Check available resources
console.log('Available resources:', Object.keys(stack.build()))

// Verify secret injections
console.log('Secret injections:', stack.getTargetInjects())
```

Common fixes:

```ts
// ❌ Missing .inject()
c.secrets('MY_SECRET').forName('API_KEY')

// ✅ Always call .inject()
c.secrets('MY_SECRET').forName('API_KEY').inject()
```

## Next Steps

- [Scaling with SecretRegistry](./scaling-with-secret-registry) for multi-team secret organization
- [Working with Secrets Tutorial](../tutorials/working-with-secrets) for step-by-step examples