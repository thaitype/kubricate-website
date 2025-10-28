import { Sidebar } from "@thaitype/vitepress-typed-navbar";


// ❯ tree .
// .
// ├── big-picture
// │   ├── 01-architecture-overview.md
// │   ├── 02-user-workflows-cli.md
// │   ├── 03-secrets-overview.md
// │   └── 04-extensibility-and-monorepo.md
// ├── index.md
// └── secrets
//     ├── 00-vision-overview.md
//     ├── 01-architecture-big-picture.md
//     ├── 02-lifecycle.md
//     ├── 03-core-concepts.md
//     ├── 04-connectors.md
//     ├── 05-providers.md
//     ├── 06-injection-strategies.md
//     ├── 07-validation.md
//     ├── 08-conflicts-merging.md
//     ├── 09-extensibility.md
//     └── 10-testing-best-practices.md

export const enReference = new Sidebar({
  collapsed: false,
  extraMessage: "🚧",
})
  /**
   * Big Picture Section
   */
  .addGroup("/", { text: "Big Picture" })
  .add("/", "architecture", { text: "Architecture", link: "/reference/big-picture/01-architecture-overview" })
  .add("/", "user-workflows-cli", { text: "User Workflows (CLI)", link: "/reference/big-picture/02-user-workflows-cli" })
  

  .toSidebarItems()