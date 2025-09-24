# Examples: Stacks with Official Kubricate Packages

This directory provides runnable examples using **official Stacks** from [`@kubricate/stacks`](https://www.npmjs.com/package/@kubricate/stacks).
It’s a great starting point for understanding how to compose infrastructure using reusable, type-safe Kubernetes building blocks.

## 🚀 Usage

Install dependencies:

```bash
npm install
```

Generate all Kubernetes resources into the `./output` directory:

```bash
npx kubricate generate
```

Or use the shorter alias:

```bash
npx kbr generate
```

This command renders manifests from the configured Stacks — like Deployments, Services, and Ingresses — using values and structure defined in TypeScript.

## 📦 What's Inside?

These examples use:

* `@kubricate/stacks` – reusable, Stack definitions
* `@kubricate/core` – core framework for defining and composing resources
* `kubricate` – CLI for rendering and managing manifests

You can explore how these stacks are composed and extended by looking into the TypeScript files in this directory.

## 📄 How This Works

Kubricate uses a **design-time CLI** to compile infrastructure into YAML — no controllers, no runtime sidecars.
Each Stack defines a set of Kubernetes resources, optionally powered by secrets or parameters, and gets rendered to YAML through a simple CLI call.

> The output is plain YAML — ready to use with GitOps tools like ArgoCD or Flux.

## 🧭 Learn More

* [🔗 Docs Website](https://kubricate.thaitype.dev) – official documentation
* [📦 @kubricate/stacks on npm](https://www.npmjs.com/package/@kubricate/stacks)
* [🌐 Kubricate GitHub Repo](https://github.com/thaitype/kubricate)
