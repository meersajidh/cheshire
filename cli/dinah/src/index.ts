/**
 * The application-facing module surface. An application imports exactly this
 * from `dinah` — the two contracts and their types — and nothing else. Every
 * other export of this package is CLI internals, reachable only through the
 * `dinah` bin.
 *
 * `defineConfig` says what the application *is*; `defineApp` says what it
 * *contributes*. Both live in `@dinah/core`, and both arrive here so that an
 * application names one package.
 */
export {
  defineConfig,
  type DinahConfig,
  type ResolvedDinahConfig,
  type WindowConfig,
} from '@dinah/core'

export {
  defineApp,
  type AppDefinition,
  type ResolvedApp,
  type ViewContribution,
} from '@dinah/core/views'
