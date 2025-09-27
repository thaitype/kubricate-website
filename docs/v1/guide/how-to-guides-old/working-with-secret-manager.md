---
outline: deep
---

# Working with a Single SecretManager

The **SecretManager** is Kubricate's central orchestrator for secret handling — designed as a single, project-wide instance that coordinates where secrets come from, how they're delivered, and how they're injected into your stacks.

Unlike scattered secret configurations across multiple files, a single SecretManager gives you one place to define your secret strategy, set sensible defaults, and maintain consistency across all your stacks.

> Think of the SecretManager as your project's "secret control center" — one configuration, infinite reuse.

## Why a Single Orchestrator Per Project

Most secret management approaches suffer from the same problems as scattered YAML configurations: duplication, inconsistency, and hard-to-track dependencies. You end up with secret logic spread across templates, environment files, and deployment scripts.

**Common problems without centralized secret management:**
- Same connectors configured multiple times across different stacks
- Inconsistent secret naming and injection patterns
- No clear place to see what secrets your project actually uses
- Difficult to swap secret backends between environments
- Hard to debug secret injection issues

**Kubricate's SecretManager solves this by:**
- **Centralizing configuration** — all connectors, providers, and defaults in one place
- **Enforcing consistency** — same secret strategy across all stacks
- **Enabling reusability** — declare once, inject anywhere
- **Simplifying debugging** — single source of truth for secret behavior
- **Making swapping easy** — change environment configuration without touching stack code

## Setting Up Your SecretManager

### Basic Configuration Structure

A SecretManager follows a clear setup pattern: register connectors and providers, set defaults, then declare your logical secrets.

```ts twoslash
// @filename: src/setup-secrets.ts
import { EnvConnector } from '@kubricate/plugin-env'
import { DockerConfigSecretProvider, OpaqueSecretProvider } from '@kubricate/plugin-kubernetes'
import { SecretManager } from 'kubricate'

export const secretManager = new SecretManager()
  // 1) Register connectors (where secrets come from)
  .addConnector('EnvConnector', new EnvConnector())

  // 2) Register providers (how secrets are delivered)
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({
    name: 'app-secrets'
  }))
  .addProvider('DockerConfigSecretProvider', new DockerConfigSecretProvider({
    name: 'registry-secrets'
  }))

  // 3) Set defaults (avoid repetition)
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')

  // 4) Declare logical secrets
  .addSecret({ name: 'DATABASE_URL' })
  .addSecret({ name: 'API_KEY' })
  .addSecret({
    name: 'DOCKER_REGISTRY_TOKEN',
    provider: 'DockerConfigSecretProvider',
  })
```

This creates a complete secret ecosystem for your project: secrets are loaded from `.env` files and delivered as Kubernetes Secrets, with one special secret that uses Docker registry authentication.

> `EnvConnector` looks for environment variables prefixed with `KUBRICATE_SECRET_`. `DockerConfigSecretProvider` expects a structured secret value `{ username, password, registry }`, which is validated by `dockerRegistrySecretSchema` inside `packages/plugin-kubernetes/src/DockerConfigSecretProvider.ts`.

### Registering Connectors & Providers

**Connectors** define where secret values come from. **Providers** define how those values are delivered to Kubernetes.

```ts twoslash
// @filename: src/setup-secrets.ts
import { EnvConnector } from '@kubricate/plugin-env'
import { DockerConfigSecretProvider, OpaqueSecretProvider } from '@kubricate/plugin-kubernetes'
import { InMemoryConnector, SecretManager } from 'kubricate'

export const secretManager = new SecretManager()
  // Multiple connectors for different environments or test runs
  .addConnector('EnvConnector', new EnvConnector())
  .addConnector('InMemoryConnector', new InMemoryConnector({
    SERVICE_TOKEN: 'ci-token'
  }))

  // Multiple providers for different delivery targets
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({
    name: 'app-secrets'
  }))
  .addProvider('DockerConfigSecretProvider', new DockerConfigSecretProvider({
    name: 'registry-secrets'
  }))

  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')
```

