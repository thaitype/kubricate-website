import { Sidebar } from "@thaitype/vitepress-typed-navbar";

export const enReference = new Sidebar({
  collapsed: false,
  extraMessage: "🚧",
})
  /**
   * Introduction Section
   */
  .addGroup("/", { text: "Introduction" })
  .add("/", "overview", { text: "Overview", link: "/overview" })

  .toSidebarItems()