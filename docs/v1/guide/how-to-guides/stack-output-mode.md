---
outline: deep
---

# Stack Output Modes

Kubricate gives you control over how your generated Kubernetes manifests are organized and structured. Instead of forcing a single output format, you can choose the **output mode** that best fits your workflow, team size, and deployment strategy.

Whether you're debugging locally, building CI/CD pipelines, or managing large-scale GitOps deployments, the right output mode can make your development experience smoother and your deployments more reliable.

> Think of output modes as different ways to package the same infrastructure — optimized for different use cases and workflows.

## Configuration

Output modes are configured in your `kubricate.config.ts` file under the `generate` section:

```ts
// @filename: kubricate.config.ts
import { defineConfig } from 'kubricate'
import { myStacks } from './src/stacks'

export default defineConfig({
  stacks: myStacks,
  generate: {
    outputMode: 'stack', // 'flat' | 'stack' | 'resource'
    outputDir: 'output', // optional, defaults to 'output'
    cleanOutputDir: true // optional, defaults to true
  }
})
```

### Configuration Options

- **`outputMode`**: Controls how files are structured (`'flat'`, `'stack'`, `'resource'`)
- **`outputDir`**: Directory where generated files are written (default: `'output'`)
- **`cleanOutputDir`**: Whether to clean the output directory before generating (default: `true`)

## Output Modes Explained

### Stack Mode (Default)

**One file per stack** — the most common and GitOps-friendly approach.

```ts
// @filename: kubricate.config.ts
import { defineConfig } from 'kubricate'

export default defineConfig({
  stacks: {
    frontend: {}, // placeholder
    backend: {},  // placeholder
    database: {}  // placeholder
  },
  generate: {
    outputMode: 'stack'
  }
})
```

**Output structure:**
```
output/
├── frontend.yml
├── backend.yml
└── database.yml
```

**Each file contains all resources for that stack:**
```yaml
# frontend.yml
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend-deployment
```

**When to use stack mode:**
- **GitOps workflows** — easy to track changes per application
- **Team ownership** — each team can own their stack file
- **Selective deployments** — apply specific stacks with `kubectl apply -f frontend.yml`
- **Code reviews** — clear separation of concerns in pull requests

### Flat Mode

**All resources in a single file** — simple and consolidated.

```ts
// @filename: kubricate.config.ts
import { defineConfig } from 'kubricate'

export default defineConfig({
  stacks: {
    frontend: {}, // placeholder
    backend: {},  // placeholder
  },
  generate: {
    outputMode: 'flat'
  }
})
```

**Output structure:**
```
output/
└── stacks.yml
```

**The single file contains everything:**
```yaml
# stacks.yml
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend-deployment
---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-deployment
```

**When to use flat mode:**
- **Simple deployments** — everything in one command: `kubectl apply -f stacks.yml`
- **Development environments** — fast iteration without managing multiple files
- **Small projects** — when you have just a few resources total
- **CI/CD simplicity** — one artifact to track and deploy

### Resource Mode

**Individual files per resource** — maximum granularity and organization.

```ts
// @filename: kubricate.config.ts
import { defineConfig } from 'kubricate'

export default defineConfig({
  stacks: {
    frontend: {}, // placeholder
    backend: {},  // placeholder
  },
  generate: {
    outputMode: 'resource'
  }
})
```

**Output structure:**
```
output/
├── frontend/
│   ├── Service_service.yml
│   └── Deployment_deployment.yml
└── backend/
    ├── Service_service.yml
    └── Deployment_deployment.yml
```

**Each resource gets its own file:**
```yaml
# frontend/Service_service.yml
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
spec:
  selector:
    app: frontend
```

**When to use resource mode:**
- **Large-scale infrastructure** — easier to navigate and understand
- **Granular deployments** — apply individual resources as needed
- **Debugging workflows** — isolate and test specific resources
- **Advanced GitOps** — fine-grained change tracking per resource type

## Use Cases and Practical Scenarios

### GitOps with ArgoCD/Flux

**Stack mode** is ideal for GitOps because it provides the right balance of organization and simplicity:

```ts
// @filename: kubricate.config.ts
import { defineConfig } from 'kubricate'

export default defineConfig({
  stacks: {
    'billing-api': {},     // placeholder
    'user-service': {},    // placeholder
    'notification-worker': {} // placeholder
  },
  generate: {
    outputMode: 'stack',
    outputDir: 'manifests' // ArgoCD/Flux can watch this directory
  }
})
```

Each service team owns their stack file, and your GitOps tool can:
- Track changes per application
- Deploy services independently
- Show clear diff history in Git

### Local Development and Debugging

**Flat mode** works well for rapid local iteration:

```ts
// @filename: kubricate.config.ts
import { defineConfig } from 'kubricate'

export default defineConfig({
  stacks: {
    'dev-app': {},
    'dev-db': {}
  },
  generate: {
    outputMode: 'flat',
    outputDir: 'dev-manifests'
  }
})
```

Quick commands for development:
```bash
# Generate and apply everything at once
bun kubricate generate && kubectl apply -f dev-manifests/stacks.yml

# Or clean up everything
kubectl delete -f dev-manifests/stacks.yml
```

### Large Infrastructure Projects

**Resource mode** helps manage complex deployments with many resources:

```ts
// @filename: kubricate.config.ts
import { defineConfig } from 'kubricate'

export default defineConfig({
  stacks: {
    'platform-core': {},      // 20+ resources
    'monitoring-stack': {},   // 15+ resources
    'ingress-controllers': {} // 10+ resources
  },
  generate: {
    outputMode: 'resource',
    outputDir: 'infrastructure'
  }
})
```

