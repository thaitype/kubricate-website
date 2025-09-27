# Repository Guidelines

## Project Structure & Module Organization
Kubricate Docs is versioned per directory. Focus work inside `docs/v1/`, a standalone VitePress site containing `guide/` narrative docs, `reference/` API pages, and `scripts/` maintenance utilities. Shared lint, type, and test presets live under `configs/`. Generated TypeDoc output lands in `docs/v1/api/` and should not be edited by hand. Assets for the site are in `docs/v1/public/`.

## Build, Test, and Development Commands
From `docs/v1/` run `pnpm install` once to sync workspace dependencies. Use `pnpm dev` to generate placeholder API stubs and start VitePress at `http://localhost:5173`. `pnpm build` performs the production build, matching CI. `pnpm preview` serves the built site for smoke testing. Regenerate real API docs only when needed with `pnpm typedoc`, followed by `pnpm post:refine-md`.

## Coding Style & Naming Conventions
All authored content uses Prettier defaults (2-space indent, 120-char wrap, single quotes in TS). Keep Markdown filenames kebab-case, align heading slugs with sidebar usage, and add frontmatter `title` fields for navigation. Custom scripts and configs are TypeScript modules; prefer explicit exports and avoid `any`. Run `pnpm exec prettier --check .` before submitting large changes.

## Testing Guidelines
Vitest is configured via `docs/v1/vitest.config.ts` for any interactive components or utilities. Add tests beside sources as `*.test.ts` files and execute `pnpm vitest run --coverage`. Treat docs previews as part of QA: confirm code fences compile in local dev and ensure navigation links resolve after `pnpm build`.

## Commit & Pull Request Guidelines
Follow Conventional Commits (`feat:`, `fix:`, `docs:`) as seen in `git log`. Group related doc updates in a single commit when possible. PR descriptions should include a short summary, affected pages, verification steps (dev/build command outputs), and screenshots or links for visual changes. Mention linked issues with `Closes #ID` and request review from maintainers when ready.

## Automation & CI Notes
GitHub Actions recreate API docs and run the production build on every push. Avoid committing generated `api/` artifacts unless coordinating a release. If TypeDoc inputs change, ensure `scripts/` utilities still succeed by running `pnpm refine-md:clean && pnpm post:refine-md`.
