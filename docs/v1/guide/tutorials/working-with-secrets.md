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
* what **secrets** are declared (their logical names), and
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

This example shows a minimal but real flow using a local `.env` connector and an **Opaque Secret** provider.

### 1) Configure the Secret Manager

```ts twoslash
// @filename: src/setup-secrets.ts
import { EnvConnector } from '@kubricate/plugin-env'
import { OpaqueSecretProvider } from '@kubricate/plugin-kubernetes'
import { SecretManager } from 'kubricate'

export const secretManager = new SecretManager()
  // 1) Sources of truth
  .addConnector('EnvConnector', new EnvConnector())

  // 2) Delivery methods
  .addProvider('OpaqueSecretProvider', 
    new OpaqueSecretProvider({ 
      name: 'app-secrets' 
    })
  )

  // 3) Defaults
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')

  // 4) Declare secrets (logical names)
  .addSecret({ name: 'DATABASE_URL' })
  .addSecret({ name: 'API_KEY' })
  .addSecret({ name: 'JWT_SECRET' })
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
   .addProvider('OpaqueSecretProvider', 
      new OpaqueSecretProvider({ 
        name: 'app-secrets' 
      })
    )
   ```

   * **Provider = how secrets are delivered.**
   * `OpaqueSecretProvider` will generate a standard Kubernetes `Secret` of type `Opaque` and inject values as environment variables into your containers.

4. Set Defaults

   ```ts
   .setDefaultConnector('EnvConnector')
   .setDefaultProvider('OpaqueSecretProvider')
   ```

   * If you don’t specify otherwise, all secrets will **come from `.env`** and be **rendered as an Opaque Secret**.
   * This avoids boilerplate when most secrets share the same setup.

5. Declare Secrets

   ```ts
   .addSecret({ name: 'DATABASE_URL' })
   .addSecret({ name: 'API_KEY' })
   .addSecret({ name: 'JWT_SECRET' })
   ```

   * Each `.addSecret` registers a logical secret name with the manager.
   * All secrets will use the default provider (`OpaqueSecretProvider`) to create environment variables.

**Why this matters**

* You separate **what secrets exist** from **how they’re implemented**.
* Later, your stacks can simply say: “I need `DATABASE_URL`” — without caring whether it’s coming from `.env`, Vault, or which Secret type it’s rendered as.
* Switching from `.env` to Vault or from Opaque to ExternalSecret doesn’t change your stack code — only this setup file.

Next, let’s see how to use these declared secrets inside a stack.

### 2) Use secrets inside a Stack

```ts twoslash
// @filename: src/setup-secrets.ts
import { EnvConnector } from '@kubricate/plugin-env'
import { OpaqueSecretProvider } from '@kubricate/plugin-kubernetes'
import { SecretManager } from 'kubricate'

export const secretManager = new SecretManager()
  // 1) Sources of truth
  .addConnector('EnvConnector', new EnvConnector())

  // 2) Delivery methods
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({ name: 'app-secrets' }))

  // 3) Defaults
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')

  // 4) Declare secrets (logical names)
  .addSecret({ name: 'DATABASE_URL' })
  .addSecret({ name: 'API_KEY' })
  .addSecret({ name: 'JWT_SECRET' })

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
    c.secrets('DATABASE_URL').inject()
    c.secrets('API_KEY').forName('APP_API_KEY').inject()
    c.secrets('JWT_SECRET').inject()
  })
  .override({
    service: { spec: { type: 'LoadBalancer' } },
  })

export default { namespace, myApp }
```

Let's break down each binding in your example:

```ts
c.secrets('DATABASE_URL').inject()
```

* Uses the **logical secret** `DATABASE_URL`.
* Uses the default name — the environment variable will be called **`DATABASE_URL`**.
* Calls `inject()` with no args → **provider default** applies (Opaque → environment variable).

```ts
c.secrets('API_KEY').forName('APP_API_KEY').inject()
```

* Uses the **logical secret** `API_KEY`.
* Renames the **in-container env var** to **`APP_API_KEY`** (instead of default `API_KEY`).
* This shows how you can customize the environment variable name.