Benefits for large projects:
- Navigate to specific resource types easily
- Apply subsets of resources: `kubectl apply -f infrastructure/platform-core/`
- Debug individual components without noise
- Clear file organization for large teams

## CI/CD Integration and Tips

### GitHub Actions with Stack Mode

Perfect for service-oriented deployments:

```yaml
# .github/workflows/deploy.yml
name: Deploy Services
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate manifests
        run: |
          bun install
          bun kubricate generate

      - name: Deploy changed stacks only
        run: |
          # Only deploy stacks that changed
          for file in output/*.yml; do
            if git diff --name-only HEAD~1 | grep -q "$(basename $file)"; then
              kubectl apply -f "$file"
            fi
          done
```

### Pipeline Optimization by Mode

**Flat mode** — fastest for simple CI/CD:
```bash
# Single command deployment
kubectl apply -f output/stacks.yml
```

**Stack mode** — best for selective deployments:
```bash
# Deploy only specific services
kubectl apply -f output/api-gateway.yml
kubectl apply -f output/user-service.yml
```

**Resource mode** — most flexibility:
```bash
# Deploy only certain resource types
kubectl apply -f output/*/Deployment_*.yml  # All deployments first
kubectl apply -f output/*/Service_*.yml     # Then services
```

## stdout Mode: CLI Integration

For advanced workflows, you can output directly to stdout instead of files:

```bash
# Output to stdout instead of files
bun kubricate generate --stdout

# Pipe directly to kubectl
bun kubricate generate --stdout | kubectl apply -f -

# Combine with other CLI tools
bun kubricate generate --stdout | yq eval '.metadata.namespace = "production"' | kubectl apply -f -
```

**Use stdout mode for:**
- **Dynamic deployments** — modify manifests on-the-fly
- **Testing workflows** — preview without writing files
- **Scripted deployments** — integrate with shell scripts
- **Multi-cluster deployments** — apply the same manifests to different clusters

### Advanced stdout Examples

```bash
# Deploy to multiple clusters
for cluster in dev staging prod; do
  kubectl config use-context $cluster
  bun kubricate generate --stdout | kubectl apply -f -
done

# Add environment-specific labels
bun kubricate generate --stdout | \
  yq eval '.metadata.labels.environment = "production"' | \
  kubectl apply -f -

# Preview changes without applying
bun kubricate generate --stdout | kubectl diff -f -
```

## Best Practices and Decision Criteria

### Choose Your Mode Based On:

| Factor | Flat | Stack | Resource |
|--------|------|-------|----------|
| **Team Size** | 1-3 developers | 3-20 developers | 20+ developers |
| **Number of Services** | 1-5 services | 5-50 services | 50+ services |
| **Deployment Strategy** | All-at-once | Service-by-service | Resource-by-resource |
| **GitOps Complexity** | Simple | Moderate | Advanced |
| **File Management** | Minimal | Balanced | Granular |

### Migration Between Modes

You can change output modes at any time. Kubricate will clean the output directory by default:

```ts twoslash
// @filename: kubricate.config.ts
import { defineConfig } from 'kubricate'

export default defineConfig({
  stacks: {},
  generate: {
    // Switch from 'stack' to 'resource' mode
    outputMode: 'resource',
    cleanOutputDir: true // Removes old stack files
  }
})
```

### Performance Considerations

- **Flat mode**: Fastest generation, single file I/O
- **Stack mode**: Balanced performance, moderate file count
- **Resource mode**: Slower generation, many small files

For very large projects (100+ resources), consider:
- Using **resource mode** with selective generation
- Filtering specific stacks: `bun kubricate generate --filter mystack`
- Parallel CI/CD jobs per stack directory

## Environment-Specific Configurations

You can use different output modes per environment:

```ts twoslash
// @filename: kubricate.config.ts
import { defineConfig } from 'kubricate'

const environment = process.env.NODE_ENV || 'development'

export default defineConfig({
  stacks: {},
  generate: {
    // Use flat mode for dev, stack mode for production
    outputMode: environment === 'development' ? 'flat' : 'stack',
    outputDir: environment === 'development' ? 'dev-output' : 'manifests'
  }
})
```

## Troubleshooting Common Issues

### Output Directory Conflicts

If you're switching between modes and seeing unexpected files:

```ts twoslash
// @filename: kubricate.config.ts
import { defineConfig } from 'kubricate'

export default defineConfig({
  stacks: {},
  generate: {
    outputMode: 'stack',
    cleanOutputDir: true // Always clean before generating
  }
})
```

### Large File Performance

For very large flat files, consider splitting by namespace or environment:

```ts
// @filename: kubricate.config.ts
import { defineConfig } from 'kubricate'

export default defineConfig({
  stacks: {
    'prod-services': {},
    'prod-jobs': {}
  },
  generate: {
    outputMode: 'stack' // Separate files instead of one huge flat file
  }
})
```

### kubectl Apply Order

Some resources have dependencies. Resource mode gives you the most control:

```bash
# Apply in order with resource mode
kubectl apply -f output/*/Namespace_*.yml
kubectl apply -f output/*/ConfigMap_*.yml
kubectl apply -f output/*/Secret_*.yml
kubectl apply -f output/*/Deployment_*.yml
kubectl apply -f output/*/Service_*.yml
```

## Next Steps

Now that you understand output modes, you might want to explore:

- [Config Overrides](./config-overrides) for customizing generated resources
- [Working with Secrets](../working-with-secrets) for managing sensitive configuration
- [Generate & Apply](../tutorials/generate-and-apply) for deployment workflows
- The CLI reference for advanced generation options and filtering