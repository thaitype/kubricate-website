import { defineConfig } from "vitepress";
import { baseSidebar } from "./shared";
import { enReference } from "./en-reference";
import { enAPI } from "./en-api";

import coreTypedocSidebar from "../api/core/typedoc-sidebar.json";
import pluginEnvTypedocSidebar from "../api/plugin-env/typedoc-sidebar.json";
import pluginKubernetesTypedocSidebar from "../api/plugin-kubernetes/typedoc-sidebar.json";
import stacksTypedocSidebar from "../api/stacks/typedoc-sidebar.json";
import toolkitTypedocSidebar from "../api/toolkit/typedoc-sidebar.json";
import kubricateTypedocSidebar from "../api/kubricate/typedoc-sidebar.json";

export const enGuideSidebar = baseSidebar.clone().toSidebarItems();

// https://vitepress.dev/reference/site-config
export const en = defineConfig({
  lang: "en-US",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Guide", link: "/guide/why-kubricate" },
      { text: "Reference", link: "/reference" },
      { text: "API", link: "/api" },
    ],

    sidebar: {
      '/guide/': { base: '/guide/', items: enGuideSidebar },
      '/reference/': { base: '', items: enReference },
      '/api/': { base: '', items: enAPI },
      '/api/core/': { base: '', items: coreTypedocSidebar },
      '/api/plugin-env/': { base: '', items: pluginEnvTypedocSidebar },
      '/api/plugin-kubernetes/': { base: '', items: pluginKubernetesTypedocSidebar },
      '/api/stacks/': { base: '', items: stacksTypedocSidebar },
      '/api/toolkit/': { base: '', items: toolkitTypedocSidebar },
      '/api/kubricate/': { base: '', items: kubricateTypedocSidebar },
    },

    footer: {
      message:
        'Content License under <a href="https://creativecommons.org/licenses/by-nc-nd/4.0/" target="blank">CC BY-NC-ND 4.0</a>',
      copyright: `Copyright © 2025-${new Date().getFullYear()} Thada Wangthammang`,
    },

    editLink: {
      pattern: "https://github.com/thaitype/kubricate-docs/tree/main/docs/v1/:path",
    },
  },
});