```ts
c.secrets('JWT_SECRET').inject()
```

* Uses the **logical secret** `JWT_SECRET`.
* Uses the default name — the environment variable will be called **`JWT_SECRET`**.
* All secrets use the same provider (OpaqueSecretProvider) for consistent delivery.

#### Quick mental model

* **`forName()`** → “What should this be called at the destination?” (e.g. env var name)
* **`inject()`** → “How should it be delivered?”

  * No args → “Use the provider’s smart default.”
  * With args → “Override the target or path explicitly.”

That's it—your example uses sensible defaults for environment variable injection, keeping the tutorial simple while still showing renaming via `forName(...)`.

Now, let’s see how to register the manager in your config.

### 3) Register the manager in config

```ts twoslash
// @filename: src/setup-secrets.ts
import { EnvConnector } from '@kubricate/plugin-env'
import { OpaqueSecretProvider } from '@kubricate/plugin-kubernetes'
import { SecretManager } from 'kubricate'

export const secretManager = new SecretManager()
  // 1) Sources of truth
  .addConnector('EnvConnector', new EnvConnector())

  // 2) Delivery methods
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({ name: 'app-secrets' }))

  // 3) Defaults
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')

  // 4) Declare secrets (logical names)
  .addSecret({ name: 'DATABASE_URL' })
  .addSecret({ name: 'API_KEY' })
  .addSecret({ name: 'JWT_SECRET' })
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
    c.secrets('DATABASE_URL').inject()
    c.secrets('API_KEY').forName('APP_API_KEY').inject()
    c.secrets('JWT_SECRET').inject()
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

### 4) Setup .env and apply the secrets

Create a `.env` file in the project root, the `EnvConnector` will read the prefixed key with `KUBRICATE_SECRET_`, and the rest is match with the logical secret names:

```bash
# .env
KUBRICATE_SECRET_DATABASE_URL=postgres://user:password@localhost:5432/mydb
KUBRICATE_SECRET_API_KEY=supersecretapikey
KUBRICATE_SECRET_JWT_SECRET=verysecretjwt
```

Kubricate has cli to set secrets directly to target providers, in the examples, we use `OpaqueSecretProvider` to create a kubernetes secret, so we can use `kubricate secret appply` command to set the secrets:

```bash
bun kubricate secret apply
```

This will create a kubernetes secret named `app-secrets` with the keys and values from the `.env` file, for the Opaque secret, it's automatically encoded in base64 format.

### 5) Generate

```bash
bun kubricate generate
```

You’ll get manifests for:

* a `Namespace`,
* an app stack (`Deployment`/`Service`) referencing secrets,
* one or more `Secret` resources produced by the configured providers.

## Swapping Environments (no rewrites)

The idea here is to **separate your stack logic from your environment configuration**.
Your application stacks only declare *what secrets they need* by name. They never care about *where those secrets come from* or *how they’re delivered*.

In practice, this means:

* **Development**: You can keep things simple and local. Use an `EnvConnector` to read values from a `.env` file, and an `OpaqueSecretProvider` to render them as plain Kubernetes `Secret` objects. This is lightweight and perfect for testing locally.

* **Staging / Production**: Without touching the stack templates, you can change the configuration so that secrets are loaded from a secure external store like Vault or 1Password. Then, instead of creating Opaque Secrets directly, you can deliver them through a different provider such as an `ExternalSecret` (ESO). This shifts responsibility to a controller that syncs with your secret backend.

Because stacks reference only the **logical secret names**, you don’t need to rewrite or duplicate them per environment. The **SecretManager setup** is the only piece that changes. This makes environment promotion safer, reduces copy-paste YAML, and ensures the same application logic is used consistently everywhere.

## What's Next

* Read the [How-to Guides](../how-to-guides/) for more practical recipes
* Learn about [Config Overrides](../how-to-guides/config-overrides) to customize your stacks
* Explore [targeting specific containers](../how-to-guides/target-specific-containers) for advanced secret injection