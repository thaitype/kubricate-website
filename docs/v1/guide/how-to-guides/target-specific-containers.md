---
outline: deep
---

# How to inject secrets into specific containers

**Prerequisites**
- You have a SecretManager configured and working
- Your stack has multiple containers in one or more pods
- You can run `kubricate generate` successfully

## Target containers by index

To inject secrets into the second container (index 1) in a pod:

```ts
// src/stacks.ts
import { secretManager } from './setup-secrets'

export const multiContainerApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'multi-app',
  imageName: 'nginx'
})
.useSecrets(secretManager, c => {
  // Inject into first container (index 0) - default behavior
  c.secrets('DATABASE_URL').inject()

  // Inject into second container (index 1)
  c.secrets('REDIS_URL').inject({ containerIndex: 1 })

  // Inject into third container (index 2)
  c.secrets('API_KEY').inject({ containerIndex: 2 })
})
```

**Result:** Each secret goes to its specified container index within the pod.

## Target containers in multi-pod stacks

For stacks with multiple deployments, target specific deployment containers:

```ts
// src/stacks.ts
export const complexStack = Stack.fromTemplate(complexAppTemplate, {
  name: 'complex-app',
  // ... template inputs
})
.useSecrets(secretManager, c => {
  // Target main deployment, first container
  c.secrets('DATABASE_URL').inject({
    resourceId: 'mainDeployment',
    containerIndex: 0
  })

  // Target worker deployment, first container
  c.secrets('QUEUE_URL').inject({
    resourceId: 'workerDeployment',
    containerIndex: 0
  })

  // Target main deployment, sidecar container
  c.secrets('MONITORING_TOKEN').inject({
    resourceId: 'mainDeployment',
    containerIndex: 1
  })
})
```

Find available resource IDs by checking your stack's build output:

```ts
// Debug available resource IDs
const resources = complexStack.build()
console.log('Available resource IDs:', Object.keys(resources))
// Output: ['mainDeployment', 'workerDeployment', 'service', 'configMap']
```

## Handle containers with initContainers

To inject secrets into init containers vs main containers:

```ts
export const appWithInit = Stack.fromTemplate(appTemplate, {
  name: 'app-with-init',
  imageName: 'app'
})
.override({
  deployment: {
    spec: {
      template: {
        spec: {
          initContainers: [{
            name: 'migration',
            image: 'migrate:latest',
            env: []  // Will be populated by secret injection
          }],
          containers: [{
            name: 'app-with-init',
            image: 'app:latest',
            env: []  // Will be populated by secret injection
          }]
        }
      }
    }
  }
})
.useSecrets(secretManager, c => {
  // Inject into init container (migration)
  c.secrets('DATABASE_URL').inject({
    containerIndex: 0,
    containerType: 'initContainer'
  })

  // Inject into main container (app)
  c.secrets('API_KEY').inject({
    containerIndex: 0,
    containerType: 'container'  // Default, can be omitted
  })
})
```

**Result:** Migration init container gets database credentials, main app gets API key.

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
  template:
    spec:
      containers:
      - name: nginx  # Container index 0
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
| `Resource ID not found` | Wrong resourceId | Check `Object.keys(stack.build())` |
| Secret in wrong container | Wrong index | Count containers from 0 |

Quick debugging:

```ts
// Check how many containers exist
const deployment = stack.build().deployment
const containers = deployment.spec.template.spec.containers
console.log(`Found ${containers.length} containers:`)
containers.forEach((container, index) => {
  console.log(`  [${index}]: ${container.name}`)
})
```

## Target specific containers by name

For more reliable targeting, modify your stack to use container name matching:

```ts
// Custom function to find container index by name
function getContainerIndex(stack: any, containerName: string): number {
  const deployment = stack.build().deployment
  const containers = deployment.spec.template.spec.containers
  const index = containers.findIndex(c => c.name === containerName)
  if (index === -1) {
    throw new Error(`Container '${containerName}' not found`)
  }
  return index
}

// Use name-based targeting
const webIndex = getContainerIndex(multiContainerApp, 'web')
const sidecarIndex = getContainerIndex(multiContainerApp, 'sidecar')

export const targetedApp = multiContainerApp
.useSecrets(secretManager, c => {
  c.secrets('DATABASE_URL').inject({ containerIndex: webIndex })
  c.secrets('CACHE_URL').inject({ containerIndex: sidecarIndex })
})
```

**Result:** Secrets are injected based on container names rather than fragile index positions.

## Next Steps

**Related how-to guides:**
- [Working with Secret Manager](./working-with-secret-manager) for basic secret injection
- [Config Overrides](./config-overrides) for adding containers to your stacks