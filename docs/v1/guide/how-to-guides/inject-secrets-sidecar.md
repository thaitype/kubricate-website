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

export const multiContainerApp = Stack.fromStatic('MultiContainerApp', {
  deployment: {
    // Deployment manifest...
  }
})
  .useSecrets(secretManager, c => {
    // Inject into first container (index 0) - default behavior
    c.secrets('DATABASE_URL').inject()

    // Inject into second container (index 1) or Sidecar Container
    c.secrets('MONITORING_TOKEN').inject('env', { containerIndex: 1 })

    // Inject into third container (index 2)
    c.secrets('REDIS_URL').inject('env', { containerIndex: 2 })
  })
```

**Result:** Each secret goes to its specified container index within the pod.

## Target multiple containers in same deployment

To inject different secrets into different containers within the same deployment:

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

**Result:** Main container gets API key, sidecar container gets monitoring token.

::: info Note
Using `kubeModel` with `kubernetes-models` is type-safe and recommended for defining Kubernetes resources in Kubricate. However, currently, `kubeModel` has known issue for type support with `Stack.fromStatic`, so you can follow the issue: https://github.com/thaitype/kubricate/issues/138
:::


## Verify container targeting

Check that secrets are injected into the correct containers:

```bash
bun kubricate generate
```

Inspect the generated deployment:

```yaml
# output/multiContainerApp.yml
apiVersion: apps/v1
kind: Deployment
spec:
    spec:
      containers:
        - name: main-app
          image: nginx
          env:
            - name: DATABASE_URL    # Inject into main container (index 0)
              valueFrom:
                secretKeyRef:
                  name: secret-application
                  key: DATABASE_URL
        - name: my-sidecar
          image: my-sidecar-image
          env:
            - name: MONITORING_TOKEN.  # Inject into sidecar container (index 1)
              valueFrom:
                secretKeyRef:
                  name: secret-application
                  key: MONITORING_TOKEN
```

## Debug container targeting issues

### Inspect registered injections

Kubricate stores every planned injection on the stack. If a secret does not show up where you expect, check what was registered:

```ts
const injects = multiContainerApp.getTargetInjects();

injects.forEach(inject => {
  console.log({
    resourceId: inject.resourceId,
    path: inject.path,
    secret: inject.meta?.secretName,
    target: inject.meta?.targetName,
  });
});
```

### Review container ordering

After `stack.build()` renders the manifest, inspect the resulting container list to confirm the index you want:

```ts
const resources = multiContainerApp.build();
const deployment = resources.deployment;
const containers = deployment?.spec?.template?.spec?.containers ?? [];

console.log(`Found ${containers.length} containers`);
containers.forEach((container, index) => {
  console.log(`[${index}] ${container.name}`);
});
```

### Validate generated YAML

```bash
bun kubricate generate
cat output/multiContainerApp.yml | yq '.spec.template.spec.containers[].env'
```

### Common issues

| Symptom | Likely Cause | Fix |
| --- | --- | --- |
| `Could not resolve resourceId` | Multiple resources share the provider `targetKind` | Use `.intoResource('yourResourceId')` or `injector.setDefaultResourceId()` |
| Secret appears on wrong container | Index mismatch | Log container ordering or create a helper that maps container names to indices |
| Injection missing entirely | Builder never registered the secret | Confirm `.secrets(name)` references an existing secret and check `getTargetInjects()` output |

## Next Steps

**Related how-to guides:**
- [Working with Secret Manager](./working-with-secret-manager) for basic secret injection
- [Config Overrides](./config-overrides) for adding containers to your stacks
