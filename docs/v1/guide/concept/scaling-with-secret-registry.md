---
outline: deep
---

# Scaling with SecretRegistry

When you outgrow a single SecretManager — because you have multiple teams, domains, or complex multi-environment workflows — **SecretRegistry** provides the organizational layer you need to scale secret management across your entire project.

Instead of cramming all secret logic into one giant manager, SecretRegistry lets you compose multiple focused SecretManagers, each with their own responsibility, while providing centralized orchestration and type-safe access patterns.

> Think of SecretRegistry as your project's "secret department" — multiple specialized teams (managers), one coordinated strategy.

## Quick Start: Registry → Stack → Config

### 1. Build your registry

```ts
// @filename: src/setup-secrets.ts
import { EnvConnector } from '@kubricate/plugin-env'
import { OpaqueSecretProvider } from '@kubricate/plugin-kubernetes'
import { SecretManager, SecretRegistry } from 'kubricate'

const frontendSecrets = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({
    name: 'frontend-app-secrets'
  }))
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')
  .addSecret({ name: 'FRONTEND_API_KEY' })

const backendSecrets = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({
    name: 'backend-app-secrets'
  }))
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')
  .addSecret({ name: 'DATABASE_URL' })

export const secretRegistry = new SecretRegistry()
  .add('frontend', frontendSecrets)
  .add('backend', backendSecrets)
```

### 2. Inject registry managers into stacks

```ts
// @filename: src/stacks.ts
import { simpleAppTemplate } from '@kubricate/stacks'
import { Stack } from 'kubricate'
import { secretRegistry } from './setup-secrets'

export const frontendApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'frontend-app',
  imageName: 'nginx'
}).useSecrets(secretRegistry.get('frontend'), injector => {
  injector.secrets('FRONTEND_API_KEY').forName('API_KEY').inject()
})

export const backendApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'backend-app',
  imageName: 'nginx'
}).useSecrets(secretRegistry.get('backend'), injector => {
  injector.secrets('DATABASE_URL').forName('DB_CONNECTION').inject()
})
```

### 3. Register the registry in `kubricate.config.ts`

```ts
// @filename: kubricate.config.ts
import { defineConfig } from 'kubricate'
import { backendApp, frontendApp } from './src/stacks'
import { secretRegistry } from './src/setup-secrets'

export default defineConfig({
  stacks: {
    frontendApp,
    backendApp
  },
  secret: {
    secretSpec: secretRegistry
  }
})
```

After wiring everything up, run `bun kubricate generate` to see stack manifests, or `bun kubricate secret apply --dry-run` to validate registry conflicts before deployment.

## When You Need a SecretRegistry

A single SecretManager works well for small projects, but starts showing strain as you scale:

### Single Manager Problems at Scale:
- **Team conflicts** — frontend and backend teams stepping on each other's secret configurations
- **Domain mixing** — application secrets, infrastructure secrets, and platform secrets all jumbled together
- **Environment complexity** — different teams need different secret backends (some use Vault, others use environment variables)
- **Maintainability issues** — one massive secret configuration file that everyone has to understand

### SecretRegistry Solutions:
- **Team isolation** — separate managers for each team or domain
- **Clear ownership** — each manager has a focused responsibility
- **Flexible backends** — different teams can use different connectors and providers
- **Type safety** — TypeScript tracks which managers exist and their capabilities

## Core Concepts

### SecretRegistry Architecture

SecretRegistry acts as a **central orchestrator** that manages multiple SecretManagers. The quick-start example creates `frontendSecrets` and `backendSecrets`, then registers them under the keys `'frontend'` and `'backend'`. The registry simply stores those managers and hands them back via `.get()` when stacks call `.useSecrets()`.

### Manager Isolation & Naming

