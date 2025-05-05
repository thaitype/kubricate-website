# 📚 Kubricate Docs (v1)

Documentation site for the **Kubricate Framework**, version 1.

This repository contains the source files and scripts used to generate the documentation, including both manual guides and auto-generated API references.

## 👋 For Contributors

Welcome!
If you'd like to help improve or contribute to the documentation, this is the right place.
This directory (`docs/v1/`) focuses on the first major version of Kubricate Docs.

## 🚀 Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start local dev server

```bash
pnpm dev
```

This will:

* Generate placeholder files for API docs (if not already present)
* Start [VitePress](https://vitepress.dev/) in dev mode

> Access your local docs at: [http://localhost:5173](http://localhost:5173)

## ⚙️ Dev Notes

During local development, you **don't need to run the full TypeDoc generation** process. This helps save time and avoid unnecessary computation while editing content or writing guides.

When you run:

```bash
pnpm dev
```

It will generate **TypeDoc placeholder files** to prevent errors when navigating API links or writing docs that reference API paths. These are lightweight stubs — not the actual API documentation.

> The **real TypeDoc output** is only generated during the CI/CD process (via GitHub Actions) when building the site for deployment.

This separation keeps the local experience fast and smooth, while ensuring production builds always include the latest API docs.

## 📦 Build Documentation

To build the site for production:

```bash
pnpm build
```

To preview the built site locally:

```bash
pnpm preview
```

## 🛠️ How It Works

### 1. API Reference (via TypeDoc)

API docs are generated using [TypeDoc](https://typedoc.org) with separate config files per package.

Run:

```bash
pnpm typedoc
```

This will generate documentation for each module:

* `@kubricate/core`
* `@kubricate/plugin-env`
* `@kubricate/plugin-kubernetes`
* `@kubricate/stacks`
* `@kubricate/toolkit`
* `kubricate (CLI)`

Output goes into `docs/v1/api/`.

Example internal scripts used:

```jsonc
"pre:core": "typedoc --out api/core --options typedoc.core.json --name @kubricate/core",
"typedoc": "run-s setup-repo pre:* post:*"
```

### 2. Markdown Refinement Scripts

We use a custom script to clean or patch generated markdown files.

Available commands:

```bash
pnpm refine-md:placeholder   # Add placeholder headers
pnpm refine-md:clean         # Remove unused markers
pnpm post:refine-md          # Refine after TypeDoc
```

## 🔁 GitHub Actions Integration

This is how docs are built in CI:

```yaml
- name: Generate API Docs
  run: pnpm typedoc
  working-directory: ${{ env.DOCS_PATH }}

- name: Doc Build
  run: pnpm build
  working-directory: ${{ env.DOCS_PATH }}
```

## 🙌 Thanks for Contributing!

We appreciate your help in making Kubricate easier to understand.
If you spot anything broken, confusing, or missing — feel free to open a pull request or create an issue 💬
