---
outline: deep
---

# Working with Secrets

Kubricate treats secrets as **first-class citizens** — and manages them via an explicit **Secret Manager** that wires together sources (Connectors) and delivery methods (Providers). You declare the secrets your stacks need, choose where those values come from, and decide how they are delivered to Kubernetes — all at **build time**, before deploy.

> Design once. Swap backends per environment. Validate before rollout.

## What You’ll Learn

* The three players: **SecretManager**, **Connectors**, **Providers**
* How to register secrets and defaults in a central setup file
* How to inject secrets into stacks with `.useSecrets(...)`
* How to target different injection styles (`env`, `envFrom`, file mounts, or provider-specific outputs)
* Swapping providers per environment without rewriting templates

## Concepts

### SecretManager — A local orchestrator

The **SecretManager** is defined per project or per config file. It orchestrates:

* which **Connectors** are available (where values come from),
* which **Providers** are available (how values are delivered),
* what **secrets** are declared (their logical names),
* which **defaults** to use (e.g. default Connector/Provider), and
* a fluent API that stacks can call via `.useSecrets(...)` to bind secrets.

> Note: multiple SecretManagers can exist inside a broader **SecretRegistry**, which aggregates them across modules or repos. Don’t confuse the two — the manager is a unit of orchestration, while the registry collects managers.

### Connectors — Where secrets come from

A **Connector** loads values from a source of truth — e.g. `.env`, 1Password, Vault, Azure Key Vault, or a custom source. Connectors are about **retrieval**, not rendering.

### Providers — How secrets are delivered

A **Provider** decides **how** the secret is materialized/consumed. Examples:

* Emit a Kubernetes `Secret` (type `Opaque`, `kubernetes.io/dockerconfigjson`, etc.) and reference it from workload specs (`envFrom`, `env`, volume mounts).
* Emit **provider-specific resources** (e.g. `ExternalSecret` for ESO) or bridge to external systems.

> Because Connectors and Providers are decoupled, you can switch **per environment** (e.g. `.env` in dev, Vault in prod) without touching stack templates.

## Full Example — With Secret Manager

This example shows a minimal but real flow using a local `.env` connector and two Kubernetes providers: an **Opaque Secret** and a **Docker config** Secret.

### 1) Configure the Secret Manager

```ts twoslash
// @filename: src/setup-secrets.ts
import { EnvConnector } from '@kubricate/plugin-env'
import { DockerConfigSecretProvider, OpaqueSecretProvider } from '@kubricate/plugin-kubernetes'
import { SecretManager } from 'kubricate'

export const secretManager = new SecretManager()
  // 1) Sources of truth
  .addConnector('EnvConnector', new EnvConnector())

  // 2) Delivery methods
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({ name: 'secret-application' }))
  .addProvider('DockerConfigSecretProvider', new DockerConfigSecretProvider({ name: 'secret-application-provider' }))

  // 3) Defaults
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')

  // 4) Declare secrets (logical names)
  .addSecret({ name: 'my_app_key' })
  .addSecret({ name: 'my_app_key_2' })
  .addSecret({ name: 'DOCKER_SECRET', provider: 'DockerConfigSecretProvider' })
```

**Explanation: Configuring the Secret Manager**

1. Create a new SecretManager

   ```ts
   export const secretManager = new SecretManager()
   ```

   This initializes a local orchestrator that will control how secrets are **loaded** and **delivered** for your stacks.

2. Add a Connector

   ```ts
   .addConnector('EnvConnector', new EnvConnector())
   ```

   * **Connector = where secrets come from.**
     Here we use `EnvConnector` so values are read from your local `.env` file.
     Example: `DB_PASSWORD=super-secret` inside `.env`.

3. Add Providers

   ```ts
   .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({ name: 'secret-application' }))
   .addProvider('DockerConfigSecretProvider', new DockerConfigSecretProvider({ name: 'secret-application-provider' }))
   ```

   * **Provider = how secrets are delivered.**
   * `OpaqueSecretProvider` will generate a standard Kubernetes `Secret` of type `Opaque`.
   * `DockerConfigSecretProvider` will generate a `Secret` of type `kubernetes.io/dockerconfigjson`, used for authenticating to Docker registries.

4. Set Defaults

   ```ts
   .setDefaultConnector('EnvConnector')
   .setDefaultProvider('OpaqueSecretProvider')
   ```

   * If you don’t specify otherwise, all secrets will **come from `.env`** and be **rendered as an Opaque Secret**.
   * This avoids boilerplate when most secrets share the same setup.

5. Declare Secrets

   ```ts
   .addSecret({ name: 'my_app_key' })
   .addSecret({ name: 'my_app_key_2' })
   .addSecret({ name: 'DOCKER_SECRET', provider: 'DockerConfigSecretProvider' })
   ```

   * Each `.addSecret` registers a logical secret name with the manager.
   * `my_app_key` and `my_app_key_2` will use the default provider (Opaque).
   * `DOCKER_SECRET` overrides the default and explicitly uses the Docker config provider.

**Why this matters**

