---
outline: deep
---

# How to inject secrets into a CronJob container

## Prerequisites
- A working Kubricate project with a configured `SecretManager`
- A CronJob template (e.g. `cronJobTemplate`) available in your stack sources
- Ability to run `bun kubricate generate`

## Steps

1. **Create the CronJob stack**
   ```ts
   // src/stacks.ts
   import { cronJobTemplate } from './stack-templates/cronJobTemplate';
   import { Stack } from 'kubricate';

   export const cronJob = Stack.fromTemplate(cronJobTemplate, {
     name: 'my-cron-job',
   });
   ```

2. **Inject the secret into the CronJob container**
   ```ts
   import { secretManager } from './setup-secrets';

   cronJob.useSecrets(secretManager, injector => {
     injector.secrets('my_app_key')
       .forName('ENV_APP_KEY')
       .inject('env', {
         targetPath: 'spec.jobTemplate.spec.template.spec.containers[0].env',
       })
       .intoResource('cronJob');
   });
   ```
   - `targetPath` points to the CronJob container’s env array.
   - `.intoResource('cronJob')` selects the resource because the provider’s default `targetKind` is `Deployment`.

3. **Generate manifests to confirm the injection**
   ```bash
   bun kubricate generate
   cat output/cronJob.yml | yq '.spec.jobTemplate.spec.template.spec.containers[] | {name, env}'
   ```

## Result

The CronJob container now receives `ENV_APP_KEY` sourced from `my_app_key` during generation and `kubricate secret apply` runs without errors.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `[SecretInjectionBuilder] Could not resolve resourceId...` | Add `.intoResource('cronJob')` or call `injector.setDefaultResourceId('cronJob')`. |
| Secret missing from manifest | Verify the `targetPath` points to the correct container index. |

## Next steps
- [How to inject secrets to sidecar container](./target-specific-containers)
- [How to scale secret registries across teams](./scaling-with-secret-registry)
