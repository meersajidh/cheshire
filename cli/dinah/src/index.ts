/**
 * The application-facing module surface. An application imports exactly this
 * from `dinah` — the config contract and its types — and nothing else. Every
 * other export of this package is CLI internals, reachable only through the
 * `dinah` bin.
 */
export {
  defineConfig,
  type DinahConfig,
  type ResolvedDinahConfig,
  type WindowConfig,
} from '@dinah/core'