Each connector and provider gets a **unique name** that you reference when declaring secrets or setting defaults. `EnvConnector` resolves values from environment variables prefixed with `KUBRICATE_SECRET_`, while `InMemoryConnector` is bundled inside Kubricate for specs and tests—you can switch defaults conditionally (for example in CI) before stacks run.

### Setting Defaults

Defaults eliminate boilerplate and ensure consistency. Without defaults, every secret declaration would need explicit connector and provider configuration.

```ts twoslash
// @filename: src/setup-secrets.ts
import { EnvConnector } from '@kubricate/plugin-env'
import { OpaqueSecretProvider } from '@kubricate/plugin-kubernetes'
import { SecretManager } from 'kubricate'

export const secretManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({ name: 'app-secrets' }))

  // Set defaults that apply to all secrets unless overridden
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')

  // These secrets will automatically use the defaults
  .addSecret({ name: 'DATABASE_URL' })    // uses EnvConnector + OpaqueSecretProvider
  .addSecret({ name: 'API_KEY' })         // uses EnvConnector + OpaqueSecretProvider
  .addSecret({ name: 'CACHE_URL' })       // uses EnvConnector + OpaqueSecretProvider
```

**Without defaults, you'd write:**
```ts
.addSecret({
  name: 'DATABASE_URL',
  connector: 'EnvConnector',
  provider: 'OpaqueSecretProvider'
})
```

**With defaults, you write:**
```ts
.addSecret({ name: 'DATABASE_URL' })
```

Much cleaner and less error-prone.

### Declaring Logical Secrets

Logical secrets are **names** that your stacks will reference, independent of their implementation. This separation allows you to change how secrets are loaded and delivered without modifying stack code.

```ts twoslash
// @filename: src/setup-secrets.ts
import { EnvConnector } from '@kubricate/plugin-env'
import { DockerConfigSecretProvider, OpaqueSecretProvider } from '@kubricate/plugin-kubernetes'
import { SecretManager } from 'kubricate'

export const secretManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({ name: 'app-secrets' }))
  .addProvider('DockerConfigSecretProvider', new DockerConfigSecretProvider({ name: 'registry-secrets' }))
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')

  // Application secrets (use defaults)
  .addSecret({ name: 'DATABASE_URL' })
  .addSecret({ name: 'API_KEY' })
  .addSecret({ name: 'REDIS_URL' })

  // Infrastructure secrets (override provider)
  .addSecret({ name: 'DOCKER_REGISTRY_TOKEN', provider: 'DockerConfigSecretProvider' })
  .addSecret({ name: 'BACKUP_STORAGE_KEY', provider: 'DockerConfigSecretProvider' })
```

Your stacks will reference these by name: `'DATABASE_URL'`, `'API_KEY'`, etc. The SecretManager handles all the implementation details.

## Basic Usage with .useSecrets()

Once your SecretManager is configured, stacks use the `.useSecrets()` method to declare which secrets they need and how to inject them.

### Simple Secret Injection

The most common pattern: environment variables in containers.

```ts twoslash
// @filename: src/setup-secrets.ts
import { EnvConnector } from '@kubricate/plugin-env'
import { OpaqueSecretProvider } from '@kubricate/plugin-kubernetes'
import { SecretManager } from 'kubricate'

export const secretManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({ name: 'app-secrets' }))
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')
  .addSecret({ name: 'DATABASE_URL' })
  .addSecret({ name: 'API_KEY' })

// ---cut---
// @filename: src/stacks.ts
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

This creates environment variables in the container with the same names as the logical secrets: `DATABASE_URL` and `API_KEY`.

### Multiple Secrets with Different Providers

Some secrets need different delivery methods:

```ts twoslash
// @filename: src/setup-secrets.ts
import { EnvConnector } from '@kubricate/plugin-env'
import { DockerConfigSecretProvider, OpaqueSecretProvider } from '@kubricate/plugin-kubernetes'
import { SecretManager } from 'kubricate'

