---
outline: deep
---

# How to control output file organization with stack output modes

**Prerequisites**
- You have created stacks with `Stack.fromTemplate`
- You can run `kubricate generate` successfully
- You understand basic Kubricate configuration

## Set up single-file output

To generate all resources for each stack in one file:

```ts
// kubricate.config.ts
import { defineConfig } from 'kubricate'
import { frontendApp, backendApp } from './src/stacks'

export default defineConfig({
  stacks: {
    frontendApp,
    backendApp
  },
  output: {
    mode: 'single-file',
    directory: './output'
  }
})
```

**Result:** Each stack creates one file containing all its resources:
- `output/frontendApp.yml` - Contains deployment, service, secrets, etc.
- `output/backendApp.yml` - Contains deployment, service, secrets, etc.

## Set up multi-file output

To generate separate files for each resource type:

```ts
// kubricate.config.ts
import { defineConfig } from 'kubricate'
import { frontendApp, backendApp } from './src/stacks'

export default defineConfig({
  stacks: {
    frontendApp,
    backendApp
  },
  output: {
    mode: 'multi-file',
    directory: './manifests'
  }
})
```

**Result:** Each resource type gets its own file:
- `manifests/frontendApp-deployment.yml`
- `manifests/frontendApp-service.yml`
- `manifests/backendApp-deployment.yml`
- `manifests/backendApp-service.yml`

## Configure custom output directory

To specify where generated files are saved:

```ts
// kubricate.config.ts
export default defineConfig({
  stacks: {
    webApp,
    apiServer
  },
  output: {
    mode: 'single-file',
    directory: './k8s-manifests'  // Custom directory
  }
})
```

Run generation to create files in your custom directory:

```bash
bun kubricate generate
```

**Result:** Files are created in `k8s-manifests/` instead of the default `output/` directory.

## Use namespace-based organization

To organize files by Kubernetes namespace:

```ts
// src/stacks.ts
import { simpleAppTemplate } from '@kubricate/stacks'
import { Stack } from 'kubricate'

export const frontendApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'web-app',
  imageName: 'nginx',
  namespace: 'frontend'  // Files grouped by this namespace
})

export const backendApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'api-server',
  imageName: 'api',
  namespace: 'backend'   // Files grouped by this namespace
})
```

```ts
// kubricate.config.ts
export default defineConfig({
  stacks: {
    frontendApp,
    backendApp
  },
  output: {
    mode: 'multi-file',
    directory: './manifests',
    groupBy: 'namespace'
  }
})
```

**Result:** Files are organized by namespace:
- `manifests/frontend/web-app-deployment.yml`
- `manifests/frontend/web-app-service.yml`
- `manifests/backend/api-server-deployment.yml`
- `manifests/backend/api-server-service.yml`

## Choose the right output mode

**Use single-file mode when:**
- You deploy each stack as a unit
- You want simple file management
- You use `kubectl apply -f stackname.yml`
- Your stacks are small to medium size

**Use multi-file mode when:**
- You need granular control over individual resources
- You have large stacks with many resources
- Your CI/CD pipeline processes resources separately
- You use GitOps tools that prefer separated files

## Verify output structure

Check what files are generated:

```bash
# Generate manifests
bun kubricate generate

# Check file structure
find ./output -name "*.yml" -type f
```

Inspect a generated file to confirm content:

```bash
# View single-file output
cat output/webApp.yml

# View multi-file output
ls -la output/webApp-*
```

## Debug output issues

| Problem | Cause | Fix |
|---------|-------|-----|
| No files generated | Wrong output directory | Check `output.directory` path exists |
| Files in wrong location | Incorrect config | Verify `output.directory` in config |
| Missing resources | Stack build errors | Check `Object.keys(stack.build())` |

Common fixes:

```bash
# Create output directory if missing
mkdir -p ./output

# Check current directory structure
ls -la

# Verify config file is correct
cat kubricate.config.ts
```

## Configure output for CI/CD

For deployment pipelines that expect specific file organization:

```ts
// kubricate.config.ts - Production setup
export default defineConfig({
  stacks: {
    productionApp,
    stagingApp
  },
  output: {
    mode: 'multi-file',        // Granular control
    directory: './k8s',        // Standard k8s directory
    groupBy: 'namespace'       // Organized by environment
  }
})
```

**Result:** Clean organization for automated deployment:
- `k8s/production/app-deployment.yml`
- `k8s/production/app-service.yml`
- `k8s/staging/app-deployment.yml`
- `k8s/staging/app-service.yml`

## Next Steps

**Related how-to guides:**
- [Config Overrides](./config-overrides) for customizing generated resources
- [Working with Secret Manager](./working-with-secret-manager) for managing secrets in generated files