---
outline: deep
---

# How to inject secrets into specific resources

**Prerequisites**
- You have a SecretManager configured and working
- Your stack creates multiple Kubernetes resources
- You can run `kubricate generate` successfully

## Identify available resources

Find which resources your stack creates and can accept secret injection:

```ts
// src/debug-resources.ts
import { myStack } from './stacks'

// Check what resources the stack builds
const resources = myStack.build()
console.log('Available resource IDs:', Object.keys(resources))

// Check which resources have containers that can receive secrets
Object.entries(resources).forEach(([id, resource]) => {
  if (resource.spec?.template?.spec?.containers) {
    console.log(`Resource '${id}' has containers:`, resource.spec.template.spec.containers.length)
  }
})
```

**Expected output:**
```
Available resource IDs: ['webDeployment', 'workerDeployment', 'service', 'configMap']
Resource 'webDeployment' has containers: 1
Resource 'workerDeployment' has containers: 2
```

## Target specific deployments

To inject secrets into different deployments within the same stack:

```ts
// src/stacks.ts
import { complexAppTemplate } from '@kubricate/stacks'
import { Stack } from 'kubricate'
import { secretManager } from './setup-secrets'

export const multiDeploymentApp = Stack.fromTemplate(complexAppTemplate, {
  name: 'complex-app',
  // ... template inputs
})
.useSecrets(secretManager, c => {
  // Inject into web deployment
  c.secrets('DATABASE_URL').inject({
    resourceId: 'webDeployment'
  })

  // Inject into worker deployment
  c.secrets('QUEUE_URL').inject({
    resourceId: 'workerDeployment'
  })

  // Inject into both deployments
  c.secrets('API_KEY').inject({
    resourceId: 'webDeployment'
  })
  c.secrets('API_KEY').inject({
    resourceId: 'workerDeployment'
  })
})
```

**Result:** Each deployment gets only the secrets it needs for its specific role.

## Target StatefulSets and DaemonSets

For stacks that create StatefulSets or DaemonSets instead of Deployments:

```ts
export const databaseStack = Stack.fromTemplate(databaseTemplate, {
  name: 'postgres',
  namespace: 'database'
})
.useSecrets(secretManager, c => {
  // Target StatefulSet for database
  c.secrets('POSTGRES_PASSWORD').inject({
    resourceId: 'statefulSet'
  })

  c.secrets('POSTGRES_USER').inject({
    resourceId: 'statefulSet'
  })
})

export const monitoringStack = Stack.fromTemplate(monitoringTemplate, {
  name: 'node-exporter',
  namespace: 'monitoring'
})
.useSecrets(secretManager, c => {
  // Target DaemonSet for monitoring
  c.secrets('MONITORING_TOKEN').inject({
    resourceId: 'daemonSet'
  })
})
```

## Handle resources without containers

Some resources like Services or ConfigMaps don't have containers and can't receive secret injection:

```ts
// ❌ This will fail - services don't have containers
.useSecrets(secretManager, c => {
  c.secrets('DATABASE_URL').inject({
    resourceId: 'service'  // Error: No containers in service
  })
})

// ✅ Only target resources with containers
.useSecrets(secretManager, c => {
  c.secrets('DATABASE_URL').inject({
    resourceId: 'deployment'  // Has containers
  })
})
```

Check which resources can receive secrets:

```ts
// Helper function to check if resource has containers
function hasContainers(resource: any): boolean {
  return !!(resource.spec?.template?.spec?.containers)
}

// Filter resources that can receive secrets
const resources = stack.build()
const injectableResources = Object.entries(resources)
  .filter(([id, resource]) => hasContainers(resource))
  .map(([id]) => id)

console.log('Resources that can receive secrets:', injectableResources)
```

## Target Job and CronJob resources

For stacks that create Jobs or CronJobs:

