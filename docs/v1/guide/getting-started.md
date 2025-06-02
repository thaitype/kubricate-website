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

To verify the installation:

```bash
bun kubricate --version
```

::: info Note
Kubricate is designed to work with standard Node.js environments, but it works well with **Bun**, too.
You can also use it with any package manager — **npm**, **yarn**, or **pnpm** — depending on your workflow.
When using Bun, simply run CLI commands with `bun`.
:::

Next, let’s define your first stack.