export const secretManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({ name: 'app-secrets' }))
  .addProvider('DockerConfigSecretProvider', new DockerConfigSecretProvider({ name: 'registry-secrets' }))
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')
  .addSecret({ name: 'DATABASE_URL' })
  .addSecret({ name: 'API_KEY' })
  .addSecret({ name: 'DOCKER_REGISTRY_TOKEN', provider: 'DockerConfigSecretProvider' })

// ---cut---
// @filename: src/stacks.ts
import { simpleAppTemplate } from '@kubricate/stacks'
import { Stack } from 'kubricate'
import { secretManager } from './setup-secrets'

const apiService = Stack.fromTemplate(simpleAppTemplate, {
  name: 'api-service',
  imageName: 'private-registry/api'
})
.useSecrets(secretManager, c => {
  // Application secrets → environment variables
  c.secrets('DATABASE_URL').inject()
  c.secrets('API_KEY').inject()

  // Registry secret → imagePullSecrets
  c.secrets('DOCKER_REGISTRY_TOKEN').inject()
})
```

The `DOCKER_REGISTRY_TOKEN` automatically becomes an `imagePullSecret` because it uses `DockerConfigSecretProvider`, while the other secrets become environment variables. Make sure the connector returns an object with `{ username, password, registry }` for that secret so the provider can build the required Docker config file.

## Advanced Injection Patterns

### Using .forName() for Stable Environment Names

Sometimes your logical secret name doesn't match what you want in the container. Use `.forName()` to set the target environment variable name:

```ts twoslash
// @filename: src/setup-secrets.ts
import { EnvConnector } from '@kubricate/plugin-env'
import { OpaqueSecretProvider } from '@kubricate/plugin-kubernetes'
import { SecretManager } from 'kubricate'

export const secretManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({ name: 'app-secrets' }))
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')
  .addSecret({ name: 'pg_connection_string' })  // lowercase with underscores
  .addSecret({ name: 'stripe_api_key' })

// ---cut---
// @filename: src/stacks.ts
import { simpleAppTemplate } from '@kubricate/stacks'
import { Stack } from 'kubricate'
import { secretManager } from './setup-secrets'

const apiService = Stack.fromTemplate(simpleAppTemplate, {
  name: 'api-service',
  imageName: 'api'
})
.useSecrets(secretManager, c => {
  // Logical name → Environment variable name
  c.secrets('pg_connection_string').forName('DATABASE_URL').inject()
  c.secrets('stripe_api_key').forName('STRIPE_SECRET_KEY').inject()
})
```

**Result in the container:**
- Environment variable `DATABASE_URL` gets the value from `pg_connection_string`
- Environment variable `STRIPE_SECRET_KEY` gets the value from `stripe_api_key`

This is useful when:
- Your secret storage uses different naming conventions
- Multiple stacks need the same secret with different names
- You want to maintain consistent environment variable names across applications

### Container Index Targeting

For multi-container pods, you can target specific containers using the `containerIndex` option:

```ts twoslash
// @filename: src/setup-secrets.ts
import { EnvConnector } from '@kubricate/plugin-env'
import { OpaqueSecretProvider } from '@kubricate/plugin-kubernetes'
import { SecretManager } from 'kubricate'

export const secretManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({ name: 'app-secrets' }))
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')
  .addSecret({ name: 'APP_SECRET' })
  .addSecret({ name: 'SIDECAR_TOKEN' })

// ---cut---
// @filename: src/stacks.ts
import { simpleAppTemplate } from '@kubricate/stacks'
import { Stack } from 'kubricate'
import { secretManager } from './setup-secrets'

const multiContainerApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'multi-container-app',
  imageName: 'app'
})
.useSecrets(secretManager, c => {
  // Main container (index 0) gets the app secret
  c.secrets('APP_SECRET').inject('env', { containerIndex: 0 })

  // Sidecar container (index 1) gets its own token
  c.secrets('SIDECAR_TOKEN').inject('env', { containerIndex: 1 })
})
```

**Container targeting allows you to:**
- Isolate secrets to specific containers for security
- Give different containers different configuration
- Support complex multi-container architectures
- Maintain clean separation of concerns

### Override Injection Path

For complete control over where secrets are injected, use the `targetPath` option:

```ts twoslash
// @filename: src/setup-secrets.ts
import { EnvConnector } from '@kubricate/plugin-env'
import { OpaqueSecretProvider } from '@kubricate/plugin-kubernetes'
import { SecretManager } from 'kubricate'

