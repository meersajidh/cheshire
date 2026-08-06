import { defineApp } from '@cheshire/app'
import { Welcome } from './views/Welcome'

/**
 * Your application starts here.
 *
 * Everything under `src/` is yours. cheshire supplies the window, the shell, the
 * build and the packaging — you supply the domain. There is no process entry to
 * write, no Electron or Vite config to keep, and no runtime API to call. The two
 * files the framework reads from you are `cheshire.config.ts`, which says what this
 * application *is*, and this one, which says what it *contributes*.
 */
export default defineApp({
  views: [{ id: 'welcome', title: 'Welcome', component: Welcome }],
})
