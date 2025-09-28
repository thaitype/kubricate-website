---
outline: deep
---

# How to Inject Secrets to Sidecar Container (or Specific Containers)

**Prerequisites**
- You have a SecretManager configured and working
- Your stack has multiple containers in deployments
- You can run `kubricate generate` successfully

::: warning Init Container Support
Currently, Kubricate does not support targeting init containers specifically. Secret injection only works with regular containers in the `containers` array.
:::

## Target containers by index

To inject secrets into the second container (index 1) in a pod:

```ts
// src/stacks.ts
import { Stack } from 'kubricate'
import { secretManager } from './setup-secrets'
import { kubeModel } from '@kubricate/kubernetes-models';
import { Deployment } from 'kubernetes-models/apps/v1';

export const multiContainerApp = Stack.fromStatic('ContainerWithSidecar', {
  deployment: kubeModel(Deployment, {
    // Deployment metadata...
    spec: {
      // Other deployment spec fields...
      template: {
        // Other pod spec fields...
        spec: {
          containers: [
            {
              name: 'main-app',
              image: 'nginx',
            },
            {
              name: 'my-sidecar',
              image: 'my-sidecar-image',
            },
          ],
        },
      },
    },
  })
})
  .useSecrets(secretManager, c => {
    // Inject into first container (index 0) - default behavior
    c.secrets('DATABASE_URL').inject()

    // Inject into second container (index 1) or Sidecar Container
    c.secrets('MONITORING_TOKEN').inject('env', { containerIndex: 1 })
  })
```

**Result:** Each secret goes to its specified container index within the pod.

::: info Note
Using `kubeModel` with `kubernetes-models` is type-safe and recommended for defining Kubernetes resources in Kubricate. However, currently, `kubeModel` has known issue for type support with `Stack.fromStatic`, so you can follow the issue: https://github.com/thaitype/kubricate/issues/138
:::

## Target containers in multi-resource stacks

For stacks with multiple deployments, target specific deployment containers:

```ts
// src/stacks.ts
export const multiStack = Stack.fromTemplate(simpleAppTemplate, {
  name: 'multi-app',
  imageName: 'nginx'
})
.useSecrets(secretManager, c => {
  // Target specific deployment by resource ID
  c.secrets('DATABASE_URL').inject('env', { containerIndex: 0 }).intoResource('deployment')

  // Target different container in same deployment
  c.secrets('MONITORING_TOKEN').inject('env', { containerIndex: 1 }).intoResource('deployment')
})
```

Find available resource IDs by checking your stack's build output:

```ts
// Debug available resource IDs
const resources = multiStack.build()
console.log('Available resource IDs:', Object.keys(resources))
// Output: ['deployment', 'service']
```

## Target multiple containers in same deployment

To inject different secrets into different containers within the same deployment:

```ts
export const sidecarApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'app-with-sidecar',
  imageName: 'app'
})
.override({
  deployment: {
    spec: {
      template: {
        spec: {
          containers: [
            {
              name: 'app-with-sidecar',
              image: 'app:latest',
              env: []  // Will be populated by secret injection
            },
            {
              name: 'sidecar',
              image: 'sidecar:latest',
              env: []  // Will be populated by secret injection
            }
          ]
        }
      }
    }
  }
})
.useSecrets(secretManager, c => {
  // Inject into main container (index 0)
  c.secrets('API_KEY').inject('env', { containerIndex: 0 })

  // Inject into sidecar container (index 1)
  c.secrets('MONITORING_TOKEN').inject('env', { containerIndex: 1 })
})
```

**Result:** Main container gets API key, sidecar container gets monitoring token.

## Verify container targeting

Check that secrets are injected into the correct containers:

```bash
bun kubricate generate
```

Inspect the generated deployment:

```yaml
# output/sidecarApp.yml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: multi-app  # Container index 0
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: DATABASE_URL
      - name: sidecar  # Container index 1
        env:
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: REDIS_URL
```

## Debug container targeting issues

| Error | Cause | Fix |
|-------|-------|-----|
| `Container index out of bounds` | Wrong containerIndex | Check container array length |
| `Resource ID not found` | Wrong resource ID in `.intoResource()` | Check `Object.keys(stack.build())` |
| Secret in wrong container | Wrong index | Count containers from 0 |

## Next Steps

**Related how-to guides:**
- [Working with Secret Manager](./working-with-secret-manager) for basic secret injection
- [Config Overrides](./config-overrides) for adding containers to your stacks