* You separate **what secrets exist** from **how they’re implemented**.
* Later, your stacks can simply say: “I need `my_app_key`” — without caring whether it’s coming from `.env`, Vault, or which Secret type it’s rendered as.
* Switching from `.env` to Vault or from Opaque to ExternalSecret doesn’t change your stack code — only this setup file.

### 2) Use secrets inside a Stack

```ts twoslash
// @filename: src/setup-secrets.ts
import { EnvConnector } from '@kubricate/plugin-env'
import { DockerConfigSecretProvider, OpaqueSecretProvider } from '@kubricate/plugin-kubernetes'
import { SecretManager } from 'kubricate'

export const secretManager = new SecretManager()
  // 1) Sources of truth
  .addConnector('EnvConnector', new EnvConnector())

  // 2) Delivery methods
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({ name: 'secret-application' }))
  .addProvider('DockerConfigSecretProvider', new DockerConfigSecretProvider({ name: 'secret-application-provider' }))

  // 3) Defaults
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')

  // 4) Declare secrets (logical names)
  .addSecret({ name: 'my_app_key' })
  .addSecret({ name: 'my_app_key_2' })
  .addSecret({ name: 'DOCKER_SECRET', provider: 'DockerConfigSecretProvider' })

// ---cut---
// @filename: src/stacks.ts
import { namespaceTemplate, simpleAppTemplate } from '@kubricate/stacks'
import { Stack } from 'kubricate'
import { secretManager } from './setup-secrets'

const namespace = Stack.fromTemplate(namespaceTemplate, { name: 'my-namespace' })

const myApp = Stack.fromTemplate(simpleAppTemplate, {
  namespace: 'my-namespace',
  imageName: 'nginx',
  name: 'my-app',
})
  .useSecrets(secretManager, c => {
    c.secrets('my_app_key').forName('ENV_APP_KEY').inject()
    c.secrets('my_app_key_2').forName('ENV_APP_KEY_2').inject()
    c.secrets('DOCKER_SECRET').inject()
  })
  .override({
    service: { apiVersion: 'v1', kind: 'Service', spec: { type: 'LoadBalancer' } },
  })

export default { namespace, myApp }
```

### 3) Register the manager in config

```ts twoslash
// @filename: src/setup-secrets.ts
import { EnvConnector } from '@kubricate/plugin-env'
import { DockerConfigSecretProvider, OpaqueSecretProvider } from '@kubricate/plugin-kubernetes'
import { SecretManager } from 'kubricate'

export const secretManager = new SecretManager()
  // 1) Sources of truth
  .addConnector('EnvConnector', new EnvConnector())

  // 2) Delivery methods
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({ name: 'secret-application' }))
  .addProvider('DockerConfigSecretProvider', new DockerConfigSecretProvider({ name: 'secret-application-provider' }))

  // 3) Defaults
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')

  // 4) Declare secrets (logical names)
  .addSecret({ name: 'my_app_key' })
  .addSecret({ name: 'my_app_key_2' })
  .addSecret({ name: 'DOCKER_SECRET', provider: 'DockerConfigSecretProvider' })
//---cut---
// @filename: src/stacks.ts
import { namespaceTemplate, simpleAppTemplate } from '@kubricate/stacks'
import { Stack } from 'kubricate'
import { secretManager } from './setup-secrets'

const namespace = Stack.fromTemplate(namespaceTemplate, { name: 'my-namespace' })

const myApp = Stack.fromTemplate(simpleAppTemplate, {
  namespace: 'my-namespace',
  imageName: 'nginx',
  name: 'my-app',
})
  .useSecrets(secretManager, c => {
    c.secrets('my_app_key').forName('ENV_APP_KEY').inject()
    c.secrets('my_app_key_2').forName('ENV_APP_KEY_2').inject()
    c.secrets('DOCKER_SECRET').inject()
  })
  .override({
    service: { apiVersion: 'v1', kind: 'Service', spec: { type: 'LoadBalancer' } },
  })

export default { namespace, myApp }
//---cut---
// @filename: kubricate.config.ts
import { defineConfig } from 'kubricate'
import { secretManager } from './src/setup-secrets'
import simpleAppStack from './src/stacks'

export default defineConfig({
  stacks: { ...simpleAppStack },
  secret: {
    secretSpec: secretManager,
    conflict: {
      strategies: {
        // intraProvider: 'error',
        // crossProvider: 'error',
        // crossManager: 'error',
      },
    },
  },
})
```

> **Conflict strategies** control how to handle duplicate keys across scopes (within one provider, across providers, or across managers). Default behavior is strict (fail early) unless you override.

### 4) Generate

```bash
bun kubricate generate
```

You’ll get manifests for:

* a `Namespace`,
* an app stack (`Deployment`/`Service`) referencing secrets,
* one or more `Secret` resources produced by the configured providers.

## Swapping Environments (no rewrites)

Keep templates immutable. Change **configuration**, not code:

* In **dev**, use `EnvConnector` with `OpaqueSecretProvider`.
* In **staging/prod**, switch Connector to Vault/1Password or swap Provider to `ExternalSecret` — without touching stack templates.

## What’s Next

* Read the [How-to Guides] for see more repices