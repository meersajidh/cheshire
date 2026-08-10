/**
 * `@cheshire/core` — the application-facing config API, and nothing else.
 *
 * Entries here split on two axes at once, and both splits are load-bearing.
 *
 * **By audience.** A public entry is *exactly* what an application may name;
 * everything the framework keeps to itself lives on an `internal` entry that no
 * `exports` path makes reachable from an application. That is what lets
 * `@cheshire/app` be `export *` from the public entries — complete by
 * construction, with no forwarding list to keep in sync, and no way to leak an
 * internal on the way through.
 *
 * **By runtime environment.** This barrel stays React-free because
 * `@cheshire/runtime-electron` imports it from the main process. The
 * contribution contract names React's `ComponentType`, so it sits on `./views`.
 * With `skipLibCheck` on, an unresolved `react` in a `.d.ts` degrades to `any`
 * in silence rather than failing — so the two never share an entry.
 */
export {
  defineConfig,
  type CheshireConfig,
  type ResolvedCheshireConfig,
  type WindowConfig,
} from './config.js'
