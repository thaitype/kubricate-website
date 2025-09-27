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
  namespace: 'production'   // Core namespace
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
  namespace: 'production'
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
            name: 'billing-api',        // Must match template's data.name
            image: 'billing:latest',    // Must match template's imageName
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

### Adding Resource Limits

Add memory and CPU constraints that the template doesn't provide by default:

```ts twoslash
// @filename: stacks.ts
import { simpleAppTemplate } from '@kubricate/stacks'
import { Stack } from 'kubricate'

const myApp = Stack.fromTemplate(simpleAppTemplate, {
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

### Updating Image Tags

Override the image tag for a specific deployment without changing the template:

```ts twoslash
// @filename: stacks.ts
import { simpleAppTemplate } from '@kubricate/stacks'
import { Stack } from 'kubricate'

const myApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'app',
  imageName: 'myapp',
  namespace: 'production'
})
.override({
  deployment: {
    spec: {
      template: {
        spec: {
          containers: [{
            name: 'app',                // Must match template's data.name
            image: 'myapp:v1.2.3'      // Override specific tag
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
  imageName: 'nginx',
  namespace: 'debug'
})

// See all resource keys
console.log(Object.keys(stack.build()))
// Output: ['deployment', 'service']
```

### Targeting Multiple Resources

You can override multiple resources in a single call, but be careful with arrays - they're completely replaced:

```ts twoslash
// @filename: stacks.ts
import { simpleAppTemplate } from '@kubricate/stacks'
import { Stack } from 'kubricate'

const myApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'multi-override-app',
  imageName: 'app',
  port: 3000,
  env: [{ name: 'LOG_LEVEL', value: 'info' }]
})
.override({
  deployment: {
    spec: {
      replicas: 5,
      template: {
        spec: {
          // When overriding containers array, include ALL required fields
          containers: [{
            name: 'multi-override-app',  // Must match template's data.name
            image: 'app',                // Must match template's image logic
            ports: [{ containerPort: 3000 }], // Must match template's port
            env: [
              { name: 'LOG_LEVEL', value: 'info' },    // Existing from template
              { name: 'NODE_ENV', value: 'production' }, // Additional override
              { name: 'REPLICAS', value: '5' }          // Additional override
            ]
          }]
        }
      }
    }
  },
  service: {
    spec: {
      type: 'LoadBalancer',
      // When overriding ports array, include ALL required fields
      ports: [{
        port: 80,           // External port
        targetPort: 3000,   // Must match container port
        protocol: 'TCP'     // Explicit protocol
      }]
    }
  }
})
```

::: warning Complete Array Replacement
Notice how the container and ports arrays include **all required fields**. Partial arrays would break the deployment by losing essential configuration like image, name, or ports. Always include complete object definitions when overriding arrays.
:::

## How Overrides Work Under the Hood

Kubricate's override system operates at the **ResourceComposer** level using lodash's `merge()` function for deep object merging. When you call `.override()`, the data is stored and applied during the stack's `.build()` phase.

```ts twoslash
// @filename: internal-example.ts
import { merge } from 'lodash-es'

// This is what happens internally when you override
const originalConfig = {
  spec: {
    replicas: 1,
    template: {
      spec: {
        containers: [{ name: 'app', image: 'nginx' }]
      }
    }
  }
}

const overrideConfig = {
  spec: {
    replicas: 3,
    template: {
      spec: {
        containers: [{ name: 'app', image: 'nginx:1.21', resources: { limits: { memory: '512Mi' } } }]
      }
    }
  }
}

// ResourceComposer uses merge() from lodash
const result = merge({}, originalConfig, overrideConfig)
```

### Deep Merging Behavior

Understanding the merging behavior is crucial for effective overrides:

- **Objects are merged recursively** - nested properties are combined intelligently
- **Arrays are completely replaced** - no concatenation or smart merging
- **Primitive values are replaced** - strings, numbers, booleans overwrite completely

```ts twoslash
// @filename: stacks.ts
import { simpleAppTemplate } from '@kubricate/stacks'
import { Stack } from 'kubricate'

const myApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'merge-example',
  imageName: 'app',
  namespace: 'staging'
})
.override({
  deployment: {
    spec: {
      template: {
        spec: {
          // This completely replaces the containers array
          containers: [{
            name: 'merge-example',              // Must match template's data.name
            image: 'app:custom',                // Override the image
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

### Type Safety and Resource Keys

Overrides are **fully type-safe** through TypeScript inference. The resource keys come directly from your template's return object:

```ts twoslash
// @filename: example-template.ts
import { defineStackTemplate } from '@kubricate/core'
import { Deployment } from 'kubernetes-models/apps/v1/Deployment'
import { Service } from 'kubernetes-models/v1/Service'

const myTemplate = defineStackTemplate('MyTemplate', (data: { name: string }) => {
  return {
    // These keys become your override targets
    deployment: /* Deployment config */,
    service: /* Service config */,
    configMap: /* ConfigMap config */
  }
})

// TypeScript knows these keys exist and their types
const stack = Stack.fromTemplate(myTemplate, { name: 'test' })
.override({
  deployment: { /* typed as Deployment */ },
  service: { /* typed as Service */ },
  configMap: { /* typed as ConfigMap */ }
  // unknownKey: {} // ❌ TypeScript error!
})
```

From `simpleAppTemplate`, you get exactly two resource keys: `deployment` and `service`, as defined in `packages/stacks/src/simpleAppTemplate.ts:28-64`.

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

## Troubleshooting Common Override Issues

### Override Not Applied

**Problem:** Your override doesn't seem to take effect.

**Solutions:**
- Check that the resource key exists: `console.log(Object.keys(stack.build()))`
- Verify the override path matches the Kubernetes resource structure
- Ensure you're not overriding before calling the template (use `Stack.fromTemplate(template, data).override()`)

### Type Errors in Overrides

**Problem:** TypeScript complains about your override structure.

**Solutions:**
- Use the exact resource key from your template's return object
- Match the Kubernetes resource structure (check kubernetes-models types)
- Use partial objects - you don't need to specify every field

### Arrays Not Merging as Expected

**Problem:** Array properties are being replaced instead of merged.

**Solution:** This is expected behavior. Include all array items you want in your override:

```ts
// ❌ This BREAKS the deployment - incomplete container definition
.override({
  deployment: {
    spec: {
      template: {
        spec: {
          containers: [{
            env: [{ name: 'NEW_VAR', value: 'value' }]
          }] // Missing required: name, image, ports!
        }
      }
    }
  }
})

// ❌ This also BREAKS - missing essential container fields
.override({
  deployment: {
    spec: {
      template: {
        spec: {
          containers: [{
            resources: {
              limits: { memory: '512Mi' }
            }
          }] // Missing required: name, image, ports, env!
        }
      }
    }
  }
})

// ✅ Include ALL required container fields when overriding arrays
.override({
  deployment: {
    spec: {
      template: {
        spec: {
          containers: [{
            name: 'my-app',                    // Required: matches template
            image: 'my-app:latest',            // Required: matches template
            ports: [{ containerPort: 3000 }], // Required: matches template
            env: [
              { name: 'EXISTING_VAR', value: 'existing' }, // From template
              { name: 'NEW_VAR', value: 'value' }          // Your addition
            ],
            resources: {
              limits: { memory: '512Mi', cpu: '200m' }     // Your addition
            }
          }]
        }
      }
    }
  }
})
```

::: danger Array Replacement Breaks Deployments
When you override an array, you **completely replace it**. Forgetting required fields like `name`, `image`, or `ports` will create broken Kubernetes resources that fail to deploy. Always copy the complete structure from your template and add your modifications.
:::

## Next Steps

Now that you understand config overrides, you might want to explore:

- [Working with Secret Manager](./working-with-secret-manager) for advanced secret injection patterns
- [Stack Output Modes](./stack-output-mode) for controlling generated file structure
- [Working with Secrets Tutorial](../tutorials/working-with-secrets) for managing sensitive configuration