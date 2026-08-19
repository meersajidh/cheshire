# Cheshire — Design & Roadmap

> **Version:** 0.1 (living document) · **Date:** 2026-08-03
>
> Upstream: [principles.md](principles.md). This document describes how Cheshire is structured
> and built; the principles say what is true at all times. Where the two disagree, the
> principles win or are amended explicitly.
>
> Downstream: `docs/references/` —
> [framework-architecture.md](references/framework-architecture.md) explains the framework pattern
> this structure is an instance of, [codebase-tour.md](references/codebase-tour.md) walks the code
> that implements it, and a reference per system settles that system's mechanics. References are
> deep dives, read when a question needs one; they never decide anything upstream of themselves.

---

## 1. Purpose

Cheshire is a **platform for building desktop applications** created with a single command:

```bash
pnpm create cheshire my-app
```

After that command, a developer has a fully configured, runnable desktop application infrastructure and spends their time in `src/`, building their domain.

## 2. Vision

Cheshire provides pre-made tools and services so apps do not build common features from scratch every single time. This saves time and effort for software teams.

### Key Features

- **Core Services:** Ready-to-use functions like user login, data storage, and security
- **Reusable Code:** Common building blocks shared across different programs.
- **Faster Setup:** Quick tools to launch new projects without extra setup work.
- **Standard Rules:** Clear guides that help different systems work together easily

### Technical Foundations

- Language platform (TypeScript)
- UI framework (React first)
- Runtime integration (Electron first)
- Package management (pnpm, pinned via `packageManager`)
- Dev toolset (Vite, fully configured)
- Cli and configuration for build, packaging, and distribution

## 3. Capabilities

**Systems** are capabilities an application _declares into_, never implements itself. Each is reached through named **services**.

- An application says a command exists; it does not write a shortcut matcher, a menu bar, or a palette.

- It says a view exists; it does not write docking or layout persistence.

- It picks tokens; it does not write a theme switcher.

<br/>

| System                   | Services                                                            |
| ------------------------ | ------------------------------------------------------------------- |
| **design system**        | components · icons · the design-token contract · light/dark modes   |
| **command system**       | commands · keyboard shortcuts · menus · context menus · the palette |
| **shell system**         | layout · notifications · dialogs · window chrome · status bar        |
| **settings system**      | schema · preferences                                                |
| **storage system**       | db · blob stores                                                    |
| **identity system**      | auth · credentials                                                  |
| **devtools system**      | diagnostics _(ships)_ · developer tooling _(dev-only, stripped)_    |

## 4. What Cheshire ships, and what an application supplies

Cheshire is framework developer's domain: packages, template, CLI, docs. Its user is an application developer.

```
            publishes                  generates
Framework ────────────▶ npm packages ────────────▶ Applications
```

A generated application contains no framework source — only `@cheshire/*` dependencies. It depends on released packages, never on framework source (principle 5).

### The four modules

There are four modules, three live in the framework repository while the playground lives in its own.

```
                      Cheshire
                         │
     ┌───────────┬───────┴──────┬────────────────┐
     ▼           ▼              ▼                ▼
  Packages    Template         CLI          Playground
 (cheshire)  (cheshire)     (cheshire)    (play-cheshire)
```

#### Packages

**Packages** contain the framework code itself, published under the `@cheshire/*` scope.

- `@cheshire/app` is the application's whole surface onto Cheshire: what it declares, and how it reaches services.
- An application imports that name and no other `@cheshire/*` package, ever (like frameworks with a socket model `next/*`, `astro:*`, etc.).
- `create-cheshire` is run once, by `pnpm create cheshire`, and is not a dependency afterwards.
- `@cheshire/cli` supplies the `cheshire` command and exports nothing at all; it is a devDependency **for a verb, never for a symbol**.
- The framework's internal factoring (tentative):

  ```
  @cheshire/core           @cheshire/react          @cheshire/ui
  @cheshire/shell          @cheshire/layout         @cheshire/commands
  @cheshire/settings                                @cheshire/storage
  @cheshire/identity       @cheshire/devtools       @cheshire/runtime-*
  @cheshire/host
  ```

  _Packages are the delivery unit while Systems are the unit of functionality, and one system may span several packages._