export const secretManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({ name: 'app-secrets' }))
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')
  .addSecret({ name: 'CRON_SECRET' })

// ---cut---
// @filename: src/stacks.ts
import { cronJobTemplate } from './stack-templates/cronJobTemplate'
import { Stack } from 'kubricate'
import { secretManager } from './setup-secrets'

const cronJob = Stack.fromTemplate(cronJobTemplate, {
  name: 'backup-job'
})
.useSecrets(secretManager, c => {
  c.secrets('CRON_SECRET')
    .forName('BACKUP_TOKEN')
    .inject('env', {
      targetPath: 'spec.jobTemplate.spec.template.spec.containers[0].env'
    })
    .intoResource('cronJob')
})
```

**Custom targeting is useful for:**
- Non-standard Kubernetes resources (CronJobs, DaemonSets, etc.)
- Complex resource structures that providers don't handle automatically
- Special injection requirements (init containers, volume mounts, etc.)
- Advanced use cases where automatic path resolution isn't sufficient

## Resource Targeting

The SecretManager automatically resolves which resource to inject secrets into, but you can override this behavior when needed.

### Automatic Resource Resolution

By default, the SecretManager uses the provider's `targetKind` to find the appropriate resource:

```ts twoslash
// @filename: src/setup-secrets.ts
import { EnvConnector } from '@kubricate/plugin-env'
import { OpaqueSecretProvider } from '@kubricate/plugin-kubernetes'
import { SecretManager } from 'kubricate'

export const secretManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({ name: 'app-secrets' }))
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')
  .addSecret({ name: 'DATABASE_URL' })

// ---cut---
// @filename: src/stacks.ts
import { simpleAppTemplate } from '@kubricate/stacks'
import { Stack } from 'kubricate'
import { secretManager } from './setup-secrets'

const apiService = Stack.fromTemplate(simpleAppTemplate, {
  name: 'api-service',
  imageName: 'api'
})
.useSecrets(secretManager, c => {
  // Automatically finds the Deployment resource
  c.secrets('DATABASE_URL').inject()
})
```

The `OpaqueSecretProvider` targets `Deployment` resources, so it automatically finds and injects into the deployment created by `simpleAppTemplate`.

### Explicit Resource Targeting with .intoResource()

When you have multiple resources of the same kind, or need precise control, use `.intoResource()`:

```ts twoslash
// @filename: src/setup-secrets.ts
import { EnvConnector } from '@kubricate/plugin-env'
import { OpaqueSecretProvider } from '@kubricate/plugin-kubernetes'
import { SecretManager } from 'kubricate'

export const secretManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({ name: 'app-secrets' }))
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')
  .addSecret({ name: 'WEB_SECRET' })
  .addSecret({ name: 'WORKER_SECRET' })

// ---cut---
// @filename: src/stacks.ts
import { Stack } from 'kubricate'
import { secretManager } from './setup-secrets'

const multiServiceStack = Stack.fromStatic('MultiService', {
  webDeployment: {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: { name: 'web' },
    spec: { /* deployment spec */ }
  },
  workerDeployment: {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: { name: 'worker' },
    spec: { /* deployment spec */ }
  }
})
.useSecrets(secretManager, c => {
  // Target specific deployments explicitly
  c.secrets('WEB_SECRET').inject().intoResource('webDeployment')
  c.secrets('WORKER_SECRET').inject().intoResource('workerDeployment')
})
```

### Setting Default Resource ID

For complex stacks where most secrets target the same resource, set a default:

```ts twoslash
// @filename: src/setup-secrets.ts
import { EnvConnector } from '@kubricate/plugin-env'
import { OpaqueSecretProvider } from '@kubricate/plugin-kubernetes'
import { SecretManager } from 'kubricate'

