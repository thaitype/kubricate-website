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
// src/stacks.ts
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

```ts
// kubricate.config.ts
import { defineConfig } from 'kubricate';
import { myNamespace } from './src/stacks';

export default defineConfig({
  stacks: {
    myFirstStack: myNamespace,
  },
});
```

In this example, we're registering the `myNamespace` stack under the name `myFirstStack`.

You can use any name you like here — this name will be used for the generated output file (`myFirstStack.yml`), and it doesn't have to match the variable name.
If you prefer, you could also register it like this:

```ts
stacks: {
  myNamespace, // same name as the stack
}
```

This gives you full flexibility to organize and name your stacks however you like.
