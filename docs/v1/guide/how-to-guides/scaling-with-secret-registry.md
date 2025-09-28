---
outline: deep
---

# How to Organize Secrets Across Teams with SecretRegistry

**Prerequisites**
- You have a working SecretManager setup
- You have multiple teams/domains that need separate secret management
- You can run `kubricate generate` successfully

## Set up team-based secret managers

Create separate SecretManagers for each team to avoid conflicts:

```ts
// src/setup-secrets.ts
import { EnvConnector } from '@kubricate/plugin-env'
import { OpaqueSecretProvider } from '@kubricate/plugin-kubernetes'
import { SecretManager, SecretRegistry } from 'kubricate'

const frontendSecrets = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({
    name: 'frontend-app-secrets'  // Team-specific naming
  }))
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')
  .addSecret({ name: 'STRIPE_PUBLIC_KEY' })
  .addSecret({ name: 'ANALYTICS_KEY' })

const backendSecrets = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({
    name: 'backend-app-secrets'   // Team-specific naming
  }))
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')
  .addSecret({ name: 'DATABASE_URL' })
  .addSecret({ name: 'JWT_SECRET' })
```

## Create and configure the registry

Add both managers to a SecretRegistry:

```ts
// src/setup-secrets.ts (continued)
export const secretRegistry = new SecretRegistry()
  .add('frontend', frontendSecrets)
  .add('backend', backendSecrets)
```

## Wire registry into stacks

Use specific managers for each stack via `.get()`:

```ts
// src/stacks.ts
import { simpleAppTemplate } from '@kubricate/stacks'
import { Stack } from 'kubricate'
import { secretRegistry } from './setup-secrets'

export const frontendApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'frontend-app',
  imageName: 'nginx'
})
.useSecrets(secretRegistry.get('frontend'), c => {
  c.secrets('STRIPE_PUBLIC_KEY').forName('STRIPE_KEY').inject()
  c.secrets('ANALYTICS_KEY').inject()
})

export const backendApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'backend-app',
  imageName: 'api'
})
.useSecrets(secretRegistry.get('backend'), c => {
  c.secrets('DATABASE_URL').inject()
  c.secrets('JWT_SECRET').inject()
})
```

For stacks that need secrets from multiple teams:

```ts
export const apiGateway = Stack.fromTemplate(simpleAppTemplate, {
  name: 'api-gateway',
  imageName: 'gateway'
})
.useSecrets(secretRegistry.get('backend'), c => {
  c.secrets('DATABASE_URL').forName('DB_CONNECTION').inject()
})
.useSecrets(secretRegistry.get('frontend'), c => {
  c.secrets('ANALYTICS_KEY').forName('ANALYTICS_TOKEN').inject()
})
```

## Configure registry in kubricate.config.ts

Register the SecretRegistry in your config:

```ts
// kubricate.config.ts
import { defineConfig } from 'kubricate'
import { frontendApp, backendApp } from './src/stacks'
import { secretRegistry } from './src/setup-secrets'

export default defineConfig({
  stacks: {
    frontendApp,
    backendApp
  },
  secret: {
    secretSpec: secretRegistry,
    conflict: {
      strategies: {
        crossManager: 'error'  // Fail on cross-team conflicts
      }
    }
  }
})
```

## Prevent naming conflicts between teams

Use team-specific prefixes to avoid resource collisions:

```ts
// ✅ Good: Team-prefixed names
const frontendSecrets = new SecretManager()
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({
    name: 'frontend-app-secrets'
  }))

const backendSecrets = new SecretManager()
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({
    name: 'backend-app-secrets'
  }))

// ❌ Bad: Generic names that will conflict
const conflictingSecrets = new SecretManager()
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({
    name: 'app-secrets'  // Multiple teams will conflict
  }))
```

For teams using different secret backends:

```ts
// Frontend team uses environment variables
const frontendSecrets = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .setDefaultConnector('EnvConnector')

// Platform team uses external secret management
const platformSecrets = new SecretManager()
  .addConnector('VaultConnector', vaultConnector)
  .setDefaultConnector('VaultConnector')

export const secretRegistry = new SecretRegistry()
  .add('frontend', frontendSecrets)
  .add('platform', platformSecrets)
```

## Debug registry issues

| Error | Cause | Fix |
|-------|-------|-----|
| `Duplicate name "app"` | Two managers with same key | Use unique keys: `'frontend-app'`, `'backend-app'` |
| `Manager not found` | Typo in `.get()` call | Check `registry.get('frontend')` spelling |
| Resource conflicts | Same provider names | Use team prefixes: `'frontend-secrets'`, `'backend-secrets'` |

Check what managers are available:

```ts
// List all registered manager names
console.log('Available managers:', secretRegistry.list())

// Verify specific manager exists
const frontendManager = secretRegistry.get('frontend')
console.log('Frontend secrets:', frontendManager.getSecrets())
```

Common fixes:

```ts
// ❌ Typo in manager name
const secrets = registry.get('fronend')

// ✅ Correct manager name
const secrets = registry.get('frontend')

// ❌ Conflicting provider names
.addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({
  name: 'app-secrets'  // Will conflict across teams
}))

// ✅ Team-specific provider names
.addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({
  name: 'frontend-app-secrets'  // Unique per team
}))
```

## Add secrets to environment

Set team-specific environment variables:

```bash
# .env - Frontend team secrets
KUBRICATE_SECRET_STRIPE_PUBLIC_KEY=pk_test_123
KUBRICATE_SECRET_ANALYTICS_KEY=analytics_key_456

# Backend team secrets
KUBRICATE_SECRET_DATABASE_URL=postgresql://localhost:5432/app
KUBRICATE_SECRET_JWT_SECRET=secret_jwt_key_789
```

## Verify setup

Run generation to ensure everything works:

```bash
# Generate manifests
bun kubricate generate

# Validate secret registry without conflicts
bun kubricate secret apply --dry-run
```

Your containers will now receive team-specific secrets without conflicts.

## Next Steps

- [Working with SecretManager](./working-with-secret-manager) for single-team secret management
- [Config Overrides](./config-overrides) for customizing generated resources