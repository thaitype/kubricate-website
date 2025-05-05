import { Sidebar } from "@thaitype/vitepress-typed-navbar";

export const enAPI = new Sidebar({
  collapsed: false,
  extraMessage: "🚧",
})
  /**
   * Reference Section
   */
  .addGroup("/api", { text: "API" })
  .add("/api", "index", { text: "All Packages", link: "/", })
  .add("/api", "kubricate", { text: "kubricate", link: "/kubricate" })
  .add("/api", "core", { text: "@kubricate/core", link: "/core" })
  .add("/api", "plugin-env", { text: "@kubricate/plugin-env", link: "/plugin-env" })
  .add("/api", "plugin-kubernetes", { text: "@kubricate/plugin-kubernetes", link: "/plugin-kubernetes" })
  .add("/api", "stacks", { text: "@kubricate/stacks", link: "/stacks" })
  .add("/api", "toolkit", { text: "@kubricate/toolkit", link: "/toolkit" })
  .toSidebarItems()