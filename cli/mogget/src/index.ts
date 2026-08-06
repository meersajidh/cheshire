/**
 * The application-facing module surface. An application imports exactly this
 * from `mogget` — the two contracts and their types — and nothing else. Every
 * other export of this package is CLI internals, reachable only through the
 * `mogget` bin.
 *
 * `defineConfig` says what the application *is*; `defineApp` says what it
 * *contributes*. Both live in `@mogget/core`, and both arrive here so that an
 * application names one package.
 */
export {
  defineConfig,
  type MoggetConfig,
  type ResolvedMoggetConfig,
  type WindowConfig,
} from '@mogget/core'

export {
  defineApp,
  type AppDefinition,
  type ResolvedApp,
  type ViewContribution,
} from '@mogget/core/views'