##### Consumption Surfaces (API x Runtime)

Each package sorts its API into two entries

- `public` entry holds what an application may use
- `internal` entry holds what only the framework uses.

`@cheshire/app` re-exports (`export *`) the `public` entries and never the `internal` ones. Therefore "what is public" is decided by where the API lives, by whoever writes it, rather than in a list in another package that drifts.

A second split, by runtime environment, cuts across the API separation.

`@cheshire/runtime-electron` imports `@cheshire/core`'s main entry from Electron's `main` process, where `React` has no place — so anything touching `React` sits on its own entry instead.

`@cheshire/core` shows all four: `.` and `./internal` are React-free and `./views` and `./views/internal` are not.

> **Why React in the main process is bad?**
>
> The real reason is sharper than "has no place":
>
> > A .d.ts that names `react` where React cannot be resolved does not fail — under `skipLibCheck` it silently degrades to `any`.
>
> ---
>
> Worth noticing the two splits fail in opposite directions, which is why they need separate names and can't be collapsed into one rule.
>
> - Break the audience split — forward an internal entry — and you get a loud failure eventually: someone depends on API you meant to change freely, and it breaks visibly on the next version.
> - Break the environment split — let React into an entry main imports — and nothing fails at all. Types quietly become any, and you find out much later when something that should have been a compile error wasn't.
>
> That asymmetry is the argument for the internal suffix being visible in the specifier. The audience rule is enforced by a name a human reads; the environment rule has nothing enforcing it but the rule itself.
>
> ---

#### Template

A template is an **opinionated blueprint**: a specific configuration of the systems Cheshire encapsulates, plus the contributions and labels that suit a shape of application. Unless otherwise stated `create-cheshire` materialises the default template into a generated app.

`workbench` — VS Code-like — is the first and currently only template. The named next shapes are `chat` (Slack-like) and `community` (Discord-like).

Templates differ in **which systems are switched on and what things are called** — one, for ex., may carry structured storage, another only blobs, and another just the layout.

**A template's choices are declared in `cheshire.config.ts`**, which makes the template a _preset over the config contract_ rather than a parallel mechanism:

```ts
// generated by the `chat` template
export default defineConfig({
	appId: "com.acme.chat",
	productName: "Acme Chat",
	window: { width: 1280, height: 800 },
	services: {
		storage: { blob: true }, // no structured DB
		auth: { provider: "oauth" },
	},
});
```

A developer who later wants a database **adds the declaration**, rather than discovering that re-scaffolding was the only way to get it. Nothing a template chose is invisible or unreachable afterwards.

##### One Shell, Re-labeled

A chat app is not a different workbench — it is the same regions under different names:

| `workbench`        | `chat`       |
| ------------------ | ------------ |
| activity bar       | servers      |
| primary side bar   | channels     |
| editor area        | message view |
| auxiliary side bar | members      |
| panel              | _(off)_      |
| status bar         | presence     |

`@cheshire/shell` is general rather than IDE-shaped, and `workbench` or `chat` is the name of a _template_, not of the package that draws it.

#### CLI: Two responsibilities, Two tools

##### `create-cheshire`:

- Used for project generation only:
  - ask the project name, copy the template, replace placeholders, install dependencies, `git init`, print next steps. Nothing more.
- Cheshire chooses `pnpm`, the way it chooses `Electron`, `React` and `Vite`.
  - One package manager means one lockfile format and one resolution algorithm behind every generated application.
  - `create-cheshire` installs with pnpm regardless of what invoked the generator, and the generated manifest pins the version in `packageManager` so corepack agrees.
- Two settings in the generated `pnpm-workspace.yaml` follow from that choice rather than from Electron.
  - `nodeLinker: hoisted`, and `allowBuilds: { electron: true }`
  - `pnpm 10+` gates a dependency's install scripts. `npm` and `yarn` need neither — they hoist by default and run install scripts by default.
  - Both settings give `pnpm` the behaviour Cheshire needs; neither compensates for something the other tools lack.
