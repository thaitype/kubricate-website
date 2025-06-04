# Understand the Workflow

## Prerequisites

Before diving into Kubricate’s full workflow, make sure you’ve completed the [**Getting Started**](../getting-started) tutorial.

You should already be familiar with:

* How to create a basic `Stack` using `Stack.fromStatic`
* How to configure `kubricate.config.ts` to register your stacks
* How to generate YAML output using `kubricate generate`

If you're comfortable with those steps, you're ready to explore how everything connects — from reusable templates to secret orchestration, and beyond.

## Overview of Kubricate Workflow

Kubricate helps you define Kubernetes resources using plain TypeScript — instead of writing raw YAML by hand.

The overall workflow has **two main flows**:

```
+----------------------------+
| 1. Infrastructure Flow    |
+----------------------------+
| Write code (TypeScript) → |
| Register in config file → |
| Generate Kubernetes YAML  |
+----------------------------+

+----------------------------+
| 2. Secret Management Flow |
+----------------------------+
| Load secrets (e.g. .env) →|
| Inject into K8s manifests |
| Apply secrets to cluster  |
+----------------------------+
```

Each flow is built with modular building blocks. You’ll work with:

* **Resource definitions** → written in code
* **Configuration files** → for organizing what to generate
* **CLI tools** → for generating or applying output
* **(Optionally)** secret-related helpers like **Connectors**, **Providers**, and **Secret Managers**

Kubricate’s design allows you to:

* Keep your infrastructure logic version-controlled and type-safe
* Avoid copy-pasting YAML across environments
* Manage secrets more safely with a predictable injection system

## Key Concepts & Terminologies

Kubricate uses a few core ideas. You don’t need to memorize them — but having a sense of what they mean will help you navigate the tutorials more confidently.

### Resource (Kubernetes Manifest)

A plain JavaScript object that defines a Kubernetes entity like `Deployment`, `Service`, or `Namespace`.

```ts
{
  apiVersion: 'v1',
  kind: 'Namespace',
  metadata: { name: 'my-namespace' }
}
```

### Stack

A **collection of resources** grouped under one logical unit. You can think of it like a folder that bundles related manifests together.

You define a Stack like this:

```ts
export const myStack = Stack.fromStatic({ ... });
```

Or by using a template:

```ts
export const myStack = Stack.fromTemplate(template, params);
```

### Stack Template

A reusable function that **generates stacks dynamically** based on input. It’s like a parameterized factory for Kubernetes manifests.

```ts
const nsTemplate = defineStackTemplate('Namespace', ({ name }) => ({
  ns: kubeModel(Namespace, { metadata: { name } })
}));
```

### Kubricate CLI

A command-line tool to run actions like:

* `generate` — to generate YAML
* `secret apply` — to apply secrets to Kubernetes

You can run via `bun`, `npx`, or your preferred package manager.

### Secrets System

Kubricate includes a modular way to manage secrets:

* **Connectors** load secrets from `.env`, Vault, APIs, etc.
* **Providers** map those secrets into Kubernetes formats (e.g. `Opaque`, `DockerConfig`, `EnvFrom`)
* **SecretManager** coordinates all of this.

You’ll explore this in `Working with Secrets`.

## Where to Go Next

Now that you understand the big picture, you're ready to start building with Kubricate.

You’ll begin with a hands-on walkthrough using ready-made templates, then gradually learn how to create your own stacks and manage secrets.

Here’s the recommended path:

1. **Start from Template**
   Use an existing template to scaffold your first app stack.

2. **Generate & Apply**
   Learn how to generate YAML and apply it to your Kubernetes cluster.

3. **Build Your Template**
   Create your own reusable Stack Template with TypeScript.

4. **Working with Secrets**
   Explore how to securely load, map, and apply secrets using Kubricate’s secret system.

