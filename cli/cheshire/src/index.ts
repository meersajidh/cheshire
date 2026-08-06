/**
 * The application-facing module surface. An application imports exactly this
 * from `cheshire` — the two contracts and their types — and nothing else. Every
 * other export of this package is CLI internals, reachable only through the
 * `cheshire` bin.
 *
 * `defineConfig` says what the application *is*; `defineApp` says what it
 * *contributes*. Both live in `@cheshire/core`, and both arrive here so that an
 * application names one package.
 */
export {
  defineConfig,
  type CheshireConfig,
  type ResolvedCheshireConfig,
  type WindowConfig,
} from '@cheshire/core'

export {
  defineApp,
  type AppDefinition,
  type ResolvedApp,
  type ViewContribution,
} from '@cheshire/core/views'
