---
outline: deep
---

# How to modify stack templates with config overrides

**Prerequisites**
- You have a working stack created with `Stack.fromTemplate`
- You can run `kubricate generate` successfully
- You understand basic Kubernetes resource structure

## Override service configuration

To change service settings that the template doesn't expose as inputs:

```ts
// src/stacks.ts
import { simpleAppTemplate } from '@kubricate/stacks'
import { Stack } from 'kubricate'

const webApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'web-app',
  imageName: 'nginx',
  namespace: 'frontend'
})
.override({
  service: {
    spec: {
      type: 'LoadBalancer'
    }
  }
})
```

**Result:** Your service becomes a LoadBalancer instead of the template's default ClusterIP.

## Add resource limits to containers

To add memory and CPU constraints that the template doesn't provide:

```ts
const apiServer = Stack.fromTemplate(simpleAppTemplate, {
  name: 'api-server',
  imageName: 'api',
  namespace: 'backend'
})
.override({
  deployment: {
    spec: {
      template: {
        spec: {
          containers: [{
            name: 'api-server',         // Must match template's data.name
            image: 'api:latest',        // Must match template's imageName
            resources: {
              requests: {
                memory: '128Mi',
                cpu: '50m'
              },
              limits: {
                memory: '256Mi',
                cpu: '100m'
              }
            }
          }]
        }
      }
    }
  }
})
```

**Result:** Your deployment now has resource requests and limits applied to the container.

## Handle array replacement behavior

**Important:** When you override an array, you completely replace it. Include all required fields:

```ts
// ❌ This BREAKS - incomplete container definition
.override({
  deployment: {
    spec: {
      template: {
        spec: {
          containers: [{
            resources: { limits: { memory: '512Mi' } }
            // Missing required: name, image!
          }]
        }
      }
    }
  }
})

// ✅ Include ALL required container fields
.override({
  deployment: {
    spec: {
      template: {
        spec: {
          containers: [{
            name: 'my-app',                    // Required: matches template
            image: 'my-app:latest',            // Required: matches template
            resources: {
              limits: { memory: '512Mi', cpu: '200m' }
            }
          }]
        }
      }
    }
  }
})
```

**Result:** Your container gets resource limits while maintaining all required fields.

## Override multiple resources

To modify both deployment and service in one override:

```ts
const multiOverrideApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'multi-override-app',
  imageName: 'app',
  namespace: 'production'
})
.override({
  deployment: {
    spec: {
      replicas: 5,
      template: {
        spec: {
          containers: [{
            name: 'multi-override-app',  // Must match template's data.name
            image: 'app:latest',         // Must match template's imageName
            env: [
              { name: 'NODE_ENV', value: 'production' },
              { name: 'REPLICAS', value: '5' }
            ]
          }]
        }
      }
    }
  },
  service: {
    spec: {
      type: 'LoadBalancer',
      ports: [{
        port: 80,
        targetPort: 3000,
        protocol: 'TCP'
      }]
    }
  }
})
```

**Result:** Your deployment runs 5 replicas with environment variables, and your service is a LoadBalancer.

## Debug override issues

| Problem | Cause | Fix |
|---------|-------|-----|
| Override not applied | Wrong resource key | Check `Object.keys(stack.build())` |
| TypeScript errors | Invalid resource structure | Match Kubernetes resource schema |
| Deployment broken | Incomplete array replacement | Include all required fields in arrays |

Check your overrides are working:

```ts
// Verify override path exists
const resources = stack.build()
console.log('Generated resources:', JSON.stringify(resources, null, 2))

// Check specific resource structure
console.log('Service spec:', resources.service?.spec)
```

## When to use overrides vs template inputs

**Use template inputs for:**
- Core configuration (name, image, namespace)
- Commonly needed customizations
- Simple, well-defined values

**Use overrides for:**
- Environment-specific tweaks
- Kubernetes-specific configurations not exposed by template
- One-off modifications that don't warrant template changes

## Next Steps

**Related how-to guides:**
- [How to inject environment variables from .env files](./working-with-secret-manager) for secret injection
- [How to organize secrets across teams](./scaling-with-secret-registry) for multi-team setups