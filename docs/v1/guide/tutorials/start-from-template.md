# Start from Template

Let’s build your first real-world stack — using a ready-made Stack Template.

This is the easiest way to get started with Kubricate, before learning how to build your own templates.

## What You’ll Do

* Use a prebuilt Stack Template
* Generate Kubernetes YAML from it

## 1. Install Stack Templates

Kubricate provides a set of Stack Templates via `@kubricate/stacks` — maintained by the author of the framework.

Install the package:

```bash
bun install @kubricate/stacks
```

::: info Note
If you’re using npm, yarn, or pnpm — use the respective install command instead.
:::

## 2. Create Your Stack

Now, let’s use a built-in template called `simpleAppStackTemplate`, which helps you create a basic `Deployment` and `Service` for your app.

In your `src/stacks.ts`:

```ts twoslash
// @filename: src/stacks.ts
import { simpleAppTemplate } from '@kubricate/stacks';
import { Stack } from 'kubricate';

export const myApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'demo-app',
  imageName: 'nginx:latest',
  port: 80,
});
```

This will generate both a `Deployment` and a `Service` for your app.

## 3. Register the Stack

In your `kubricate.config.ts`:

```ts twoslash
// @filename: src/stacks.ts
import { simpleAppTemplate } from '@kubricate/stacks';
import { Stack } from 'kubricate';

export const myApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'demo-app',
  imageName: 'nginx:latest',
  port: 80,
});
// ---cut---
// @filename: kubricate.config.ts
import { defineConfig } from 'kubricate';
import { myApp } from './src/stacks';

export default defineConfig({
  stacks: {
    myApp,
  },
});
```

You can name the stack key (`myApp`) however you like — it’s just a label for CLI and file output.

## 4. Generate YAML

Generate the output using the CLI:

```bash
bun kubricate generate
```

You’ll see output like:

```bash
Generating stacks...
• Written: output/myApp.yml
✔ Generated 1 file into "output/"
✔ Done!
```

You can open the generated YAML in `output/myApp.yml`.

## You’ve Built Your First Stack!

From here, you can:

* Move on to [Generate & Apply](./generate-and-apply) to try applying it to a real cluster
* Or dive into [Build Your Template](./build-your-template) to learn how to customize it from scratch