- `hoisted` is set for two separate reasons, and only the first is about Windows.
  1.  **Packaging.** On Windows the default layout links packages with junctions, and electron-builder does not follow them when collecting binaries — so the packaged app ships incomplete.
  2.  **Resolution.** `cheshire dev` writes entry files into `.cheshire/`, and those files import `@cheshire/shell` and `@cheshire/runtime-electron` by name. The application never declares those packages; `@cheshire/cli` does, because it writes the imports. They resolve only because hoisted puts every package flat in the application's own `node_modules/`.

  Measured by installing one generated application both ways. Under the default (`nodeLinker: isolated`) the install still succeeds — `node_modules/@cheshire/` holds just the two packages the manifest declares — and the failure arrives a step later, at build: `error TS2307: Cannot find module '@cheshire/shell'`.

##### `@cheshire/cli`:

- The framework tooling an application uses day to day: `dev`, `build`,
  `package`.
- Owned and shipped by the framework, so application authors never configure Electron or Vite targets themselves.
- It installs the `cheshire` bin and exports nothing: an application depends on it for a command, never for an import. That is why it is a `devDependency` while `@cheshire/app` is a `dependency`.

> Tooling is part of the framework. The generated application's `package.json` scripts call `cheshire`, and the framework owns what those verbs mean.

#### Playground — external repository `play-cheshire`

Development application(s) whose purpose is to dogfood the framework. Mostly mocking some domain; it exercises menus, docking, the command palette, theming — the platform surface itself.

Two reasons it's an external repository:

- **Module Resolution**: It installs Cheshire from the local registry — exactly what a real developer gets. Never a workspace link: links resolve source paths and hide packaging failures.
- **Settings Inheritance**: The proximity imparts silently inherited settings. Therefore a gate must live outside the framework repository.
  > For ex. Imagine the playground app is inside the framework repository:
  >
  > - The framework's `allowBuilds: { electron: true }` would reach it
  > - Even if the template shipped no such `allowlist`, every gate would still pass
  > - The first app generated outside the repo would install cleanly
  > - But it would have no `Electron` binary to launch, because `pnpm 10+` skips a dependency's install scripts unless **allowlisted**.

## 5. Repository structure

### Framework repository:

```
cheshire/
├── packages
│  ├── app/                @cheshire/app — the application's whole import surface
│  ├── cli/                @cheshire/cli — the `cheshire` bin; exports nothing
│  ├── core/               @cheshire/core
│  ├── create-cheshire/    create-cheshire
│  ├── runtime-electron/   @cheshire/runtime-electron
│  └── shell/              @cheshire/shell
├── templates/
│   └── workbench/         a blueprint; default
├── docs/
├── scripts/
│   └── check-layout.mjs
├── eslint.config.js
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── vitest.config.ts
```

- **A package's directory basename is its name with the scope stripped.** Flat, one level, no exceptions — stripping an absent scope is a no-op, so unscoped `create-cheshire` obeys the same rule as `@cheshire/runtime-electron`.
- `pnpm-workspace.yaml` is therefore a single `packages/*` glob, and `scripts/check-layout.mjs` fails the build if a directory and its package name ever disagree.

  > The rule exists because the previous layout drifted exactly that way: `cli/cheshire/` published as `@cheshire/app`, reading as tooling on disk and as an application surface on npm. Nothing failed, because a directory name reaches no consumer — only a reader.

### Playground repository:

```
play-cheshire/
└── apps/
```

- Separate repository, external to framework
- Installs Cheshire like any consumer

## 6. Package responsibilities

Packages are the delivery unit; **systems** are the unit of functionality. One system may span several packages, and one package may serve more than one system — the mapping is noted where it is not obvious.

This decomposition is **fairly settled**

- The list is the shape — ambitious and vision-driven — decided by the reasoning in each entry below.
- What varies is only whether a package has been **built**: a name appears on npm when there is something to install behind it.
  > Marked as in [the application surface](application-surface.md): ✅ built · ◐ in progress ·○ planned.
- The first two entries are the only packages an application names. Everything after them is **internal factoring**

### app ✅:

