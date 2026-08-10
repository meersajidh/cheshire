/**
 * `@cheshire/app` — the application's whole surface onto cheshire.
 *
 * An application imports this name and no other `@cheshire/*` package, ever.
 * `@cheshire/core` and the system packages beside it are the framework's
 * internal factoring, not the application's vocabulary: cheshire is a framework
 * rather than a library, so it presents one surface the way `next/*` and
 * `$app/*` do, instead of shipping a set of packages the developer assembles.
 *
 * Renderer-side API arrives on its own entries as the systems land — `/react`
 * for hooks, `/ui` for components. This barrel stays React-free, because
 * `cheshire.config.ts` is evaluated in Node by `app.ts:loadApp()` through Vite's
 * module runner, which *executes* modules rather than bundling them: nothing is
 * tree-shaken away, so anything reachable from here is genuinely loaded.
 *
 * Every line below is `export *` on purpose. A hand-listed forwarding table
 * drifts silently — a symbol added upstream is simply absent here, with no
 * error anywhere. Forwarding a whole entry cannot drift, and it is safe because
 * the entries are split by audience: a public entry of a framework package is
 * *exactly* its application-facing API, with framework-internal API on a
 * matching `internal` entry that nothing here forwards.
 */
export * from '@cheshire/core'
export * from '@cheshire/core/views'
