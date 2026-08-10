/**
 * `@cheshire/core/views/internal` — validation of what an application
 * contributed, for the shell that consumes it.
 *
 * `resolveApp` runs in the renderer against whatever `src/index.ts` actually
 * exported, and `@cheshire/shell` is its only caller. An application declares
 * with `defineApp` and never validates its own declaration, so neither symbol
 * belongs on the entry `@cheshire/app` forwards.
 *
 * Split from `./internal` on the other axis: this half names React through
 * `ResolvedApp`, and `./internal` must stay loadable from the main process.
 */
export { resolveApp, CheshireAppError } from './contributions.js'