- The application's **whole surface onto Cheshire**, and the only `@cheshire/*` package an application imports.
- It is `export *` from each system package's public entry rather than a
  curated list, so it cannot drift out of date with what those packages expose.
- It carries no toolchain: its one dependency today is `core`, and it gains each system package as that system lands.
- Its entries follow the systems — `.` for declarations, `/react` for hooks, `/ui` for components — which is what keeps the barrel React-free for the process that evaluates `cheshire.config.ts`.

### cli ✅:

- The `cheshire` command: `dev`, `build`, `package`.
- It **exports nothing**; an application depends on it for a verb, never for a symbol, which is why it is a `devDependency` while `app` is a `dependency`.
- It owns the generated entry files, the `Vite` configuration for both
  processes, and the `electron-builder` invocation — none of which an application authors

### core ✅:

- **Foundational services**: lifecycle, events, logging, configuration, dependency injection.
- Also the two contracts an application declares against: the config contract and the contribution contract.
- Its four entries show both axes of the entry rule at once — `.` and
  `./internal` stay React-free because the main process imports them, while `./views` and `./views/internal` carry the contribution contract, which names React.
- On each axis the public half is what an application may declare against, and the `internal` half is the framework's
  > `defineConfig` and `defineApp` are public, `resolveConfig` and `resolveApp` are not.

### react ○ phase 2:

- How an application reaches a service: **one typed hook per service**.
  `useCommands()`, `useSettings()`, `useTheme()`.
- The hooks are written here and an application imports them from `@cheshire/app/react`; the package name is where they live, not where they are reached.
- No service ids, no registry, no provider to learn — autocomplete finds the surface and a missing provider is a type error.
  > Both prior attempts used a service locator (`useService(CommandServiceId)`) over ~30 services; Cheshire has an order of magnitude fewer, so the indirection buys nothing and costs every reader a hop.
- This is the _service-facing_ API surface, deliberately not the component-facing one — that is `ui`.

### ui ○ phase 2–3:

- **The design system**, reached by an application as `@cheshire/app/ui`.
- Accessible primitives (shadcn-derived, vendored and shipped built), Cheshire's own primitives (`Icon` and its registry, `ResizeHandle`), `cn`, and the design token contract.
- **Two token layers and deliberately not three:** the shadcn CSS-var contract as
  real `:root` / `.dark` custom properties, plus an extension layer for what the contract has no equivalent for — type scale, spacing, shadows, chrome heights.
- **The palette is neutral on purpose:** Cheshire ships the token _contract_ and a neutral default, never a visual identity; an application supplies its own CSS-var block. A palette that lands application-shaped stays that way.

### shell ✅:

- **the shell system**, and the root of the renderer.
- Its anatomy is three vertical zones
  - **Title Bar** — window controls, product name, quick toggles
  - **Body**
  - **Status Bar**
  - Plus an overlay plane above all three for _notifications, dialogs and toasts_.
- **The body holds the regions**: activity bar, primary and auxiliary side bars, editor area, panel.
- **Which regions exist is not fixed** — a template may have no activity bar and no panel at all; that is the layout service's call, not the shell's.

### layout ○ phase 2:

- The shell system's layout service.
- Large enough for its own package: which regions exist, their visibility and sizes, docking, split views, and persistence across restarts.

### commands ◐ stage 2b

- **The command system.** Command registry, keyboard shortcuts, menus and context menus, the command palette, and the keyboard-shortcuts editor.
- Menus belong here rather than in the shell because **a menu item is a command reference** — it resolves its title, its shortcut and its enablement from the registry, and never holds a handler.

### settings ○ phase 3

- **The settings system**: selection over the option spaces the other systems define. It selects among options; it does not add them.
- It does not own the other systems' defaults — it **aggregates** them.
- The command system owns the keybinding registry and an application's default shortcuts. The settings system owns the resolved value, the single persistence layer, and the UI. Same for theme selection and region sizes.
- A setting is an option space, a default, and whether the next level may change it. All three inherit **platform → application → user**.
- **Only the user level is persisted**, so the three levels are not three stores. Platform and application defaults are constants compiled into their packages and are never written anywhere.
- **The store runs in main.** It is alive before the renderer, and alive whether or not a template declares a host. The renderer and the host read resolved values through their own service.
- **Layout state is not settings** and does not share the store. It is machine-written and the layout service owns it.

