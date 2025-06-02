---
prev:
  text: 'Why Kubricate'
  link: '/guide/why-kubricate'
next:
  text: 'LLM'
  link: '/guide/llm'
---
# Getting Started

Kubricate makes it easy to define Kubernetes resources using plain TypeScript — without writing YAML by hand.

This guide walks you through the simplest way to get started: creating a static Kubernetes resource using plain JavaScript objects and generating YAML from it.

Let’s build your first stack: a simple Namespace called `my-namespace`.

### Prerequisites

Before we start, make sure you have the following:

* Basic understanding of **Node.js** and **TypeScript**
* [**Bun** installed](https://bun.sh/docs/installation)

::: tip Tip
If you're new to **Bun**, don't worry — it's a modern JavaScript runtime, similar to Node.js.
It’s faster, has built-in TypeScript support, and is easier to set up for new projects.
:::

## 1. Initialize your project

To begin, create a new project using [Bun](https://bun.sh/), which provides a fast setup with built-in TypeScript support:

```bash
mkdir first-stack
cd first-stack
bun init -y
```

Then, install the Kubricate CLI:

```bash
bun add -d kubricate
```

> This installs **Kubricate CLI** as a development dependency.

Check the installation:

```bash
bun kubricate --version
```

You will get the kubircate version

::: info Note
Kubricate is designed to work with standard Node.js environments, but it works well with **Bun**, too.
You can also use it with any package manager — **npm**, **yarn**, or **pnpm** — depending on your workflow.
When using Bun, simply run CLI commands with `bun`.
:::

Next, let’s define your first stack.

## 2. Define your first stack

Let’s create a simple Kubernetes Namespace — using plain JavaScript objects.

First, create a folder to organize your code:

```bash
mkdir src
```

Then, create a file named `stacks.ts` inside the `src` folder:

```ts twoslash
// @filename: src/stacks.ts
import { Stack } from 'kubricate';

export const myNamespace = Stack.fromStatic('Namespace', {
  // you can write any name of the resource in the stack
  namespace: {
    apiVersion: 'v1',
    kind: 'Namespace',
    metadata: {
      name: 'my-namespace',
    },
  },
});
```

This defines a stack called `myNamespace`, containing a single Kubernetes Namespace object.

## 3. Register your stack

Kubricate uses a config file to discover and organize your stacks.

Create a new file at the root of your project called `kubricate.config.ts`:

```ts twoslash
// @filename: src/stacks.ts
import { Stack } from 'kubricate';

export const myNamespace = Stack.fromStatic('Namespace', {
  // you can write any name of the resource in the stack
  namespace: {
    apiVersion: 'v1',
    kind: 'Namespace',
    metadata: {
      name: 'my-namespace',
    },
  },
});
// ---cut---
// @filename: kubricate.config.ts
import { defineConfig } from 'kubricate';
import { myNamespace } from './src/stacks';

export default defineConfig({
  stacks: {
    myFirstStack: myNamespace,
  },
});
```

In this example, we're registering the `myNamespace` stack under the name `myFirstStack`.

## 4. Generate YAML output

Now, generate the YAML for your stack using the CLI:

```bash
bun kubricate generate
```

You’ll see output like:

```bash
Generating stacks...
• Written: output/myFirstStack.yml
✔ Generated 1 file into "output/"
✔ Done!
```

The file `output/myFirstStack.yml` now contains the Kubernetes YAML generated from your `myNamespace` stack — ready to be applied with `kubectl` or committed to your Git repository.

The generated YAML file will look something like this:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: my-namespace
  labels:
    kubricate.thaitype.dev: "true"
    kubricate.thaitype.dev/stack-id: namespace
    kubricate.thaitype.dev/resource-id: namespace
  annotations:
    kubricate.thaitype.dev/stack-name: myFirstStack
    kubricate.thaitype.dev/version: 0.20.0
    kubricate.thaitype.dev/resource-hash: b974100353cc8dc10ce1a8e59a7f30eda1fe77177156b6d263c3a2eaf9faf0f3
    kubricate.thaitype.dev/managed-at: 2025-06-02T12:55:09.140Z
```

> 📝 Kubricate adds metadata like labels, annotations, and a hash automatically — so you can track and manage resources more easily.

## 5. Apply to your cluster (optional)

After generating the YAML, you can apply it directly to your Kubernetes cluster using `kubectl`:

```bash
kubectl apply -f output/myFirstStack.yml
```

This command will create the `Namespace` resource in your active Kubernetes context.

> You can customize stack names, structure, or output folder as needed — Kubricate is flexible by design.