```ts
export const batchJobStack = Stack.fromTemplate(jobTemplate, {
  name: 'data-migration',
  namespace: 'jobs'
})
.useSecrets(secretManager, c => {
  // Target Job resource
  c.secrets('DATABASE_URL').inject({
    resourceId: 'job'
  })

  c.secrets('MIGRATION_TOKEN').inject({
    resourceId: 'job'
  })
})

export const cronJobStack = Stack.fromTemplate(cronTemplate, {
  name: 'backup-scheduler',
  namespace: 'cron'
})
.useSecrets(secretManager, c => {
  // Target CronJob resource
  c.secrets('BACKUP_CREDENTIALS').inject({
    resourceId: 'cronJob'
  })
})
```

## Target resources by type pattern

For templates that follow naming conventions, you can target resources systematically:

```ts
// Template creates: mainDeployment, sidecarDeployment, service, configMap
export const systematicStack = Stack.fromTemplate(template, {
  name: 'systematic-app'
})
.useSecrets(secretManager, c => {
  // Target all deployment resources
  const resources = systematicStack.build()
  Object.keys(resources)
    .filter(id => id.includes('Deployment'))
    .forEach(deploymentId => {
      c.secrets('SHARED_SECRET').inject({
        resourceId: deploymentId
      })
    })

  // Target specific deployment types
  c.secrets('MAIN_DB_URL').inject({
    resourceId: 'mainDeployment'
  })

  c.secrets('CACHE_URL').inject({
    resourceId: 'sidecarDeployment'
  })
})
```

## Verify resource targeting

Check that secrets are injected into the correct resources:

```bash
bun kubricate generate
```

Inspect generated manifests for each targeted resource:

```yaml
# output/multiDeploymentApp.yml

# Web deployment gets DATABASE_URL and API_KEY
apiVersion: apps/v1
kind: Deployment
metadata:
  name: complex-app-web
spec:
  template:
    spec:
      containers:
      - name: web
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: DATABASE_URL
        - name: API_KEY
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: API_KEY

---
# Worker deployment gets QUEUE_URL and API_KEY
apiVersion: apps/v1
kind: Deployment
metadata:
  name: complex-app-worker
spec:
  template:
    spec:
      containers:
      - name: worker
        env:
        - name: QUEUE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: QUEUE_URL
        - name: API_KEY
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: API_KEY
```

## Debug resource targeting issues

| Error | Cause | Fix |
|-------|-------|-----|
| `Resource ID not found` | Wrong resourceId | Check `Object.keys(stack.build())` |
| `No containers in resource` | Targeting non-container resource | Only target Deployment, StatefulSet, DaemonSet, Job, CronJob |
| Secret not in expected resource | Wrong resourceId | Verify resource name matches stack output |

Common debugging steps:

```ts
// 1. List all available resource IDs
console.log('Available resources:', Object.keys(stack.build()))

// 2. Check which resources have containers
const resources = stack.build()
Object.entries(resources).forEach(([id, resource]) => {
  const hasContainers = !!(resource.spec?.template?.spec?.containers)
  console.log(`${id}: ${hasContainers ? 'CAN' : 'CANNOT'} receive secrets`)
})

// 3. Inspect specific resource structure
console.log('Web deployment:', JSON.stringify(resources.webDeployment, null, 2))
```

## Target resources with multiple container types

For resources that have both init containers and regular containers:

```ts
export const complexResourceStack = Stack.fromTemplate(template, {
  name: 'complex-resource'
})
.useSecrets(secretManager, c => {
  // Target init container in main deployment
  c.secrets('INIT_SECRET').inject({
    resourceId: 'mainDeployment',
    containerIndex: 0,
    containerType: 'initContainer'
  })

  // Target main container in main deployment
  c.secrets('APP_SECRET').inject({
    resourceId: 'mainDeployment',
    containerIndex: 0,
    containerType: 'container'
  })

  // Target sidecar container in main deployment
  c.secrets('SIDECAR_SECRET').inject({
    resourceId: 'mainDeployment',
    containerIndex: 1,
    containerType: 'container'
  })
})
```

**Result:** Each container type within each resource gets appropriate secrets.

## Next Steps

**Related how-to guides:**
- [Target Specific Containers](./target-specific-containers) for container-level targeting within resources
- [Working with Secret Manager](./working-with-secret-manager) for basic secret injection setup