### storage ○ phase 3

- **The storage system**: a `db` service (schema, migrations, queries,transactions) and a `blob` service (large binary content addressed by id, off the record path).
- Host-side. A template may switch on either, both, or neither.

### identity ○ phase 3

- **The identity system**: an `auth` service (sessions, sign-in, providers) and a `credentials` service (OS keychain, secrets at rest).
- Separate from storage because a keychain is storage-_shaped_ but identity-_purposed_: an application that wants sign-in and no database should not have to declare storage to get it.

### devtools ○ planned

- **The devtools system**, in two halves that must not be confused.
  - **Diagnostics ships**: logging, crash capture, and a log viewer — a user's bug report is worthless without them.
  - **Developer tooling does not**: the component gallery, a contribution inspector, the Electron devtools shortcut.
- The split is a build gate, not a convention; the same class of mistake as `--no-sandbox` reaching a packaged build.

### runtime ✅

- Runtime-specific implementations, `runtime-electron` first: window creation, native dialogs, native menus, auto-update.
- Safe renderer–main IPC is an internal detail here, not a package. Applications never import this directly

### host ○ phase 3

- The application's own backend process and the channel Cheshire brokers to it.
- See [the application surface](application-surface.md) §4 for why it is a third process rather than code in main.

## 7. The generated application

An application developer spends nearly all their time in `src/`:

```
my-app/
├── src/
│   ├── index.ts          # the contribution contract — default-exports defineApp({ ... })
│   ├── features/
│   ├── views/
│   ├── commands/
│   ├── menus/
│   └── services/
├── package.json          # scripts call the cheshire CLI
└── cheshire.config.ts    # the config contract (principle 2)
```

- What the application does **not** contain:
  - a process entry file,
  - Electron/Vite config,
  - a build pipeline,
  - or any reference to the runtime.
- Cheshire owns the entry and generates what the entry needs
- The application seats into the socket via two files:
  - `cheshire.config.ts` — says what it _is_,
  - `src/index.ts` — says what it _contributes_.
- The `src/index.ts` is the app's own file: the generated renderer imports it, and never writes it.

> The full surface an application eventually meets — every contribution kind, the host process, and the platform services — is [the application surface](application-surface.md).

## 8. Development flow

```
Feature idea
   ▼
Implement framework API        (cheshire repo)
   ▼
Exercise it in the playground  (play-cheshire, installed from the local registry)
   ▼
Improve the API — repeat
   ▼
Publish packages
   ▼
Release CLI
```

The playground is never the product. It is the proving ground.

**The proof gate:** before a milestone closes, the loop
`registry:publish → create-cheshire --registry → build → smoke test` runs against the real
artifacts. The application generated from the registry is the ground truth; the playground is
for speed.

## 9. Bootstrapping flow

```
Developer
   ▼
pnpm create cheshire my-app
   ▼
create-cheshire: copy template → rename → update package.json → install → git init
   ▼
cd my-app && pnpm run dev     # invokes the cheshire CLI
   ▼
A workbench window opens. Ready.
```

## 10. Versioning and the two publishes

### Packages follow semantic versioning

`create-cheshire` always generates projects against a compatible, tested set of `@cheshire/*` versions — a generated app never starts life on a mismatched matrix.

### All six packages move together

They cross-reference with `workspace:^`, and `create-cheshire` stamps _its own_ version into the application it generates (`create-cheshire/src/cli.ts:versions()`).

A release where one package lags is a generated application asking for a version that does not
exist.

### There are two publishes

|              | **Development**                                     | **Release**                                                    |
| ------------ | --------------------------------------------------- | -------------------------------------------------------------- |
| Command      | `pnpm registry:publish`                             | `pnpm -r publish`                                              |
| Target       | local Verdaccio, `http://localhost:4873`            | npmjs.org                                                      |
| Version      | `<next patch>-dev.<timestamp>`, stamped per publish | the real version in the manifests                              |
| Permanence   | disposable — `registry:reset` forgets everything    | permanent; 72-hour unpublish window, then the number is burned |
| Builds first | yes                                                 | **no**                                                         |
| How often    | every iteration                                     | at a milestone                                                 |

