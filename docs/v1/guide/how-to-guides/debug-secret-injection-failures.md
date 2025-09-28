---
outline: deep
---

# How to debug secret injection failures

**Prerequisites**
- You have a SecretManager configured
- You're experiencing issues with secret injection
- You can run `kubricate generate` successfully

## Check secret registration

Verify that secrets are properly registered in your SecretManager:

```ts
// src/debug-secrets.ts
import { secretManager } from './setup-secrets'

// List all registered secrets
console.log('Registered secrets:', secretManager.getSecrets())

// Check specific secret details
const secrets = secretManager.getSecrets()
secrets.forEach(secret => {
  console.log(`Secret: ${secret.name}`)
  console.log(`Provider: ${secret.provider}`)
  console.log(`Connector: ${secret.connector}`)
})
```

**Expected output:**
```
Registered secrets: [
  { name: 'DATABASE_URL', provider: 'OpaqueSecretProvider', connector: 'EnvConnector' },
  { name: 'API_KEY', provider: 'OpaqueSecretProvider', connector: 'EnvConnector' }
]
```

## Verify environment variables are loaded

Check that environment variables are available to the EnvConnector:

```ts
// src/debug-env.ts
import { EnvConnector } from '@kubricate/plugin-env'

const envConnector = new EnvConnector()

// Check what environment variables EnvConnector can see
const availableSecrets = envConnector.list()
console.log('Available environment secrets:', availableSecrets)

// Test specific secret retrieval
try {
  const dbUrl = envConnector.get('DATABASE_URL')
  console.log('DATABASE_URL found:', !!dbUrl)
} catch (error) {
  console.error('DATABASE_URL not found:', error.message)
}
```

**Expected output:**
```
Available environment secrets: ['DATABASE_URL', 'API_KEY', 'REDIS_URL']
DATABASE_URL found: true
```

## Validate stack resource structure

Ensure your stack has the resources you're trying to inject secrets into:

```ts
// src/debug-stack.ts
import { myStack } from './stacks'

// Check what resources the stack creates
const resources = myStack.build()
console.log('Available resource keys:', Object.keys(resources))

// Check specific deployment structure
if (resources.deployment) {
  const containers = resources.deployment.spec.template.spec.containers
  console.log(`Found ${containers.length} containers:`)
  containers.forEach((container, index) => {
    console.log(`  [${index}]: ${container.name}`)
  })
}
```

**Expected output:**
```
Available resource keys: ['deployment', 'service']
Found 1 containers:
  [0]: my-app
```

## Test secret injection step by step

Create a minimal test to isolate the injection issue:

```ts
// src/test-injection.ts
import { EnvConnector } from '@kubricate/plugin-env'
import { OpaqueSecretProvider } from '@kubricate/plugin-kubernetes'
import { SecretManager } from 'kubricate'
import { simpleAppTemplate } from '@kubricate/stacks'
import { Stack } from 'kubricate'

// 1. Test SecretManager creation
const testSecretManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({
    name: 'test-secrets'
  }))
  .setDefaultConnector('EnvConnector')
  .setDefaultProvider('OpaqueSecretProvider')
  .addSecret({ name: 'DATABASE_URL' })

console.log('Step 1 - SecretManager created')

// 2. Test stack creation
const testStack = Stack.fromTemplate(simpleAppTemplate, {
  name: 'test-app',
  imageName: 'nginx'
})

console.log('Step 2 - Stack created')

// 3. Test secret injection
try {
  const stackWithSecrets = testStack.useSecrets(testSecretManager, c => {
    c.secrets('DATABASE_URL').inject()
  })
  console.log('Step 3 - Secret injection configured')

  // 4. Test build
  const built = stackWithSecrets.build()
  console.log('Step 4 - Stack built successfully')

  // 5. Check environment variables in deployment
  const containers = built.deployment.spec.template.spec.containers
  const envVars = containers[0].env || []
  const dbUrlEnv = envVars.find(env => env.name === 'DATABASE_URL')

  if (dbUrlEnv) {
    console.log('Step 5 - DATABASE_URL environment variable found:', dbUrlEnv)
  } else {
    console.error('Step 5 - DATABASE_URL environment variable NOT found')
    console.log('Available env vars:', envVars.map(env => env.name))
  }

} catch (error) {
  console.error('Secret injection failed:', error.message)
  console.error('Stack trace:', error.stack)
}
```

