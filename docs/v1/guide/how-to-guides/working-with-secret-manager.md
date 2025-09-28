---
outline: deep
---

# How to inject environment variables from .env files

**Prerequisites**
- You can create a Stack with `Stack.fromTemplate`
- You have a `.env` file with secrets
- You can run `kubricate generate` successfully

## Set up SecretManager

Create a SecretManager that reads from environment variables:

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

## Configure .env file

Add secrets with the `KUBRICATE_SECRET_` prefix:

```bash
# .env
KUBRICATE_SECRET_DATABASE_URL=postgresql://localhost:5432/mydb
KUBRICATE_SECRET_API_KEY=sk_test_123456789
```

The `EnvConnector` automatically looks for environment variables with this prefix.

## Inject secrets into stack

Use the SecretManager in your stack:

```ts
// src/stacks.ts
import { simpleAppTemplate } from '@kubricate/stacks'
import { Stack } from 'kubricate'
import { secretManager } from './setup-secrets'

export const apiService = Stack.fromTemplate(simpleAppTemplate, {
  name: 'api-service',
  imageName: 'api'
})
.useSecrets(secretManager, c => {
  c.secrets('DATABASE_URL').inject()
  c.secrets('API_KEY').inject()
})
```

## Verify injection

Generate your manifests to confirm secret injection:

```bash
bun kubricate generate
```

Check the generated deployment for environment variables:

```yaml
# output/apiService.yml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: api-service
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: DATABASE_URL
        - name: API_KEY
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: API_KEY
```

**Result:** Your container now receives `DATABASE_URL` and `API_KEY` environment variables from your .env file.

## Use custom environment variable names

To use different environment variable names in containers than in your secret storage:

```ts
// src/setup-secrets.ts - Add secrets with storage names
export const secretManager = new SecretManager()
  // ... existing setup
  .addSecret({ name: 'pg_connection_string' })  // Storage name
  .addSecret({ name: 'stripe_api_key' })        // Storage name
```

```bash
# .env - Use storage names with prefix
KUBRICATE_SECRET_pg_connection_string=postgresql://localhost:5432/mydb
KUBRICATE_SECRET_stripe_api_key=sk_test_123456789
```

```ts
// src/stacks.ts - Use .forName() to rename in containers
.useSecrets(secretManager, c => {
  // Storage name → Container environment variable name
  c.secrets('pg_connection_string').forName('DATABASE_URL').inject()
  c.secrets('stripe_api_key').forName('STRIPE_SECRET_KEY').inject()
})
```

**Result:** Your container receives `DATABASE_URL` and `STRIPE_SECRET_KEY` environment variables, regardless of the storage names.

This is useful when:
- Your secret storage uses different naming conventions
- You want consistent environment variable names across applications
- Multiple stacks need the same secret with different names

## Debug common issues

| Error | Cause | Fix |
|-------|-------|-----|
| `No injection strategy defined` | Forgot `.inject()` | Add `.inject()` after secrets |
| `Secret not found` | Missing from .env | Add `KUBRICATE_SECRET_` prefix |
| `Resource ID not found` | Wrong stack structure | Check `Object.keys(stack.build())` |

Quick debugging:

```ts
// Check what secrets are registered
console.log('Registered secrets:', secretManager.getSecrets())

// Check what resources exist
console.log('Available resources:', Object.keys(stack.build()))
```

## Add more secrets

To add additional secrets, update both SecretManager and .env:

```ts
// src/setup-secrets.ts
export const secretManager = new SecretManager()
  // ... existing setup
  .addSecret({ name: 'DATABASE_URL' })
  .addSecret({ name: 'API_KEY' })
  .addSecret({ name: 'REDIS_URL' })        // Add new secret
  .addSecret({ name: 'JWT_SECRET' })       // Add new secret
```

```bash
# .env
KUBRICATE_SECRET_DATABASE_URL=postgresql://localhost:5432/mydb
KUBRICATE_SECRET_API_KEY=sk_test_123456789
KUBRICATE_SECRET_REDIS_URL=redis://localhost:6379
KUBRICATE_SECRET_JWT_SECRET=your-jwt-secret-key
```

```ts
// src/stacks.ts
.useSecrets(secretManager, c => {
  c.secrets('DATABASE_URL').inject()
  c.secrets('API_KEY').inject()
  c.secrets('REDIS_URL').inject()
  c.secrets('JWT_SECRET').inject()
})
```

## Next Steps

**Related how-to guides:**
- [How to organize secrets across teams](./scaling-with-secret-registry) for multi-team setups
- [Template Overrides](./template-overrides) for combining secrets with resource customization

**Advanced secret management:**
- Target specific containers with `containerIndex`
- Set up Docker registry authentication
- Switch secret sources per environment
