import { defineConfig } from 'vitepress'
import { shared } from './shared'
import { en } from './en'
export default defineConfig({
  ...shared,
  ignoreDeadLinks: [
    (url) => {
      // Ignore dead links that contain 'localhost'
      return url.toLowerCase().includes('localhost')
    }
  ],
  locales: {
    root: { label: 'English', ...en },
    // th: { label: 'ภาษาไทย', ...th },
  }
})