export const secretManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({ name: 'app-secrets' }))
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')
  .addSecret({ name: 'APP_SECRET' })
  .addSecret({ name: 'DB_SECRET' })
  .addSecret({ name: 'CACHE_SECRET' })
  .addSecret({ name: 'SIDECAR_SECRET' })

// ---cut---
// @filename: src/stacks.ts
import { Stack } from 'kubricate'
import { secretManager } from './setup-secrets'

const complexStack = Stack.fromStatic('Complex', {
  mainDeployment: { /* main app deployment */ },
  sidecarDeployment: { /* sidecar deployment */ }
})
.useSecrets(secretManager, c => {
  // Most secrets go to the main deployment
  c.setDefaultResourceId('mainDeployment')

  c.secrets('APP_SECRET').inject()      // → mainDeployment
  c.secrets('DB_SECRET').inject()       // → mainDeployment
  c.secrets('CACHE_SECRET').inject()    // → mainDeployment

  // Override for specific resource
  c.secrets('SIDECAR_SECRET').inject().intoResource('sidecarDeployment')
})
```

## Troubleshooting Common Issues

### Error: "No injection strategy defined"

**Symptom:** `Error: No injection strategy defined for secret: MY_SECRET`

**Cause:** You called `.useSecrets()` but didn't call `.inject()` on a secret.

```ts
// ❌ Wrong: missing .inject()
c.secrets('MY_SECRET').forName('API_KEY')

// ✅ Correct: always call .inject()
c.secrets('MY_SECRET').forName('API_KEY').inject()
```

### Error: "Multiple strategies supported, kind required"

**Symptom:** `inject() requires a strategy because provider supports multiple strategies`

**Cause:** Your provider supports multiple injection methods, but you didn't specify which one.

```ts
// ❌ Wrong: ambiguous for multi-strategy providers
c.secrets('MY_SECRET').inject()

// ✅ Correct: specify the strategy
c.secrets('MY_SECRET').inject('env', { containerIndex: 0 })
```

### Error: "No resource composer found"

**Symptom:** `No resource composer found in stack`

**Cause:** You're calling `.useSecrets()` before calling `.from()` on your stack.

```ts
// ❌ Wrong: calling useSecrets before the stack has been populated
const stack = new Stack(builder)
stack.useSecrets(secretManager, c => { /* ... */ })
stack.from({ name: 'my-app', imageName: 'nginx' })

// ✅ Correct: call from(...) first (or prefer Stack.fromTemplate which does this for you)
const hydrated = new Stack(builder)
hydrated.from({ name: 'my-app', imageName: 'nginx' })
hydrated.useSecrets(secretManager, c => { /* ... */ })
```

In practice you almost always call `Stack.fromTemplate(...)`, which hydrates the stack immediately; the manual pattern above mainly appears in unit tests or experimental prototypes.

### Error: "Resource ID not found"

**Symptom:** `Resource with ID 'deployment' not found`

**Cause:** You're targeting a resource that doesn't exist in your stack.

```ts
// Check what resources your stack actually creates
console.log(Object.keys(stack.build()))

// Then target the correct resource ID
c.secrets('MY_SECRET').inject().intoResource('actualResourceId')
```

### Debugging Secret Injection

Use the stack's build output to verify secret injection:

```ts twoslash
// @filename: src/debug.ts
import { simpleAppTemplate } from '@kubricate/stacks'
import { Stack } from 'kubricate'

const stack = Stack.fromTemplate(simpleAppTemplate, {
  name: 'debug-app',
  imageName: 'nginx'
})

// See what resources are created
console.log('Available resources:', Object.keys(stack.build()))

// See what secret injections are registered
console.log('Secret injections:', stack.getTargetInjects())