#### Development

- `pnpm registry:publish`
- The whole consumer loop, and the only way Cheshire reaches a consumer during development.
- `registry:start` runs Verdaccio in the foreground; `registry:publish` builds all six, stamps a version nobody has seen, and publishes.
- A consumer refreshes with `pnpm update --latest "@cheshire/*"`.

> It **refuses to run unless the registry answers** a bounded TCP probe. That guard is the only thing standing between a mistyped flag and a real publish to npmjs.org, so it is not optional and not a convenience.

> ---
>
> **Why a fresh version every time rather than overwriting one:**
>
> > Republishing a version is rejected by Verdaccio and unusable by pnpm, for reasons written out at `scripts/registry-local.mjs`'s `stamp()`.
>
> **Why `--latest` on the consumer side:**
>
> > A plain `pnpm update` rewrites the specifier to
> > an exact pin, so it refreshes once and is a silent no-op after. Both were measured.
>
> ---

#### Release

- `pnpm -r publish`
- Set the version in all six manifests, build, then publish.
- `pnpm publish` **does not build** — `dist/` is whatever was last built, so a release that skips `pnpm -r build` ships the previous milestone's code under the new version's name.

```bash
pnpm check          # lint + build + typecheck + test
pnpm -r build       # not optional — publish will not do it
pnpm -r publish
```

> The proof gate runs _before_ this, against the local registry, not against npm: the point of a dev registry is that **the shipping path is exercised without spending a version number to find out it was wrong**.

## 11. Runtime independence

The runtime is an infrastructure implementation detail (principle 4), and that is held in two moves:

1. **Now — the enforced invariant.** No application code names the runtime: no Electron modules, process/window APIs, IPC channels, or schemes. Everything reaches the runtime through Cheshire's abstractions. This is testable from day one.
2. **The real test — a port.** The runtime interfaces (`WindowService`, `MenuService`, `DialogService`, `FileSystemService`, …) are designed with the runtime layer and decouple Electron behind them. A **Tauri backend** is the candidate port, and it validates them by being written; expect it to expose gaps, whenever it happens.

```
        Application
            │
            ▼
   Cheshire runtime API          ◀── defined and hardened in Phase 4
            │
            ▼
  Electron │ Tauri │ future
```

Cheshire is not "an Electron framework". It is **a desktop application platform whose first runtime is Electron**.

## 12. Roadmap

### Phase 1 — Foundation

Monorepo · Electron runtime · React integration · `create-cheshire` · workbench template · `cheshire dev`/`build`.

### Phase 2 — Workbench

The shell system · layout and docking · the command system · the design system.

### Phase 3 — Productivity

The settings system · the storage system · the identity system · the devtools system.

### Phase 4 — Runtime abstraction

Runtime interfaces · decouple Electron · Tauri prototype · validate portability by porting.

### Milestone A — the acceptance scenario

The platform's first honest end-to-end proof, kept visible from day one:

```
pnpm create cheshire demo
cd demo
pnpm dev

The app defines one view and one command.
The command appears in the menu and on a keyboard shortcut.
Invoking it opens the view in the workbench.
The app restarts with its layout preserved.
pnpm build produces a runnable package.
```

Sliced so every stage ends with something that runs (principle 6):

| Stage | Slice                | Exit condition (runs, and is run)                                                                                                                                                                                           |
| ----- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Create → dev → build | `pnpm create cheshire demo` generates an app with `cheshire.config.ts`; `pnpm dev` opens the workbench shell; `pnpm build` produces a runnable package — Cheshire consumed **from a real install** from the very first run. |
| 1     | Views                | The app contributes a view; it renders in the workbench.                                                                                                                                                                    |
| 2a    | Window & membrane    | Frameless window, preload membrane, CSP, window controls, Cheshire's own title bar. Nothing of the app's changes; the window it runs in becomes Cheshire's.                                                                 |
| 2b    | Commands & menus     | The app's command appears in the menu and on a shortcut, and opens the view.                                                                                                                                                |
| 3     | Layout persistence   | The app restarts with its layout preserved. Milestone A complete.                                                                                                                                                           |

