/**
 * `@cheshire/app` — the application's whole surface onto cheshire.
 *
 * An application imports this name and no other `@cheshire/*` package, ever.
 * `@cheshire/core` and the system packages beside it are the framework's
 * internal factoring, not the application's vocabulary: Cheshire is a framework
 * rather than a library, so it presents one surface the way `next/*` and
 * `$app/*` do, instead of shipping a set of packages the developer assembles.
 *
 * Renderer-side API arrives on its own entries as the systems land — `/react`
 * for hooks, `/ui` for components.
 *
 * **What this barrel must not do is *load* React**, which is not the same rule as
 * `@cheshire/core`'s and is worth keeping distinct. Core's barrel must not
 * *name* React even in its types, because `@cheshire/runtime-electron` imports
 * it from Electron's main process, where an unresolved `react` in a `.d.ts`
 * degrades to `any` under `skipLibCheck` without saying so. Nothing imports
 * this file from the main process.
 *
 * The constraint here is a runtime one. `cheshire.config.ts` is evaluated in
 * Node by `app.ts:loadApp()` through Vite's module runner, which *executes*
 * modules rather than bundling them — so nothing is tree-shaken away and
 * anything reachable from here is genuinely loaded. Forwarding
 * `@cheshire/core/views` is therefore fine despite it naming `ComponentType`:
 * that reference is type-only and erased at build, so the module graph Node
 * actually walks contains no React. Add a *value* import of React anywhere
 * behind this barrel and that stops being true — which is what `/react` and
 * `/ui` exist for.
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