Each manager in the registry operates independently:
- **Separate configurations** — different connectors, providers, and secrets per manager
- **Isolated namespaces** — secrets in one manager don't interfere with another
- **Clear naming** — registry keys like `'frontend'`, `'backend'` establish ownership
- **Type safety** — TypeScript knows which managers exist and their structure

## Team-Based Architecture

The most common pattern is organizing managers by team ownership:

```ts
// @filename: src/secrets/frontend-secrets.ts
import { EnvConnector } from '@kubricate/plugin-env'
import { OpaqueSecretProvider } from '@kubricate/plugin-kubernetes'
import { SecretManager } from 'kubricate'

export const frontendSecrets = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({
    name: 'frontend-app-secrets'
  }))
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')

  // Frontend-specific secrets
  .addSecret({ name: 'STRIPE_PUBLIC_KEY' })
  .addSecret({ name: 'ANALYTICS_WRITE_KEY' })
  .addSecret({ name: 'CDN_URL' })
```

```ts
// @filename: src/secrets/backend-secrets.ts
import { EnvConnector } from '@kubricate/plugin-env'
import { OpaqueSecretProvider } from '@kubricate/plugin-kubernetes'
import { SecretManager } from 'kubricate'

export const backendSecrets = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({
    name: 'backend-app-secrets'
  }))
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')

  // Backend-specific secrets
  .addSecret({ name: 'DATABASE_URL' })
  .addSecret({ name: 'REDIS_PASSWORD' })
  .addSecret({ name: 'JWT_SECRET' })
```

```ts
// @filename: src/setup-secrets.ts
import { SecretRegistry } from 'kubricate'
import { backendSecrets } from './secrets/backend-secrets'
import { frontendSecrets } from './secrets/frontend-secrets'

export const secretRegistry = new SecretRegistry()
  .add('frontend', frontendSecrets)
  .add('backend', backendSecrets)
```

## Using SecretRegistry in Stacks

### Basic Registry Usage

Once you have a registry, stacks access managers via `.get()`:

```ts
// @filename: src/stacks.ts
import { simpleAppTemplate } from '@kubricate/stacks'
import { Stack } from 'kubricate'
import { secretRegistry } from './setup-secrets'

export const frontendApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'my-frontend',
  imageName: 'nginx',
  namespace: 'apps'
})
  .useSecrets(secretRegistry.get('frontend'), injector => {
    injector.secrets('FRONTEND_API_KEY').forName('ENV_APP_KEY').inject()
})

export const backendApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'my-backend',
  imageName: 'nginx',
  namespace: 'apps'
})
  .useSecrets(secretRegistry.get('backend'), injector => {
    injector.secrets('DATABASE_URL').forName('ENV_APP_KEY_2').inject()
})
```

### Multi-Manager Stack Usage

Some stacks need secrets from multiple managers:

```ts
// @filename: src/stacks.ts
import { simpleAppTemplate } from '@kubricate/stacks'
import { Stack } from 'kubricate'
import { secretRegistry } from './setup-secrets'

export const apiGateway = Stack.fromTemplate(simpleAppTemplate, {
  name: 'api-gateway',
  imageName: 'gateway',
  namespace: 'platform'
})
// Use backend secrets for database access
.useSecrets(secretRegistry.get('backend'), injector => {
  injector.secrets('DATABASE_URL').forName('DB_CONNECTION').inject()
})
// Use frontend secrets for API keys

.useSecrets(secretRegistry.get('frontend'), injector => {
  injector.secrets('ANALYTICS_WRITE_KEY').forName('ANALYTICS_TOKEN').inject()
})
```

This wiring is identical to the secret-registry example: hydrate the registry once, then hand specific managers to `.useSecrets()` wherever a stack needs them.

### Type-Safe Manager Access

The registry provides full TypeScript safety:

