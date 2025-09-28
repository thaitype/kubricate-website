---
outline: deep
---

# How to control output file organization with generate output modes

**Prerequisites**
- You have created stacks with `Stack.fromTemplate`
- You can run `kubricate generate` successfully
- You understand basic Kubricate configuration

## Set up stack output mode (default)

To generate one file per stack (this is the default behavior):

```ts
// kubricate.config.ts
import { defineConfig } from 'kubricate'
import { frontendApp, backendApp } from './src/stacks'

export default defineConfig({
  stacks: {
    frontendApp,
    backendApp
  },
  generate: {
    outputMode: 'stack',
    outputDir: './output'
  }
})
```

**Result:** Each stack creates one file containing all its resources:
- `output/frontendApp.yaml` - Contains deployment, service, secrets, etc.
- `output/backendApp.yaml` - Contains deployment, service, secrets, etc.

## Set up resource output mode

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
  generate: {
    outputMode: 'resource',
    outputDir: './manifests'
  }
})
```

**Result:** Each stack gets its own folder with separate files for each resource:
- `manifests/frontendApp/Deployment_frontend.yaml`
- `manifests/frontendApp/Service_frontend.yaml`
- `manifests/backendApp/Deployment_backend.yaml`
- `manifests/backendApp/Service_backend.yaml`

## Set up flat output mode

To generate all resources from all stacks in a single file:

```ts
// kubricate.config.ts
export default defineConfig({
  stacks: {
    webApp,
    apiServer
  },
  generate: {
    outputMode: 'flat',
    outputDir: './k8s-manifests'
  }
})
```

Run generation to create files in your custom directory:

```bash
bun kubricate generate
```

**Result:** All resources from all stacks are combined into a single file:
- `k8s-manifests/stacks.yaml` - Contains all deployments, services, secrets from all stacks

## Configure custom output directory

To specify where generated files are saved:

```ts
// kubricate.config.ts
export default defineConfig({
  stacks: {
    frontendApp,
    backendApp
  },
  generate: {
    outputMode: 'stack',  // Default mode
    outputDir: './k8s-manifests'  // Custom directory
  }
})
```

**Result:** Files are created in your custom directory:
- `k8s-manifests/frontendApp.yaml`
- `k8s-manifests/backendApp.yaml`

## Choose the right output mode

**Use stack mode (default) when:**
- You deploy each stack as a unit
- You want simple file management
- You use `kubectl apply -f stackname.yaml`
- Your stacks are small to medium size

**Use resource mode when:**
- You need granular control over individual resources
- You have large stacks with many resources
- Your CI/CD pipeline processes resources separately
- You use GitOps tools that prefer separated files

**Use flat mode when:**
- You want all resources in one file for simple deployment
- You're deploying to a single environment
- You prefer minimal file management

## Verify output structure

Check what files are generated:

```bash
# Generate manifests
bun kubricate generate

# Check file structure
find ./output -name "*.yaml" -type f
```

Inspect a generated file to confirm content:

```bash
# View stack output
cat output/webApp.yaml

# View resource output
ls -la output/webApp/
```

## Debug output issues

| Problem | Cause | Fix |
|---------|-------|-----|
| No files generated | Wrong output directory | Check `generate.outputDir` path exists |
| Files in wrong location | Incorrect config | Verify `generate.outputDir` in config |
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
  generate: {
    outputMode: 'resource',     // Granular control
    outputDir: './k8s'         // Standard k8s directory
  }
})
```

**Result:** Clean organization for automated deployment:
- `k8s/productionApp/Deployment_production-app.yaml`
- `k8s/productionApp/Service_production-app.yaml`
- `k8s/stagingApp/Deployment_staging-app.yaml`
- `k8s/stagingApp/Service_staging-app.yaml`

## Next Steps

**Related how-to guides:**
- [Config Overrides](./config-overrides) for customizing generated resources
- [Working with Secret Manager](./working-with-secret-manager) for managing secrets in generated files