---
outline: deep
---

# Build Your Template

Now that you've used a prebuilt Stack Template — it’s time to build your own.

This gives you full control over the Kubernetes resources you want to generate, with all the benefits of typed code and modular structure.

## What You’ll Do

* Define your first custom Stack Template from scratch
* Use the `kubeModel()` helper for type-safe Kubernetes resources
* Generate YAML output using your own logic

## 1. Create Your First Template

Let’s build a custom Stack Template — from scratch.

In this example, we’ll define a simple template that creates a Kubernetes **Namespace**.
You’ll learn how to use basic Kubernetes resource definitions, and wrap them into a reusable template using `defineStackTemplate()`.

### How Do You Define a Kubernetes Object in TypeScript?

To work with Kubernetes YAML in Kubricate, you’ll need to define Kubernetes resources in code.
There are a few approaches:

#### Option 1: Write raw objects

```ts
const ns = {
  apiVersion: 'v1',
  kind: 'Namespace',
  metadata: { name: 'demo' },
};
```

This works — but you get no types or autocomplete.

---

#### Option 2: Use `kubernetes-models` (class instances)

[kubernetes-models](https://www.npmjs.com/package/kubernetes-models) provides strongly typed classes:

```ts
import { V1Namespace } from 'kubernetes-models/v1';

const ns = new V1Namespace({ metadata: { name: 'demo' } });
```

This gives you type safety, but the result is a class instance — not a plain object.
That doesn’t work well with `defineStackTemplate`, which expects plain objects.
You may also run into issues if you try to override fields or serialize the output.

### Use `@kubricate/kubernetes-models`

Kubricate provides a helper called `kubeModel()` that converts typed class instances into plain objects.

```ts
import { kubeModel } from '@kubricate/kubernetes-models';
import { V1Namespace } from 'kubernetes-models/v1';

const ns = kubeModel(V1Namespace, {
  metadata: { name: 'demo' },
});
```

You get type-safe input, but the result is a plain object — ready for use in templates.

## 2. Wrap It as a Stack Template

To make your resource reusable, we’ll turn it into a **Stack Template** using `defineStackTemplate()`.

But first, install the packages you’ll need:

```bash
npm install kubernetes-models @kubricate/core @kubricate/kubernetes-models
```

* `kubernetes-models` — typed classes for Kubernetes resources
* `@kubricate/kubernetes-models` — converts them into plain objects
* `@kubricate/core` — defines stack templates for Kubricate

Now you’re ready to wrap your object:

```ts
// stack-templates/myTemplate.ts
import { Namespace } from 'kubernetes-models/v1';
import { defineStackTemplate } from '@kubricate/core';
import { kubeModel } from '@kubricate/kubernetes-models';

interface MyInput {
  name: string;
}

export const myTemplate = defineStackTemplate('MyStack', (data: MyInput) => ({
  namespace: kubeModel(Namespace, {
    metadata: { name: data.name },
  }),
}));
```

This creates a stack template that takes a `name` as input and generates a single resource: a Kubernetes Namespace.

::: tip Tip
The returned object uses **keys as resource IDs** — here, `namespace` is the ID you’ll see in CLI output and in annotations like `resource-id`.
:::

## 3. Use Your Template

Let’s use the `myTemplate` we just created — by passing it into your Kubricate config.

```ts
// @filename: src/stacks.ts
import { Stack } from 'kubricate';
import { myTemplate } from './stack-templates/myTemplate';

export const myNamespace = Stack.fromTemplate(myTemplate, {
  name: 'demo',
});
```

```ts
// @filename: kubricate.config.ts
import { defineConfig } from 'kubricate';
import { myNamespace } from './src/stacks';

export default defineConfig({
  stacks: {
    myNamespace,
  },
});
```

When you run:

```bash
kubricate generate
```

You’ll get YAML for a Namespace named `demo`, with all the metadata from Kubricate included, ready to use in your Kubernetes cluster.

## Done — You’ve Built Your First Template

You’ve just created a custom **Stack Template** — using `defineStackTemplate()` — and learned how to:

* Define Kubernetes resources with full type safety using `kubeModel()`
* Keep the output clean and serializable for Kubricate
* Reuse the template through `Stack.fromTemplate()` in your project

> 📦 If you want to **generate** or **apply** the YAML output from this template,
> you can revisit the earlier tutorial:
> [**Generate & Apply**](./generate-and-apply)

From here, you can continue with:

* [**Working with Secrets**](./working-with-secrets) — Learn how to securely manage sensitive values in your stacks
* Or go deeper by building **more advanced templates** — with logic, multiple resources, and reusable patterns

🛠️ Kubricate gives you the freedom to design your infrastructure the way you want — with simplicity and full type safety.