Stage 2 splits because `frame: false` means Cheshire draws the window controls, so the preload membrane lands in **2a whatever is decided about menus** — it is not conditional on 2b. The plan is `.local/plans/stage-2.md`.

## 13. Final mental model

```text
                     Framework Repository (cheshire)
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  packages/                            templates/        │
│  ├── app  ◀── the only one an app     workbench         │
│  │           imports                  (chat)            │
│  ├── cli  ◀── the `cheshire` command  (community)       │
│  ├── create-cheshire                     │              │
│  ├── core                                │              │
│  ├── react                               │              │
│  ├── ui                                  │              │
│  ├── shell                               │              │
│  ├── layout                              │              │
│  ├── commands                            │              │
│  ├── settings                            │              │
│  ├── storage                             │              │
│  ├── identity                            │              │
│  ├── devtools                            │              │
│  ├── runtime-electron                    │              │
│  └── host                                │              │
└──────────────────────────────────────────┼──────────────┘
                                           │
                        publish packages   │
                                           ▼
                        npm Registry (private/public)
                                           │
                     ┌─────────────────────┴─────────────────────┐
                     ▼                                           ▼
┌──────────────────────────────────┐   ┌──────────────────────────────────┐
│ Generated Application            │   │ Playground (play-cheshire repo)  │
│                                  │   │                                  │
│  src/                            │   │  apps/                           │
│  ├── index.ts   views/           │   │                                  │
│  ├── commands/  services/        │   │ installs from the local registry │
│  └── features/  menus/           │   │ dogfoods the framework           │
│  cheshire.config.ts              │   │                                  │
│                                  │   │                                  │
│  imports @cheshire/app, only     │   │  imports @cheshire/app, only     │
└──────────────────────────────────┘   └──────────────────────────────────┘
```

---

## Appendix

### Names

| Thing                   | Name                                                       |
| ----------------------- | ---------------------------------------------------------- |
| Framework               | Cheshire                                                   |
| Framework repo          | `cheshire`                                                 |
| npm scope               | `@cheshire/*`                                              |
| Create package          | `create-cheshire` (`pnpm create cheshire`)                 |
| Tooling CLI             | `@cheshire/cli` — installs the `cheshire` command          |
| Application surface     | `@cheshire/app` — the only package an application imports  |
| Config contract         | `cheshire.config.ts` — `defineConfig({ ... })`             |
| Contribution contract   | `src/index.ts` — default-exports `defineApp({ views })`    |
| Contribution entry      | `@cheshire/core/views`, forwarded whole by `@cheshire/app` |
| Internal entry suffix   | `/internal` — published, forwarded by nothing app-facing   |
| Playground repo         | `play-cheshire`                                            |
| Design system           | `@cheshire/ui`                                             |
| Command system          | `@cheshire/commands` (internal to `shell` until extracted) |
| Shell system            | `@cheshire/shell` + `@cheshire/layout`                     |
| The shell's three zones | title bar · **body** · status bar                          |
| Templates               | `workbench` (built) · `chat`, `community` (named, unbuilt) |

### Misc

- npm registry status (checked 2026-08-06):
  - The `@cheshire` org is **created and owned**, so the scope reserves every package on the roadmap.
  - Unscoped `cheshire` is taken by an unrelated, dormant package (a websocket boardgame framework, last published 2022) — which is why there is no bare package and the application surface is `@cheshire/app`. `create-cheshire` is free, so `pnpm create cheshire my-app` reads exactly as intended, and the `cheshire` command still exists because a bin name lives in the application's own `node_modules/.bin` and never touches a registry.

- Two earlier names were abandoned at this step, both to registry collisions:
  - `dinah` (bare name taken by a maintained DynamoDB client) and
  - `mogget` (bare name free, but the `@mogget` org already owned by another user).
- The lesson that stuck: **a scope is the thing to secure first** — a bare name is a per-package lottery, an org reserves the whole family at once.
