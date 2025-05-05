# kubricate-docs

This repository hosts the documentation for **Kubricate**, supporting multiple versions of the project.
Each version is managed independently and has its own dedicated structure, tools, and setup.

## Build Status

| Version | Docs Path | Build Status                                                                                                                                                                |
| ------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| v1      | `docs/v1` | [![Build v1](https://github.com/thaitype/kubricate-docs/actions/workflows/docs-v1.yml/badge.svg)](https://github.com/thaitype/kubricate-docs/actions/workflows/docs-v1.yml) |


## Repository Structure

Each version lives in its own directory (e.g., `docs/v1/`) and is treated as a standalone VitePress project.
We recommend working inside a specific version only when contributing.

### Available Versions

* [Version 1 (v1)](./docs/v1/) – Actively maintained

  > See [`docs/v1/README.md`](./docs/v1/README.md) for details on setup and structure

## Quick Start (for v1)

To run version 1 locally:

```bash
cd docs/v1
pnpm install
pnpm dev
```

The docs will be available at [http://localhost:5173](http://localhost:5173)

## Contributing

We welcome contributions of all kinds — from fixing typos and improving clarity to writing new guides or refining API documentation.

To contribute:

1. Fork this repo
2. Pick a version (e.g. `docs/v1/`)
3. Follow the local setup guide in that version's README
4. Open a Pull Request

If you're unsure where to start, feel free to open an issue first and ask questions!

## License

This project is licensed under the [Apache License 2.0](./LICENSE).
All documentation, scripts, and related materials fall under this license unless otherwise noted.
