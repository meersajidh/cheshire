/**
 * `@cheshire/core/internal` — config API the framework uses and an application
 * never names.
 *
 * `resolveConfig` runs once per launch, inside `@cheshire/cli` and inside
 * `@cheshire/runtime-electron`; an application writes `defineConfig` and hands
 * the result over. Keeping it off the public entry is what makes
 * `@cheshire/app`'s `export *` safe: the facade forwards a whole entry, so
 * "what is public" has to be decided where the API lives.
 *
 * This entry is published, because framework packages resolve it through the
 * same `exports` map an application would. What keeps it out of reach is one
 * step further out: `@cheshire/app` has no `./internal` subpath and does not
 * re-export from this file, so nothing an application *depends on* leads here.
 * Getting at it means naming `@cheshire/core` directly — a package the
 * application never declared — which is a deliberate act, not a slip.
 *
 * React-free, like the barrel: `@cheshire/runtime-electron` imports this from
 * the main process. The contribution half is `./views/internal`.
 */
export { resolveConfig, CheshireConfigError } from './config.js'