```ts
// @filename: src/setup-secrets.ts
import { SecretManager, SecretRegistry } from 'kubricate'

declare const frontendManager: SecretManager
declare const backendManager: SecretManager

export const secretRegistry = new SecretRegistry()
  .add('frontend', frontendManager)
  .add('backend', backendManager)

// TypeScript knows these managers exist
const frontend = secretRegistry.get('frontend') // ✅ Valid
const backend = secretRegistry.get('backend')   // ✅ Valid

// TypeScript catches typos
// const invalid = secretRegistry.get('fronend') // ❌ TypeScript error
```

## Collision Avoidance

### Understanding Conflicts

SecretRegistry detects conflicts when multiple managers try to create the same Kubernetes resource. Conflicts are identified by a canonical key:

```
{secretType}:{identifier}
```

For example:
- `Kubernetes.Secret.Opaque:app-secrets` (Opaque Secret named "app-secrets")
- `Kubernetes.Secret.DockerConfigSecret:registry-config` (Docker config Secret named "registry-config")

> Use `kubricate secret apply --debug` to inspect conflict handling when experimenting with different strategies.

### Naming Conventions to Prevent Conflicts

Establish clear naming patterns to avoid accidental collisions:

```ts
// @filename: src/secrets/team-conventions.ts
import { EnvConnector } from '@kubricate/plugin-env'
import { OpaqueSecretProvider } from '@kubricate/plugin-kubernetes'
import { SecretManager } from 'kubricate'

// ✅ Good: Team-prefixed provider names
const frontendSecrets = new SecretManager()
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({
    name: 'frontend-app-secrets'  // Clear team ownership
  }))

const backendSecrets = new SecretManager()
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({
    name: 'backend-app-secrets'   // Clear team ownership
  }))

// ❌ Bad: Generic names that will conflict
const conflictingSecrets = new SecretManager()
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({
    name: 'app-secrets'  // Too generic, will conflict
  }))
```

## Registry Configuration

Configure the registry in your `kubricate.config.ts`:

```ts
// @filename: kubricate.config.ts
import { defineConfig } from 'kubricate'
import { secretRegistry } from './src/setup-secrets'

export default defineConfig({
  stacks: {},
  secret: {
    secretSpec: secretRegistry,
    conflict: {
      strategies: {
        crossManager: 'error'    // Fail fast on cross-team conflicts
      }
    }
  }
})
```

Kubricate accepts either a registry or a single manager through `secret.secretSpec`, so this configuration covers both CLI commands such as `kubricate secret apply` and stack-level `.useSecrets()` hooks.

## Mixed Connector Strategies

Different teams can use different secret backends within the same registry:

```ts
// @filename: src/setup-secrets.ts
import { EnvConnector } from '@kubricate/plugin-env'
import { OpaqueSecretProvider } from '@kubricate/plugin-kubernetes'
import { InMemoryConnector, SecretManager, SecretRegistry } from 'kubricate'

// Frontend team reads from a prefixed .env file
const frontendSecrets = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector({ prefix: 'FRONTEND_' }))
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({ name: 'frontend-secrets' }))
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')
  .addSecret({ name: 'API_BASE_URL' })

// Platform team keeps environment variables separate via another connector instance
const platformSecrets = new SecretManager()
  .addConnector('PlatformEnv', new EnvConnector({ prefix: 'PLATFORM_' }))
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({ name: 'platform-secrets' }))
  .setDefaultConnector('PlatformEnv')
  .setDefaultProvider('OpaqueSecretProvider')
  .addSecret({ name: 'CLUSTER_TOKEN' })

// Testing team relies on in-memory fixtures for fast iteration
const testSecrets = new SecretManager()
  .addConnector('InMemoryConnector', new InMemoryConnector({
    TEST_DATABASE_URL: 'postgresql://localhost:5432/test'
  }))
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({ name: 'test-secrets' }))
  .setDefaultConnector('InMemoryConnector')
  .setDefaultProvider('OpaqueSecretProvider')
  .addSecret({ name: 'TEST_DATABASE_URL' })

export const secretRegistry = new SecretRegistry()
  .add('frontend', frontendSecrets)
  .add('platform', platformSecrets)
  .add('testing', testSecrets)
```

