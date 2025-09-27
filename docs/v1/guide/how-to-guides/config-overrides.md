---
outline: deep
---

# Config Overrides

Stack templates provide sensible defaults and configurable inputs — but sometimes you need to modify specific fields that the template doesn't expose. That's where **config overrides** come in.

Unlike Helm charts, which often require you to predict every possible customization upfront, Kubricate lets you override any field in any resource **after** the stack is built — with full type safety and precision targeting.

> Think of overrides as surgical modifications to your generated resources, rather than wholesale rewrites.

## The Problem with Traditional Templates

Most templating systems force you to choose between two extremes:

**Either** the template exposes every possible option (leading to complex, hard-to-maintain templates)
**Or** you're stuck with the template's assumptions when you need something slightly different.

With Helm, adding a new customization option means:
1. Modifying the template to accept a new value
2. Updating values.yaml schemas
3. Testing all combinations of inputs
4. Hoping you don't break existing usage

Kubricate's override system gives you an escape hatch. You can use a well-designed, focused template **and** make targeted changes without touching the template itself.

## When to Use .override() vs Template Inputs

Understanding when to use template inputs versus overrides helps keep your code clean and maintainable:

### Use Template Inputs When:
- The customization is **commonly needed** across multiple uses
- It represents a **core configuration** of the application (name, image, port)
- The template author **intended** it to be configurable
- You're working with **simple, well-defined values**

```ts twoslash
// @filename: stacks.ts
import { simpleAppTemplate } from '@kubricate/stacks'
import { Stack } from 'kubricate'

// Good: Use template inputs for core configuration
const myApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'billing-api',      // Core identity
  imageName: 'billing',     // Core deployment config
  port: 3000,              // Core networking
  replicas: 3              // Core scaling
})
```

### Use .override() When:
- You need to modify **specific fields** the template doesn't expose
- The change is **environment-specific** or **one-off**
- You're making **tactical adjustments** without changing template logic
- You need to modify **Kubernetes-specific** configurations

```ts twoslash
// @filename: stacks.ts
import { simpleAppTemplate } from '@kubricate/stacks'
import { Stack } from 'kubricate'

// Good: Use overrides for specific modifications
const myApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'billing-api',
  imageName: 'billing',
  port: 3000
})
.override({
  // Specific service modification
  service: {
    spec: {
      type: 'LoadBalancer',
      loadBalancerIP: '10.0.0.100'
    }
  },
  // Specific deployment modifications
  deployment: {
    spec: {
      template: {
        spec: {
          containers: [{
            resources: {
              requests: { memory: '256Mi', cpu: '100m' },
              limits: { memory: '512Mi', cpu: '200m' }
            }
          }]
        }
      }
    }
  }
})
```

::: tip Best Practice
Start with template inputs for your core configuration, then use overrides for the specific tweaks your environment or use case requires. This keeps your intent clear and your code maintainable.
:::

## Basic Examples

### Changing Service Type

The most common override is changing a service from ClusterIP to LoadBalancer:

```ts twoslash
// @filename: stacks.ts
import { simpleAppTemplate } from '@kubricate/stacks'
import { Stack } from 'kubricate'

const myApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'web-app',
  imageName: 'nginx',
  port: 80
})
.override({
  service: {
    spec: {
      type: 'LoadBalancer'
    }
  }
})
```

### Adding Resource Limits

Add memory and CPU constraints that the template doesn't provide by default:

```ts twoslash
// @filename: stacks.ts
import { simpleAppTemplate } from '@kubricate/stacks'
import { Stack } from 'kubricate'

const myApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'api-server',
  imageName: 'api',
  port: 8080
})
.override({
  deployment: {
    spec: {
      template: {
        spec: {
          containers: [{
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

### Updating Image Tags

Override the image tag for a specific deployment without changing the template:

```ts twoslash
// @filename: stacks.ts
import { simpleAppTemplate } from '@kubricate/stacks'
import { Stack } from 'kubricate'

const myApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'app',
  imageName: 'myapp'
})
.override({
  deployment: {
    spec: {
      template: {
        spec: {
          containers: [{
            image: 'myapp:v1.2.3'  // Override specific tag
          }]
        }
      }
    }
  }
})
```

## Targeting Specific Resources

Kubricate stacks organize their resources by **logical keys**. Understanding these keys is essential for effective overrides.

### Finding Resource Keys

Most stack templates use intuitive resource keys. For example, `simpleAppTemplate` creates:
- `deployment` - The main Deployment resource
- `service` - The Service resource

You can inspect what keys are available by checking the stack's build output:

```ts twoslash
// @filename: debug.ts
import { simpleAppTemplate } from '@kubricate/stacks'
import { Stack } from 'kubricate'

const stack = Stack.fromTemplate(simpleAppTemplate, {
  name: 'debug-app',
  imageName: 'nginx'
})

// See all resource keys
console.log(Object.keys(stack.build()))
// Output: ['deployment', 'service']
```

### Targeting Multiple Resources

You can override multiple resources in a single call:

```ts twoslash
// @filename: stacks.ts
import { simpleAppTemplate } from '@kubricate/stacks'
import { Stack } from 'kubricate'

const myApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'multi-override-app',
  imageName: 'app'
})
.override({
  deployment: {
    spec: {
      replicas: 5,
      template: {
        spec: {
          containers: [{
            env: [
              { name: 'NODE_ENV', value: 'production' }
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
        targetPort: 8080
      }]
    }
  }
})
```

## Advanced Patterns

### Deep Merging Behavior

Kubricate's override system uses **deep merging**, which means:

- Objects are merged recursively
- Arrays are **replaced** (not concatenated)
- Primitive values are replaced

```ts twoslash
// @filename: stacks.ts
import { simpleAppTemplate } from '@kubricate/stacks'
import { Stack } from 'kubricate'

const myApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'merge-example',
  imageName: 'app'
})
.override({
  deployment: {
    spec: {
      template: {
        spec: {
          // This completely replaces the containers array
          containers: [{
            name: 'app',
            image: 'app:custom',
            ports: [{ containerPort: 3000 }],
            env: [
              { name: 'CUSTOM_VAR', value: 'custom-value' }
            ]
          }]
        }
      }
    }
  }
})
```

::: warning Array Replacement
When you override an array property, the entire array is replaced. If you need to add to an existing array, you'll need to include all the values you want in your override.
:::

### Environment-Specific Overrides

Create different configurations for different environments by conditionally applying overrides:

```ts twoslash
// @filename: stacks.ts
import { simpleAppTemplate } from '@kubricate/stacks'
import { Stack } from 'kubricate'

const environment = process.env.NODE_ENV || 'development'

let myApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'environment-app',
  imageName: 'app'
})

// Apply environment-specific overrides
if (environment === 'production') {
  myApp = myApp.override({
    deployment: {
      spec: {
        replicas: 3,
        template: {
          spec: {
            containers: [{
              resources: {
                requests: { memory: '256Mi', cpu: '100m' },
                limits: { memory: '512Mi', cpu: '200m' }
              }
            }]
          }
        }
      }
    },
    service: {
      spec: {
        type: 'LoadBalancer'
      }
    }
  })
} else if (environment === 'staging') {
  myApp = myApp.override({
    deployment: {
      spec: {
        replicas: 2
      }
    }
  })
}

export { myApp }
```

### Chaining Overrides

You can chain multiple override calls for better organization:

```ts twoslash
// @filename: stacks.ts
import { simpleAppTemplate } from '@kubricate/stacks'
import { Stack } from 'kubricate'

const myApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'chained-app',
  imageName: 'app'
})
// Base production settings
.override({
  deployment: {
    spec: {
      replicas: 3
    }
  }
})
// Add monitoring labels
.override({
  deployment: {
    metadata: {
      labels: {
        monitoring: 'enabled',
        team: 'platform'
      }
    }
  },
  service: {
    metadata: {
      labels: {
        monitoring: 'enabled',
        team: 'platform'
      }
    }
  }
})
```

## Common Use Cases

### 1. Exposing Internal Services

Turn a ClusterIP service into a LoadBalancer for external access:

```ts twoslash
// @filename: stacks.ts
import { simpleAppTemplate } from '@kubricate/stacks'
import { Stack } from 'kubricate'

const publicApi = Stack.fromTemplate(simpleAppTemplate, {
  name: 'public-api',
  imageName: 'api'
})
.override({
  service: {
    spec: {
      type: 'LoadBalancer',
      ports: [{
        port: 443,
        targetPort: 8080,
        protocol: 'TCP'
      }]
    }
  }
})
```

### 2. Adding Persistent Storage

Add volume mounts that aren't part of the basic template:

```ts twoslash
// @filename: stacks.ts
import { simpleAppTemplate } from '@kubricate/stacks'
import { Stack } from 'kubricate'

const dataApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'data-processor',
  imageName: 'processor'
})
.override({
  deployment: {
    spec: {
      template: {
        spec: {
          volumes: [{
            name: 'data-storage',
            persistentVolumeClaim: {
              claimName: 'data-pvc'
            }
          }],
          containers: [{
            volumeMounts: [{
              name: 'data-storage',
              mountPath: '/data'
            }]
          }]
        }
      }
    }
  }
})
```

### 3. Custom Health Checks

Add liveness and readiness probes:

```ts twoslash
// @filename: stacks.ts
import { simpleAppTemplate } from '@kubricate/stacks'
import { Stack } from 'kubricate'

const healthyApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'healthy-app',
  imageName: 'web-server'
})
.override({
  deployment: {
    spec: {
      template: {
        spec: {
          containers: [{
            livenessProbe: {
              httpGet: {
                path: '/health',
                port: 8080
              },
              initialDelaySeconds: 30,
              periodSeconds: 10
            },
            readinessProbe: {
              httpGet: {
                path: '/ready',
                port: 8080
              },
              initialDelaySeconds: 5,
              periodSeconds: 5
            }
          }]
        }
      }
    }
  }
})
```

### 4. Security Context and Pod Security

Add security constraints:

```ts twoslash
// @filename: stacks.ts
import { simpleAppTemplate } from '@kubricate/stacks'
import { Stack } from 'kubricate'

const secureApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'secure-app',
  imageName: 'secure-service'
})
.override({
  deployment: {
    spec: {
      template: {
        spec: {
          securityContext: {
            runAsNonRoot: true,
            runAsUser: 1000,
            fsGroup: 2000
          },
          containers: [{
            securityContext: {
              allowPrivilegeEscalation: false,
              readOnlyRootFilesystem: true,
              capabilities: {
                drop: ['ALL']
              }
            }
          }]
        }
      }
    }
  }
})
```

## Why This Matters

Config overrides solve the **template flexibility problem** that plagues most Kubernetes tooling:

**With traditional tools:**
- Templates become kitchen sinks of every possible option
- OR you fork and maintain your own templates
- OR you give up on reusability and write everything from scratch

**With Kubricate overrides:**
- Templates stay focused on their core purpose
- You can make surgical modifications without template changes
- Your overrides are type-safe and explicit
- You maintain the benefits of both reusability AND flexibility

> This means you can use community templates, company templates, or your own templates — and still adapt them to your specific needs without compromise.

## Next Steps

Now that you understand config overrides, you might want to explore:

- [Working with Secrets](./working-with-secrets) for managing sensitive configuration
- [Build Your Template](./tutorials/build-your-template) for creating your own reusable templates
- The API reference for advanced override patterns and ResourceComposer methods