---
outline: deep
---

# Generate & Apply

Let’s take your first stack and turn it into real Kubernetes YAML — ready to be applied to a cluster.

This is where Kubricate shows its core purpose: generating clean manifests from simple, reusable code.

## What You’ll Do

- Use a prepared stack from the previous tutorial
- Generate Kubernetes YAML using the CLI
- Explore output structure and metadata
- (Optional) Apply the YAML to a real Kubernetes cluster

<br/>

::: info 💡 See the full example project
Want to skip ahead or double-check your work?
You can view the complete source code for this tutorial here:
[examples/v1/tutorials-start-from-template](https://github.com/thaitype/kubricate-website/tree/main/examples/v1/tutorials-start-from-template)
:::

## 1. Prepare Your Stack

If you followed [the previous tutorial](./start-from-template.md#_2-create-your-stack), you should already have a project with a ready-made stack.

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
    myApp, // you can name this anything — it's how you reference the stack from the CLI
  },
});
```

Now you’re ready to generate the output.

## 2. Generate the YAML

Now that your stack is registered in the config, you can generate the Kubernetes manifests.

Run this command from your project root:

```bash
bun kubricate generate
```

By default, it will:

- Load your config from `kubricate.config.ts`
- Generate YAML for all stacks
- Render in `stack` mode (grouped by stack)
- Write output to the `output/` directory

You’ll see output like this:

```bash
kubricate v0.20.1

ℹ Generating stacks for Kubernetes...
ℹ Found 1 stacks in config:
  ⬢ myApp (type: SimpleApp)
      ├── Deployment (id: deployment)
      └── Service (id: service)

ℹ Rendering with output mode "stack"
ℹ Cleaning output directory: output

Generating stacks...
• Written: output/myApp.yml

✔ Generated 1 file into "output/"
✔ Done!
```

Let’s break this down:

- `Found 1 stacks in config:` — Kubricate scanned your config file and found 1 stack defined: `myApp`.
- `⬢ myApp (type: SimpleApp)` — This stack uses the `SimpleApp` template and contains:

  - a `Deployment` resource with the internal ID `deployment`
  - a `Service` resource with the internal ID `service`

- `Rendering with output mode "stack"` — Resources are grouped into one file per stack.
- `Written: output/myApp.yml` — All YAML was written into this file under the `output/` folder.

This output helps you confirm what’s going to be generated before looking at the actual YAML.

### 🔍 Example Output

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demo-app
  labels:
    kubricate.thaitype.dev: 'true'
    kubricate.thaitype.dev/stack-id: myApp
    kubricate.thaitype.dev/resource-id: deployment
  annotations:
    kubricate.thaitype.dev/stack-name: SimpleApp
    kubricate.thaitype.dev/version: 0.20.1
    kubricate.thaitype.dev/resource-hash: 6a9d3e47f0a148b67c08285fb0a000050e65c57b3d86eb34ba8c5ebfcf0e5604
    kubricate.thaitype.dev/managed-at: 2025-06-04T13:24:39.117Z
spec:
  replicas: 1
  selector:
    matchLabels:
      app: demo-app
  template:
    metadata:
      labels:
        app: demo-app
    spec:
      containers:
        - image: nginx:latest
          name: demo-app
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: demo-app
  labels:
    kubricate.thaitype.dev: 'true'
    kubricate.thaitype.dev/stack-id: myApp
    kubricate.thaitype.dev/resource-id: service
  annotations:
    kubricate.thaitype.dev/stack-name: SimpleApp
    kubricate.thaitype.dev/version: 0.20.1
    kubricate.thaitype.dev/resource-hash: 046cdef288f338a6d886b296f7cea9a9ad92136d001b92cda342552449d0859a
    kubricate.thaitype.dev/managed-at: 2025-06-04T13:24:39.118Z
spec:
  selector:
    app: demo-app
  type: ClusterIP
  ports:
    - port: 80
      targetPort: 80
---
```

Here’s a simplified breakdown of the metadata you’ll see in the generated YAML:

```yaml
metadata:
  labels:
    kubricate.thaitype.dev: 'true'
    kubricate.thaitype.dev/stack-id: myApp
    kubricate.thaitype.dev/resource-id: deployment
  annotations:
    kubricate.thaitype.dev/stack-name: SimpleApp
    kubricate.thaitype.dev/version: 0.20.1
    kubricate.thaitype.dev/resource-hash: ...
    kubricate.thaitype.dev/managed-at: ...
```

These fields are **automatically injected** by Kubricate. Here’s what they mean:

- `stack-id` and `resource-id` — Help identify which Stack and resource generated this manifest.
- `stack-name` — Refers to the name of the template used (e.g. `SimpleApp`).
- `version` — The version of Kubricate used to generate this file.
- `resource-hash` — A hash of the resource content, used to detect changes and support GitOps.
- `managed-at` — The timestamp when this file was generated.

These metadata are useful for **auditing, syncing, and traceability**, especially in GitOps or CI/CD pipelines.

## 3. Apply to Your Kubernetes Cluster

Once the YAML file is generated, you can apply it to your cluster using the standard `kubectl` command.

In our case, the stack file is located at:

```
output/myApp.yml
```

To apply it:

```bash
kubectl apply -f output/myApp.yml
```

This will create the Deployment and Service resources defined in the `myApp` stack.

> ✅ Make sure your `kubectl` context is set to the correct cluster before running this command.

You can verify the result with:

```bash
kubectl get deployment demo-app
kubectl get service demo-app
```

If you want to explore before applying, you can also use:

```bash
kubectl diff -f output/myApp.yml    # preview changes
kubectl apply --dry-run=client -f output/myApp.yml
```

## You’ve Generated and Applied Your First Stack

You’ve now taken a complete Stack Template and turned it into real Kubernetes YAML — then applied it to your own cluster.

From here, you can:

- Move on to [**Build Your Template**](./build-your-template) to create your own reusable Stack logic
- Or explore [**Working with Secrets**](./working-with-secrets) to manage sensitive values cleanly and safely

> The path ahead is yours — but now, you’ve got the tools to shape it 🛠️