## Common Issues & Solutions

### Duplicate Manager Names

**Problem:** Registry throws error about duplicate names.

```ts
// ❌ This will throw an error
const registry = new SecretRegistry()
  .add('app', frontendSecrets)
  .add('app', backendSecrets)  // Error: Duplicate name "app"
```

**Solution:** Use unique, descriptive names:

```ts
// ✅ Clear, unique names
const registry = new SecretRegistry()
  .add('frontend-app', frontendSecrets)
  .add('backend-app', backendSecrets)
```

### Manager Not Found

**Problem:** TypeScript or runtime error when accessing manager.

```ts
// ❌ Typo in manager name
const secrets = registry.get('fronend')  // Error: manager not found
```

**Solution:** Use consistent naming and let TypeScript catch typos:

```ts
// ✅ TypeScript will catch this error
const secrets = registry.get('frontend')
```

### Naming Conflicts

**Problem:** Multiple managers create resources with the same name.

**Solution:** Use team-specific provider names:

```ts
// @filename: fix-conflicts.ts
import { EnvConnector } from '@kubricate/plugin-env'
import { OpaqueSecretProvider } from '@kubricate/plugin-kubernetes'
import { SecretManager } from 'kubricate'

// ❌ Both use same provider name - will conflict
const manager1 = new SecretManager()
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({
    name: 'app-secrets'  // Conflict source
  }))

const manager2 = new SecretManager()
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({
    name: 'app-secrets'  // Same name - conflict!
  }))

// ✅ Use team-specific names
const frontendManager = new SecretManager()
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({
    name: 'frontend-secrets'  // Unique name
  }))

const backendManager = new SecretManager()
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({
    name: 'backend-secrets'   // Unique name
  }))
```

## Best Practices

### Keep Managers Focused

Don't create managers for every single secret:

```ts
// @filename: src/architectures.ts
import { EnvConnector } from '@kubricate/plugin-env'
import { OpaqueSecretProvider } from '@kubricate/plugin-kubernetes'
import { SecretManager } from 'kubricate'

// ❌ Too many responsibilities in one manager
const kitchenSinkManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({ name: 'app-secrets' }))
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')
  .addSecret({ name: 'DATABASE_URL' })
  .addSecret({ name: 'STRIPE_API_KEY' })
  .addSecret({ name: 'DOCKER_TOKEN' })
  .addSecret({ name: 'MONITORING_ENDPOINT' })
  .addSecret({ name: 'BACKUP_CREDENTIALS' })
  // ... 50 more secrets

// ✅ Split by team/domain with focused managers
const dataManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({ name: 'data-secrets' }))
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')
  .addSecret({ name: 'DATABASE_URL' })

const paymentsManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({ name: 'payments-secrets' }))
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')
  .addSecret({ name: 'STRIPE_API_KEY' })
```

### Use Clear Naming Conventions

Establish consistent patterns:
- **Manager names**: `'frontend'`, `'backend'`, `'platform'`
- **Provider names**: `'frontend-app-secrets'`, `'backend-api-secrets'`
- **Secret names**: Use team prefixes if needed: `'frontend_api_key'`

### Start Simple

Begin with a basic registry and evolve:
1. Start with two managers (frontend/backend)
2. Add more managers as teams/domains grow
3. Keep the registry structure flat and obvious

## Next Steps

Now that you understand SecretRegistry scaling patterns, you might want to explore:

- [Working with a Single SecretManager](./working-with-secret-manager) for understanding the fundamentals
- [Multi-Environment Deployments](./multi-environment-deployments) for environment-specific secret patterns
- [Config Overrides](./config-overrides) for customizing generated resources
- [Working with Secrets Tutorial](../tutorials/working-with-secrets) for hands-on secret management