## Debug common error patterns

### "No injection strategy defined"

This error occurs when you forget to call `.inject()`:

```ts
// ❌ Missing .inject() call
.useSecrets(secretManager, c => {
  c.secrets('DATABASE_URL')  // Missing .inject()
})

// ✅ Proper injection
.useSecrets(secretManager, c => {
  c.secrets('DATABASE_URL').inject()
})
```

### "Secret not found"

This happens when the secret isn't registered or environment variable is missing:

```ts
// ❌ Secret not added to SecretManager
const secretManager = new SecretManager()
  .addSecret({ name: 'DATABASE_URL' })
  // Missing: .addSecret({ name: 'API_KEY' })

.useSecrets(secretManager, c => {
  c.secrets('API_KEY').inject()  // Error: Secret not found
})

// ✅ Add all required secrets
const secretManager = new SecretManager()
  .addSecret({ name: 'DATABASE_URL' })
  .addSecret({ name: 'API_KEY' })
```

Check your `.env` file:

```bash
# ❌ Missing KUBRICATE_SECRET_ prefix
API_KEY=sk_test_123

# ✅ Proper prefix
KUBRICATE_SECRET_API_KEY=sk_test_123
```

### "Resource ID not found"

This occurs when targeting a resource that doesn't exist:

```ts
// Check what resources are available
console.log('Available resources:', Object.keys(stack.build()))

// ❌ Wrong resource ID
.useSecrets(secretManager, c => {
  c.secrets('DATABASE_URL').inject({ resourceId: 'wrongId' })
})

// ✅ Use correct resource ID
.useSecrets(secretManager, c => {
  c.secrets('DATABASE_URL').inject({ resourceId: 'deployment' })
})
```

### "Container index out of bounds"

This happens when targeting a container index that doesn't exist:

```ts
// Check container count
const deployment = stack.build().deployment
const containerCount = deployment.spec.template.spec.containers.length
console.log(`Stack has ${containerCount} containers`)

// ❌ Wrong container index
.useSecrets(secretManager, c => {
  c.secrets('DATABASE_URL').inject({ containerIndex: 2 })  // Only 1 container exists
})

// ✅ Use correct index
.useSecrets(secretManager, c => {
  c.secrets('DATABASE_URL').inject({ containerIndex: 0 })
})
```

## Validate generated output

After fixing injection issues, verify the generated manifests:

```bash
# Generate manifests
bun kubricate generate

# Check deployment for environment variables
grep -A 10 "env:" output/myStack.yml

# Check for secret resources
grep -A 5 "kind: Secret" output/myStack.yml
```

**Expected output:**
```yaml
env:
- name: DATABASE_URL
  valueFrom:
    secretKeyRef:
      name: app-secrets
      key: DATABASE_URL
```

## Create a debugging checklist

Use this checklist to systematically debug secret injection issues:

1. **Environment variables**: Are secrets in `.env` with `KUBRICATE_SECRET_` prefix?
2. **SecretManager**: Are secrets registered with `.addSecret()`?
3. **Injection call**: Did you call `.inject()` on the secret?
4. **Resource targeting**: Does the target resource ID exist in `Object.keys(stack.build())`?
5. **Container targeting**: Is the container index within bounds?
6. **Build process**: Does `stack.build()` succeed without errors?
7. **Output validation**: Do generated manifests contain expected environment variables?

## Next Steps

**Related how-to guides:**
- [Working with Secret Manager](./working-with-secret-manager) for basic secret injection setup
- [Inject Secrets to Sidecar](./inject-secrets-sidecar) for container-specific injection issues