// See the final generated resources
console.log('Generated resources:', JSON.stringify(stack.build(), null, 2))
```

### Environment-Specific Configuration Issues

**Problem:** Secrets work in development but fail in production.

**Solution:** Check that your environment-specific connectors are properly configured:

```ts twoslash
// @filename: src/setup-secrets.ts
import { EnvConnector } from '@kubricate/plugin-env'
import { SecretManager } from 'kubricate'

const isDevelopment = process.env.NODE_ENV === 'development'

export const secretManager = new SecretManager()
  .addConnector('DevConnector', new EnvConnector())
  .addConnector('ProdConnector', new EnvConnector({ allowDotEnv: false }))
  // Add production connectors conditionally
  .setDefaultConnector(isDevelopment ? 'DevConnector' : 'ProdConnector')
  .addSecret({ name: 'DATABASE_URL' })
```

Make sure all referenced connectors and providers are actually registered in every environment.

## Best Practices

### Organize Secrets by Category

Group related secrets and use consistent naming:

```ts twoslash
// @filename: src/setup-secrets.ts
import { EnvConnector } from '@kubricate/plugin-env'
import { DockerConfigSecretProvider, OpaqueSecretProvider } from '@kubricate/plugin-kubernetes'
import { SecretManager } from 'kubricate'

export const secretManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({ name: 'app-secrets' }))
  .addProvider('DockerConfigSecretProvider', new DockerConfigSecretProvider({ name: 'registry-secrets' }))
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')

  // Database secrets
  .addSecret({ name: 'DATABASE_URL' })
  .addSecret({ name: 'DATABASE_PASSWORD' })

  // API secrets
  .addSecret({ name: 'STRIPE_SECRET_KEY' })
  .addSecret({ name: 'SENDGRID_API_KEY' })

  // Infrastructure secrets
  .addSecret({ name: 'DOCKER_REGISTRY_TOKEN', provider: 'DockerConfigSecretProvider' })
  .addSecret({ name: 'BACKUP_STORAGE_KEY', provider: 'DockerConfigSecretProvider' })
```

### Use Environment Variables for Provider Configuration

Make your SecretManager configuration environment-aware:

```ts twoslash
// @filename: src/setup-secrets.ts
import { EnvConnector } from '@kubricate/plugin-env'
import { OpaqueSecretProvider } from '@kubricate/plugin-kubernetes'
import { SecretManager } from 'kubricate'

const secretNamespace = process.env.SECRET_NAMESPACE || 'default'
const secretName = process.env.SECRET_NAME || 'app-secrets'

export const secretManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({
    name: secretName,
    namespace: secretNamespace
  }))
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')
  // ... secrets
```

### Keep Secret Declarations DRY

For projects with many similar secrets, consider helper functions that build configurations step by step:

```ts twoslash
// @filename: src/setup-secrets.ts
import { EnvConnector } from '@kubricate/plugin-env'
import { OpaqueSecretProvider } from '@kubricate/plugin-kubernetes'
import { SecretManager } from 'kubricate'

function addDatabaseSecrets(manager: SecretManager) {
  return manager
    .addSecret({ name: 'DATABASE_URL' })
    .addSecret({ name: 'DATABASE_PASSWORD' })
    .addSecret({ name: 'DATABASE_POOL_SIZE' })
}

function addApiSecrets(manager: SecretManager) {
  return manager
    .addSecret({ name: 'STRIPE_SECRET_KEY' })
    .addSecret({ name: 'SENDGRID_API_KEY' })
    .addSecret({ name: 'JWT_SECRET' })
}

// Build the SecretManager using functional composition
let secretManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({ name: 'app-secrets' }))
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')

// Apply helper functions to add groups of secrets
secretManager = addDatabaseSecrets(secretManager)
secretManager = addApiSecrets(secretManager)

export { secretManager }
```

## Next Steps

Now that you understand how to work with a single SecretManager, you might want to explore:

- [Working with Secrets Tutorial](../tutorials/working-with-secrets) for the fundamentals
- [Config Overrides](./config-overrides) for combining secret injection with resource customization
- [Stack Output Modes](./stack-output-mode) for understanding how secrets are rendered in different output formats
- The API reference for advanced SecretManager methods and provider-specific features
