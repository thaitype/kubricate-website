# Generate & Apply

Let’s take your first stack and turn it into real Kubernetes YAML — ready to be applied to a cluster.

This is where Kubricate shows its core purpose: generating clean manifests from simple, reusable code.


## What You’ll Do

* Use a prepared stack from the previous tutorial
* Generate Kubernetes YAML using the CLI
* Explore output structure and metadata
* (Optional) Apply the YAML to a real Kubernetes cluster

## 1. Prepare Your Stack

If you followed the previous tutorial, you should already have a project with a ready-made stack.

We’ll use the same example here — a `simpleAppStackTemplate` from `@kubricate/stacks`.

Here’s a quick recap of your setup:

```ts twoslash
// @filename: src/stacks.ts
import { Stack } from 'kubricate';
import { simpleAppTemplate } from '@kubricate/stacks';

export const myApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'demo-app',
  imageName: 'nginx:latest',
  port: 80,
});
```

And your `kubricate.config.ts` should look like this:

```ts twoslash
// @filename: src/stacks.ts
import { Stack } from 'kubricate';
import { simpleAppTemplate } from '@kubricate/stacks';

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

Now you’re ready to generate the output.