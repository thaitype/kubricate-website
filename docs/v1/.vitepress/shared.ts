import { defineConfig, type HeadConfig } from "vitepress";
import { transformerTwoslash } from "@shikijs/vitepress-twoslash";
import { Sidebar } from "@thaitype/vitepress-typed-navbar";

export const shared = defineConfig({
  lastUpdated: true,
  cleanUrls: true,
  title: "Kubricate",
  description: "A TypeScript framework for building reusable, type-safe Kubernetes infrastructure — without the YAML mess.",
  markdown: {
    codeTransformers: [transformerTwoslash()],
  },

  themeConfig: {

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/thaitype/kubricate",
      },
    ],
    search: {
      provider: "local",
    },
  },

  head: [...googleFonts(), ...googleAnalytics("")],
});

/**
 * Add Google Analytics
 * @ref https://vitepress.dev/reference/site-config#example-using-google-analytics
 * @param tagManagerId
 * @returns
 */
function googleAnalytics(tagManagerId: string): HeadConfig[] {
  return [
    ["script", { async: "", src: `https://www.googletagmanager.com/gtag/js?id=${tagManagerId}` }],
    [
      "script",
      {},
      `window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${tagManagerId}');`,
    ],
  ];
}

function googleFonts(): HeadConfig[] {
  return [
    ["link", { rel: "preconnect", href: "https://fonts.googleapis.com" }],
    ["link", { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" }],
    // Enable when Thai font is needed
    // [
    //   "link",
    //   { href: "https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@100..900&display=swap", rel: "stylesheet" },
    // ],
    [
      "link",
      { href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap", rel: "stylesheet" },
    ]
  ];
}

export const baseSidebar = new Sidebar({
  collapsed: false,
  extraMessage: "🚧",
})
  /**
   * Introduction Section
   */
  .addGroup("/", { text: "Introduction" })
  .add("/", "why-kubricate", { text: "Why Kubricate", link: "why-kubricate" })
  .add("/", "getting-started", { text: "Getting Started", link: "getting-started" })
  .add("/", "llm", { text: "LLM", link: "llm" })
  /**
   * Tutorials Section
   */
  .addGroup("/tutorials", { text: "Tutorials" })
  .add("/tutorials", "understand-the-workflow", { text: "Understand the Workflow", link: "understand-the-workflow" })
  .add("/tutorials", "start-from-template", { text: "Start from Template", link: "start-from-template" })
  .add("/tutorials", "generate-and-apply", { text: "Generate & Apply", link: "generate-and-apply" })
  .add("/tutorials", "build-your-template", { text: "Build Your Template", link: "build-your-template" })
  .add("/tutorials", "working-with-secrets", { text: "Working with Secrets", link: "working-with-secrets" })

  /**
   * How-to Guides Section
   */
  .addGroup("/how-to-guides", { text: "How-to Guides" })
  .add("/how-to-guides", "working-with-secret-manager", { text: "Use Env with SecretManager", link: "working-with-secret-manager" })
  .add("/how-to-guides", "scaling-with-secret-registry", { text: "Multiple SecretManagers", link: "scaling-with-secret-registry" })
  .add("/how-to-guides", "setup-docker-registry-auth", { text: "Docker Registry Auth", link: "setup-docker-registry-auth" })
  .add("/how-to-guides", "stack-output-mode", { text: "Stack Output Modes", link: "stack-output-mode" })
  .add("/how-to-guides", "config-overrides", { text: "Template Overrides", link: "config-overrides" })
  .add("/how-to-guides", "inject-secrets-sidecar", { text: "Inject Secrets to Sidecar", link: "inject-secrets-sidecar" })
  .add("/how-to-guides", "inject-secrets-cronjob", { text: "Inject Secrets to CronJob", link: "inject-secrets-cronjob" })
  .add("/how-to-guides", "debug-secret-injection-failures", { text: "Debug Secret Injection", link: "debug-secret-injection-failures" })

