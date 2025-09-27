# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the documentation website for [Kubricate](https://github.com/thaitype/kubricate), a TypeScript-based tool for building Kubernetes infrastructure. The repository hosts multiple versions of documentation, with the current active version being v1.

## Repository Structure

- **Monorepo**: Uses pnpm workspaces with Turbo for build orchestration
- **Main documentation**: Located in `docs/v1/` (VitePress-based)
- **Shared configs**: Located in `configs/` for ESLint, TypeScript, and Vitest
- **Examples**: Located in `examples/v1/`

### Key Architecture Points

- Each version of docs is a standalone VitePress project
- API documentation is auto-generated using TypeDoc from the main Kubricate packages
- The docs pull in live API references for multiple packages: `@kubricate/core`, `@kubricate/plugin-env`, `@kubricate/plugin-kubernetes`, `@kubricate/stacks`, `@kubricate/toolkit`, and the `kubricate` CLI

## Development Commands

### Root Level Commands
- `pnpm graph` - Generate dependency graph using Nx

### Documentation (docs/v1)
- `pnpm dev` - Start local dev server with placeholder API docs
- `pnpm build` - Build production site
- `pnpm preview` - Preview built site locally
- `pnpm typedoc` - Generate full API documentation (CI only, not needed locally)

### Turbo Tasks (available across workspace)
- `turbo build` - Build all packages
- `turbo test` - Run tests across packages
- `turbo lint:check` - Check linting
- `turbo lint:fix` - Fix linting issues
- `turbo format:check` - Check formatting
- `turbo format:fix` - Fix formatting
- `turbo check-types` - Type checking

## Working with Documentation

### Local Development
When developing docs locally, you only need `pnpm dev` in the `docs/v1/` directory. This generates lightweight placeholder files for API docs to prevent navigation errors, while keeping the development experience fast.

### API Documentation Generation
Full TypeDoc generation happens only in CI/CD. The process:
1. `pnpm typedoc` - Generates docs for all Kubricate packages
2. Custom refinement scripts clean and enhance the generated markdown
3. VitePress builds the final site

### Package Scripts (docs/v1)
- `refine-md:placeholder` - Add placeholder headers for local dev
- `refine-md:clean` - Remove unused markers
- `setup-repo` - Initialize repository for doc generation

## CI/CD Integration

The site builds automatically on pushes to `main` affecting `docs/v1/**` files:
1. Install dependencies with pnpm
2. Generate API docs with TypeDoc
3. Build documentation site
4. Deploy to Azure Static Web Apps

## Configuration Files

- `pnpm-workspace.yaml` - Defines workspace packages
- `turbo.json` - Build pipeline configuration
- `docs/v1/typedoc.*.json` - TypeDoc configurations per package
- Individual package.json files in `configs/` for shared tooling

## Key Dependencies

- **VitePress** - Documentation site generator
- **TypeDoc** - API documentation generation
- **Turbo** - Build system orchestration
- **pnpm** - Package management with workspaces

## Development Notes

- The codebase uses TypeScript throughout
- Prettier formatting with specific config in root package.json
- ESLint configurations are shared across packages
- Node.js >=22 is required
- Package manager: pnpm@10.5.2