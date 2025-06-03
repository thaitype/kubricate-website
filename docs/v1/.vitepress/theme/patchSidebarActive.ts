import type { App } from 'vue'
import { useRoute } from 'vitepress'
import { watch } from 'vue'

/**
 * Automatically adds `.is-active` class to the sidebar item
 * that matches the current route.
 *
 * This function registers a Vue global mixin that watches
 * the route path and updates the sidebar DOM accordingly.
 *
 * @param app - The Vue app instance from VitePress `enhanceApp`
 */
export function setupSidebarActiveStatePatch(app: App) {
  app.mixin({
    mounted() {
      const route = useRoute()

      const updateSidebarActive = () => {
        document.querySelectorAll('.VPSidebarItem.is-link')?.forEach((el) => {
          el.classList.remove('is-active')
        })

        document.querySelectorAll<HTMLAnchorElement>('.VPSidebarItem.is-link a')?.forEach((a) => {
          if (a.getAttribute('href') === route.path) {
            a.closest('.VPSidebarItem')?.classList.add('is-active')
          }
        })
      }

      updateSidebarActive()

      watch(() => route.path, () => {
        updateSidebarActive()
      })
    }
  })
}