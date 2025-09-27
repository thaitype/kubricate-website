## Content Tasks
### Guide Section

#### ℹ️ Introduction

- [x] **Why Kubricate**
  - [X] Intro – Short mission statement
  - [X] The Problem – Real-world pain of YAML, secrets, and drift
  - [X] The Solution – Kubricate in plain terms (without code yet)
  - [X] How It Works – Stacks + Secrets + CLI explained with metaphors
  - [X] Key Benefits – Now explain type safety, plugin system, CI/CD
  - [X] Comparison Table – ESO / Vault etc.
  - [x] What You Get
  - [x] Next Steps


- [x] **Quickstart**
  - [x] Minimal step-by-step guide
  - [x] Define a simple AppStack
  - [x] Run `kubricate generate`
  - [x] Show YAML output

#### ℹ️ Tutorials

- [x] Understand the Workflow
- [x] Start from Template
- [x] Generate & Apply
- [x] Build Your Template
- [x] Working with Secrets

#### ℹ️ How-to Guides

- [ ] **Multi-env Stacks**
  - Currently, Kubricate does not have built-in mulit-env support, however, you can achieve this by creating refactor as usaual how javascript can do. See the issue for support the multi-env feature: https://github.com/thaitype/kubricate/issues/110

- [ ] **Override Configs**
  - [ ] Show how to override stack fields
  - [ ] Example: image tags, resource limits

- [ ] **Secret Conflict Handling**
  - [ ] Default: autoMerge at intraProvider
  - [ ] Briefly introduce other strategies

- [ ] **Stack Output Modes**
  - [ ] Explain `outputMode` in config:
    - [ ] `stack`
    - [ ] `resource`
    - [ ] `flat`
    - [ ] `stdout`
  - [ ] Real-world use cases

- [ ] **Single SecretManager**
  - [ ] Multiple Providers and Connectors
  - [ ] Best practices for secret injection

- [ ] **Scaling with SecretRegistry**
  - [ ] Use cases for multiple SecretManagers
  - [ ] Namespace/stack scaling best practices

#### ℹ️ Core Concepts

- [ ] **Stacks**
  - [ ] Type-safe infra
  - [ ] Grouping resources with ResourceComposer

- [ ] **SecretManager**
  - [ ] Load via Connectors
  - [ ] Inject via Providers
  - [ ] Secret lifecycle overview

- [ ] **Connectors**
  - [ ] Load secrets from `.env`, JSON, Vault, etc.

- [ ] **Providers**
  - [ ] Map secrets into K8s resources
  - [ ] E.g. OpaqueSecretProvider

- [ ] **SecretRegistry**
  - [ ] Manage multiple SecretManagers
  - [ ] Scale across stacks/domains

#### ℹ️ Advanced Usage

- [ ] **Secret Merge Strategy**
  - [ ] Explain default (autoMerge)
  - [ ] Other strategies: error, overwrite, skip
  - [ ] Real conflict examples

- [ ] **Metadata Injection**
  - [ ] Explain injected metadata:
    - [ ] `stack-id`
    - [ ] `resource-id`
    - [ ] `managed-at`
  - [ ] Benefits in GitOps traceability

- [ ] **Custom Connector**
  - [ ] Show how to implement `load()`
  - [ ] Register with SecretManager
  - [ ] Example: API-based loader

- [ ] **Custom Provider**
  - [ ] Implement custom output format
  - [ ] Example: CRD or third-party format

#### ℹ️ Architecture

- [ ] **Stack Build Flow**
  - [ ] Flow from Stack → ResourceComposer → Output
  - [ ] Emphasize type-safety and no runtime

- [ ] **Secret Orchestration**
  - [ ] Flow: Connector → Provider → Merge → Injection
  - [ ] Use `SecretsOrchestrator`

- [ ] **CLI Execution Flow**
  - [ ] Load config
  - [ ] Init stacks
  - [ ] Execute commands (`generate`, `secret apply`)

- [ ] **Injection System**
  - [ ] Builders generate injection targets
  - [ ] Providers resolve to manifests

#### ℹ️ Contributing

- [ ] **Local Dev Setup**
  - [ ] Monorepo layout
  - [ ] Required tools (pnpm)
  - [ ] Dev scripts

- [ ] **Codebase Structure**
  - [ ] Overview of packages:
    - [ ] `@kubricate/core`
    - [ ] `toolkit`, `cli`, etc.

- [ ] **Testing & Validation**
  - [ ] Test custom stacks/connectors/providers
  - [ ] Unit testing tips and practices

- [ ] **Release Process**
  - [ ] Versioning flow
  - [ ] Publishing to npm
  - [ ] Tagging, changelog generation

- [ ] **Roadmap**
  - [ ] Future features:
    - [ ] hydration
    - [ ] audit CLI
    - [ ] registry plugins

