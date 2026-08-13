# cheshire — Design & Roadmap

> **Version:** 0.1 (living document) · **Date:** 2026-08-03
>
> Upstream: [principles.md](principles.md). This document describes how cheshire is structured
> and built; the principles say what is true at all times. Where the two disagree, the
> principles win or are amended explicitly.
>
> Downstream: [guides/framework-architecture.md](guides/framework-architecture.md) explains the
> framework pattern this structure is an instance of, and
> [guides/codebase-tour.md](guides/codebase-tour.md) walks the code that implements it. Both are
> onboarding material — they never decide anything.

---

## 1. Purpose

cheshire is a **platform for building desktop applications**. The goal is not one
application — it is the platform from which many applications are created with a single
command:

```bash
pnpm create cheshire my-app
```

After that command, a developer has a fully configured, runnable desktop application and
spends their time in `src/`, building their domain.

## 2. Vision

The platform provides, so the application never has to:

**Foundations**

- Runtime integration (Electron first)
- UI framework (React first)
- TypeScript and Vite, fully configured
- Package management (pnpm), pinned via `packageManager`
- Build, packaging, and distribution configuration

**Systems** — coherent capabilities an application _declares into_, never implements. Each is
reached through named **services**.

| System                   | Services                                                            |
| ------------------------ | ------------------------------------------------------------------- |
| **design system**        | components · icons · the design-token contract · light/dark modes   |
| **command system**       | commands · keyboard shortcuts · menus · context menus · the palette |
| **shell system**         | layout · notifications · dialogs · title bar · status bar           |
| **customization system** | settings · keybinding overrides · theme selection                   |
| **storage system**       | db · blob                                                           |
| **identity system**      | auth · credentials                                                  |
| **devtools system**      | diagnostics _(ships)_ · developer tooling _(dev-only, stripped)_    |

That an application _declares into_ a system rather than implementing one is the whole promise.
An application says a command exists; it does not write a shortcut matcher, a menu bar, or a
palette. It says a view exists; it does not write docking or layout persistence. It picks tokens;
it does not write a theme switcher. **Nothing in that list is code the application writes.**

A developer should not need to think about the underlying runtime at all. They think:

> "I'm building a desktop application."

## 3. Guiding principles

Condensed from the principles; stated here so the design reads on its own.

1. **Convention over configuration** — minimal setup, sensible defaults, one obvious way to
   do things (principle 1).
2. **Opinionated infrastructure** — cheshire configures it; the application codes, builds,
   runs and releases on top, and never re-plumbs a platform service (principle 1).
3. **Runtime independence** — the application depends on cheshire's abstractions, never on
   the runtime's modules, APIs, channels or protocols (principle 4).
4. **Momentum over meta-work** — every stage ends with something that runs and works
   (principle 6).

## 4. What cheshire ships, and what an application supplies

cheshire is the product. What matters is the line between it and an application built with
it: everything on cheshire's side is in scope here, and everything past it is the
application's own business.

```
     Framework repository ── publishes ──▶ npm packages ──▶ Generated application
```

cheshire is what framework developers maintain: packages, template, CLI, docs. Its user is an
application developer. A generated application contains no framework source — only
`@cheshire/*` dependencies, exactly as `npm install react` copies no React source into an app.
It depends on released packages, never on framework source (principle 5).

## 5. The four systems

cheshire has four major systems. Three live in the framework repository; the playground lives
in its own.

```
                      cheshire
                         │
     ┌───────────┬───────┴──────┬────────────────┐
     ▼           ▼              ▼                ▼
  Packages    Template         CLI          Playground
 (cheshire)  (cheshire)     (cheshire)    (play-cheshire)
```

### Packages

The framework code itself, published under the `@cheshire/*` scope. **Three groups, and the
difference between them is the point** — a package list that reads uniformly invites a developer
to shop through it, against principle 1's one obvious way to do things.

**What an application imports — one name, and only one:**

```
@cheshire/app
```

`@cheshire/app` is the application's whole surface onto cheshire: what it declares, and how it
reaches services. An application imports that name and no other `@cheshire/*` package, ever.
Renderer-side API arrives on its entries as the systems land — `@cheshire/app/react` for hooks,
`@cheshire/app/ui` for components.

**What an application installs but never imports:**

```
create-cheshire       @cheshire/cli
```

`create-cheshire` is run once, by `pnpm create cheshire`, and is not a dependency afterwards.
`@cheshire/cli` supplies the `cheshire` command and exports nothing at all; it is a
devDependency an application depends on for a verb, never for a symbol.

**The framework's internal factoring — real packages with real boundaries, named by no
application:**

```
@cheshire/core        @cheshire/react          @cheshire/ui
@cheshire/shell       @cheshire/layout         @cheshire/commands
@cheshire/customization                     @cheshire/storage
@cheshire/identity    @cheshire/devtools       @cheshire/runtime
@cheshire/host
```

These are how the framework divides its own work, not vocabulary an application learns. The
alternative — a mature application declaring six `@cheshire/*` dependencies and having to know
which one holds `useSettings()` — is what a library asks of its user, and it is the shopping-around
that principle 1's *one obvious way to do things* rules out. Frameworks with a socket model
present one surface: `next/link`, `$app/*`, `astro:*`. Nobody imports `@next/link`.

That is a statement about **who may name a package**, not about how the code is split. The
decomposition below is settled either way.

Packages are the delivery unit; **systems** (§2) are the unit of meaning, and one system may
span several packages. §7 gives each package its responsibilities and whether it is built yet.

**How the single surface stays complete without a forwarding list to maintain.**
`@cheshire/app` is `export *` from each system package's public entry, which makes it complete by
construction — a symbol added upstream cannot go silently missing downstream. That is safe
because entries divide by audience: **a package's public entry is exactly its application-facing
API**, and framework-internal API lives on a matching `internal` entry that nothing app-facing
forwards. So "what is public" is decided where the API lives, by whoever writes it, rather than
in a list in another package that drifts.

Crossing that is a second division, by runtime environment: a barrel that the main process
imports must stay React-free, so React-touching API sits on its own entry. `@cheshire/core` shows
both axes at once — `.` and `./internal` are React-free, `./views` and `./views/internal` are not.

### Template

A template is an **opinionated blueprint: a specific configuration of the systems cheshire encapsulates**,
plus the contributions and labels that suit a shape of application. `create-cheshire` materialises
the default template into a generated app.

`workbench` — VS Code-like — is the first and currently only template. The named next shapes
are `chat` (Slack-like) and `community` (Discord-like). Templates differ in **which systems are
switched on and what things are called**, not in code an application would otherwise write: one
carries structured storage, another carries only blobs, another carries neither.

**A template's choices are declared in `cheshire.config.ts`**, which makes the template a _preset
over the config contract_ rather than a parallel mechanism (principle 2 — one place where an
application says what it _is_):

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

The consequence is the point: a developer who later wants a database **adds the declaration**,
rather than discovering that re-scaffolding was the only way to get it. Nothing a template
chose is invisible or unreachable afterwards.

**One shell, relabeled.** A chat app is not a different workbench — it is the same regions
under different names:

| `workbench`        | `chat`       |
| ------------------ | ------------ |
| activity bar       | servers      |
| primary side bar   | channels     |
| editor area        | message view |
| auxiliary side bar | members      |
| panel              | _(off)_      |
| status bar         | presence     |

So `@cheshire/shell` is general rather than IDE-shaped, and every system beneath it is built,
themed and tested once. `workbench` is the name of a _template_, not of the package that draws it.

**The playground is not upstream of the template.** `play-cheshire` exercises the platform surface
and is where a shape is discovered; a template is authored and versioned with the framework,
and is not a snapshot of any one playground app.

### CLI — two responsibilities, two tools

1. **`create-cheshire`** (invoked as `npm create cheshire`) — project generation only: ask the
   project name, copy the template, replace placeholders, install dependencies, `git init`, print next steps. Nothing more.  
   **cheshire chooses pnpm, the way it chooses Electron, React and Vite.** One package manager
   means one lockfile format and one resolution algorithm behind every generated application,
   which is what makes a support conversation reproducible. `create-cheshire` installs with pnpm
   regardless of what invoked the generator, and the generated manifest pins the version in
   `packageManager` so corepack agrees.

   Two settings in the generated `pnpm-workspace.yaml` follow from that choice rather than from
   Electron. `nodeLinker: hoisted`, and `allowBuilds: { electron: true }` because pnpm 10+ gates a
   dependency's install scripts. npm and yarn need neither — they hoist by default and run install
   scripts by default. Both settings give pnpm the behaviour cheshire needs; neither compensates
   for something the other tools lack.

   **`hoisted` carries two independent reasons, and only one of them is about Windows.** The
   isolated linker uses junctions that electron-builder does not follow when collecting binaries,
   so a packaged app ships incomplete. It also nests a dependency's dependencies out of sight —
   and `cheshire dev` writes files into `.cheshire/` that import `@cheshire/shell` and
   `@cheshire/runtime-electron` by name. Those belong to `@cheshire/cli`, which emits the imports
   and therefore declares them; they resolve only because `hoisted` puts every package flat in the
   application's own `node_modules`.

   Measured by installing one generated application both ways: under `isolated`,
   `node_modules/@cheshire/` holds only the two packages the manifest declares, the install still
   **succeeds**, and the build stops at `error TS2307: Cannot find module '@cheshire/shell'`.

   The second reason is the one worth stating first, because the failures are asymmetric: the
   packaging one is late and Windows-only, while the resolution one fails on the first build, on
   every platform, naming a package the application never declared and saying nothing about
   linkers. Documented as a packaging workaround alone, this setting reads as removable to anyone
   developing on Linux.

   Missing pnpm is a clear refusal naming the fix, with the application still generated — never a
   silent npm install that ignores the linker and fails later at packaging.

2. **`@cheshire/cli`** — the framework tooling an application uses day to day: `dev`, `build`,
   `package`. Owned and shipped by the framework, so application authors never configure
   Electron or Vite targets themselves. It installs the `cheshire` bin and exports nothing: an
   application depends on it for a command, never for an import. That is why it is a
   devDependency while `@cheshire/app` is a dependency.

Tooling is part of the framework. The generated application's `package.json` scripts call
`cheshire`, and the framework owns what those verbs mean.

### Playground — external repository `play-cheshire`

Development application(s) whose purpose is to dogfood the framework. Mostly mocking some domain; it exercises menus, docking, the command palette, theming — the platform surface itself.

**It installs cheshire from the local registry — exactly what a real developer gets. Never a
workspace link**: links resolve source paths and hide packaging failures. That rule, and the
proximity rule beside it, are hard invariants rather than principles; `CLAUDE.md` holds them.

## 6. Repository structure

Framework repository:

```
cheshire/
├── packages/
│   ├── app/                @cheshire/app — the application's whole import surface
│   ├── cli/                @cheshire/cli — the `cheshire` bin; exports nothing
│   ├── core/               @cheshire/core
│   ├── create-cheshire/    create-cheshire
│   ├── runtime-electron/   @cheshire/runtime-electron
│   └── shell/              @cheshire/shell
├── templates/
│   └── workbench/          a blueprint, deliberately not a workspace package
├── docs/
├── scripts/
├── package.json
└── pnpm-workspace.yaml
```

**A package's directory basename is its name with the scope stripped.** Flat, one level, no
exceptions — stripping an absent scope is a no-op, so unscoped `create-cheshire` obeys the same
rule as `@cheshire/runtime-electron`. `pnpm-workspace.yaml` is therefore a single `packages/*`
glob, and `scripts/check-layout.mjs` fails the build if a directory and its package name ever
disagree.

The rule exists because the previous layout drifted exactly that way: `cli/cheshire/` published
as `@cheshire/app`, reading as tooling on disk and as an application surface on npm. Nothing
failed, because a directory name reaches no consumer — only a reader.

Playground repository (separate; installs cheshire like any consumer):

```
play-cheshire/
└── apps/
```

## 7. Package responsibilities

Packages are the delivery unit; **systems** (§2) are the unit of meaning. One system may span
several packages, and one package may serve more than one system — the mapping is noted where
it is not obvious.

**This decomposition is settled.** The list is the shape, decided by the reasoning in each entry
below. Nothing here is waiting to prove it deserves to exist, and no package has to earn its
boundary — the shape is ambitious and vision-driven (principle 6). What varies is only whether
a package has been **built**: a name appears on npm when there is something to install behind it,
which is a fact about the calendar rather than a verdict about the design.

Marked as in [the application surface](application-surface.md): ✅ built · ◐ in progress ·
○ planned.

The first two entries are the only packages an application names. **Everything after them is
internal factoring** — §5 draws that line and it is not restated at each entry.

**app** ✅ — **the application's whole surface onto cheshire**, and the only `@cheshire/*` package
an application imports. It is `export *` from each system package's public entry rather than a
curated list, so it cannot drift out of date with what those packages expose. It carries no
toolchain: its one dependency today is `core`, and it gains each system package as that system
lands. Its entries follow the systems — `.` for declarations, `/react` for hooks, `/ui` for
components — which is what keeps the barrel React-free for the process that evaluates
`cheshire.config.ts`.

**cli** ✅ — the `cheshire` command: `dev`, `build`, `package`. It **exports nothing**; an
application depends on it for a verb, never for a symbol, which is why it is a devDependency
while `app` is a dependency. It owns the generated entry files, the Vite configuration for both
processes, and the electron-builder invocation — none of which an application authors
(principle 2).

**core** ✅ — foundational services: lifecycle, events, logging, configuration, dependency
injection. Also the two contracts an application declares against: the config contract and the
contribution contract. Its four entries show both axes of the entry rule at once — `.` and
`./internal` stay React-free because the main process imports them, while `./views` and
`./views/internal` carry the contribution contract, which names React. On each axis the public
half is what an application may declare against and the `internal` half is the framework's:
`defineConfig` and `defineApp` are public, `resolveConfig` and `resolveApp` are not.

**react** ○ phase 2 — how an application reaches a service: **one typed hook per service**.
`useCommands()`, `useSettings()`, `useTheme()`. The hooks are written here and an application
imports them from `@cheshire/app/react`; the package name is where they live, not where they are
reached. No service ids, no registry, no
provider to learn — autocomplete finds the surface and a missing provider is a type error.
Both prior attempts used a service locator (`useService(CommandServiceId)`) over ~30 services;
cheshire has an order of magnitude fewer, so the indirection buys nothing and costs every reader a
hop. This is the _service_-facing API surface, deliberately not the component-facing one —
that is `ui`.

**ui** ○ phase 2–3 — **the design system**, reached by an application as `@cheshire/app/ui`.
Accessible primitives (shadcn-derived, vendored and shipped
built), cheshire's own primitives (`Icon` and its registry, `ResizeHandle`), `cn`, and the design
token contract. **Two token layers and deliberately not three:** the shadcn CSS-var contract as
real `:root` / `.dark` custom properties, plus an extension layer for what the contract has no
equivalent for — type scale, spacing, shadows, chrome heights. **The palette is neutral on
purpose:** cheshire ships the token _contract_ and a neutral default, never a visual identity; an
application supplies its own CSS-var block. A palette that lands application-shaped stays that
way.

**shell** ✅ — **the shell system**, and the root of the renderer. Its anatomy is three vertical
zones — a **title bar** (window controls, product name, quick toggles), the **body**, and a
**status bar** — plus an overlay plane above all three for notifications, dialogs and toasts.
The body holds the regions: activity bar, primary and auxiliary side bars, editor area, panel.
**Which regions exist is not fixed** — a template may have no activity bar and no panel at all;
that is the layout service's call, not the shell's.

**layout** ○ phase 2 — the shell system's layout service, large enough for its own package: which regions
exist, their visibility and sizes, docking, split views, and persistence across restarts.

**commands** ◐ stage 2b — **the command system.** Command registry, keyboard shortcuts, menus and context
menus, the command palette, and the keyboard-shortcuts editor. Menus belong here rather than in
the shell because **a menu item is a command reference** — it resolves its title, its shortcut
and its enablement from the registry, and never holds a handler.

**customization** ○ phase 3 — **the customization system**: everything the _user_ can change, over
everything the _developer_ declared. It does not own the other systems' defaults — it
**aggregates** them. The command system owns the keybinding registry and an application's
default shortcuts; customization owns the user's overrides to them, the single persistence
layer they share, and the editor UI. Same for theme selection and region sizes. One precedence
rule for all of it: **user > application default > platform default.**

**storage** ○ phase 3 — **the storage system**: a `db` service (schema, migrations, queries,
transactions) and a `blob` service (large binary content addressed by id, off the record path).
Host-side. A template may switch on either, both, or neither.

**identity** ○ phase 3 — **the identity system**: an `auth` service (sessions, sign-in, providers) and a
`credentials` service (OS keychain, secrets at rest). Separate from storage because a keychain
is storage-_shaped_ but identity-_purposed_: an application that wants sign-in and no database
should not have to declare storage to get it.

**devtools** ○ planned — **the devtools system**, in two halves that must not be confused. **Diagnostics
ships**: logging, crash capture, and a log viewer — a user's bug report is worthless without
them. **Developer tooling does not**: the component gallery, a contribution inspector, the
Electron devtools shortcut. The split is a build gate, not a convention; the same class of
mistake as `--no-sandbox` reaching a packaged build.

**runtime** ✅ — runtime-specific implementations, `runtime-electron` first: window creation,
native dialogs, native menus, auto-update. Safe renderer–main IPC is an internal detail
here, not a package. Applications never import this directly (principle 4).

**host** ○ phase 3 — the application's own backend process and the channel cheshire brokers to it.
See [the application surface](application-surface.md) §4 for why it is a third process rather
than code in main.

## 8. The generated application

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
└── cheshire.config.ts       # the config contract (principle 2)
```

What the application does **not** contain: a process entry file, Electron/Vite config, a
build pipeline, or any reference to the runtime. cheshire owns the entry and generates what
the entry needs; the application seats into the socket via two files — `cheshire.config.ts`
says what it _is_, `src/index.ts` says what it _contributes_. `src/index.ts` is the app's
own file: the generated renderer imports it, and never writes it.

The full surface an application eventually meets — every contribution kind, the host
process, and the platform services — is [the application surface](application-surface.md).

## 9. Development flow

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

## 10. Bootstrapping flow

```
Developer
   ▼
npm create cheshire my-app
   ▼
create-cheshire: copy template → rename → update package.json → install → git init
   ▼
cd my-app && npm run dev     # invokes the cheshire CLI
   ▼
A workbench window opens. Ready.
```

## 11. Versioning and the two publishes

Packages follow semantic versioning. `create-cheshire` always generates projects against a
compatible, tested set of `@cheshire/*` versions — a generated app never starts life on a
mismatched matrix.

**All five packages move together.** They cross-reference with `workspace:^`, and
`create-cheshire` stamps _its own_ version into the application it generates (`create-cheshire/src/cli.ts:versions()`). A
release where one package lags is a generated application asking for a version that does not
exist.

There are two publishes, and they are not variations of one thing:

|              | **Development**                                     | **Release**                                                    |
| ------------ | --------------------------------------------------- | -------------------------------------------------------------- |
| Command      | `pnpm registry:publish`                             | `pnpm -r publish`                                              |
| Target       | local Verdaccio, `http://localhost:4873`            | npmjs.org                                                      |
| Version      | `<next patch>-dev.<timestamp>`, stamped per publish | the real version in the manifests                              |
| Permanence   | disposable — `registry:reset` forgets everything    | permanent; 72-hour unpublish window, then the number is burned |
| Builds first | yes                                                 | **no**                                                         |
| How often    | every iteration                                     | at a milestone                                                 |

### Development — `pnpm registry:publish`

The whole consumer loop, and the only way cheshire reaches a consumer during development.
`registry:start` runs Verdaccio in the foreground; `registry:publish` builds all five, stamps a
version nobody has seen, and publishes. A consumer refreshes with
`pnpm update --latest "@cheshire/*"`.

It **refuses to run unless the registry answers** a bounded TCP probe. That guard is the only
thing standing between a mistyped flag and a real publish to npmjs.org, so it is not optional
and not a convenience.

Why a fresh version every time rather than overwriting one: republishing a version is rejected
by Verdaccio and unusable by pnpm, for reasons written out at `scripts/registry-local.mjs`'s
`stamp()`. Why `--latest` on the consumer side: a plain `pnpm update` rewrites the specifier to
an exact pin, so it refreshes once and is a silent no-op after. Both were measured.

### Release — `pnpm -r publish`

Set the version in all five manifests, build, then publish. **`pnpm publish` does not build** —
`dist/` is whatever was last built, so a release that skips `pnpm -r build` ships the previous
milestone's code under the new version's name, and nothing says so.

```bash
pnpm check          # lint + build + typecheck + test
pnpm -r build       # not optional — publish will not do it
pnpm -r publish
```

The proof gate runs _before_ this, against the local registry, not against npm: the point of a
dev registry is that the shipping path is exercised without spending a version number to find
out it was wrong.

## 12. Runtime independence

The runtime is an infrastructure implementation detail (principle 4), and that is held in two
moves:

1. **Now — the enforced invariant.** No application code names the runtime: no Electron
   modules, process/window APIs, IPC channels, or schemes. Everything reaches the runtime
   through cheshire's abstractions. This is testable from day one.
2. **The real test — a port.** The runtime interfaces (`WindowService`, `MenuService`,
   `DialogService`, `FileSystemService`, …) are designed with the runtime layer and decouple
   Electron behind them. A **Tauri backend** is the candidate port, and it validates them by
   being written; expect it to expose gaps, because that is what a port is for. Nothing in the
   design waits on one being scheduled.

```
        Application
            │
            ▼
   cheshire runtime API          ◀── defined and hardened in Phase 4
            │
            ▼
  Electron │ Tauri │ future
```

cheshire is not "an Electron framework". It is a desktop application platform whose first
runtime is Electron.

## 13. Roadmap

### Phase 1 — Foundation

Monorepo · Electron runtime · React integration · `create-cheshire` · workbench template ·
`cheshire dev`/`build`.

### Phase 2 — Workbench

The shell system · layout and docking · the command system · the design system.

### Phase 3 — Productivity

The customization system · the storage system · the identity system · the devtools system.

### Phase 4 — Runtime abstraction

Runtime interfaces · decouple Electron · Tauri prototype · validate portability by
porting.

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
| 0     | Create → dev → build | `pnpm create cheshire demo` generates an app with `cheshire.config.ts`; `pnpm dev` opens the workbench shell; `pnpm build` produces a runnable package — cheshire consumed **from a real install** from the very first run. |
| 1     | Views                | The app contributes a view; it renders in the workbench.                                                                                                                                                                    |
| 2a    | Window & membrane    | Frameless window, preload membrane, CSP, window controls, cheshire's own title bar. Nothing of the app's changes; the window it runs in becomes cheshire's.                                                                  |
| 2b    | Commands & menus     | The app's command appears in the menu and on a shortcut, and opens the view.                                                                                                                                                |
| 3     | Layout persistence   | The app restarts with its layout preserved. Milestone A complete.                                                                                                                                                           |

Stage 2 splits because `frame: false` means cheshire draws the window controls, so the preload
membrane lands in **2a whatever is decided about menus** — it is not conditional on 2b. The plan
is `.local/plans/stage-2.md`.

## 14. Final mental model

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
│  ├── customization                       │              │
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
│ Generated Application            │   │ Playground (play-cheshire repo)     │
│                                  │   │                                  │
│  src/                            │   │  apps/                           │
│  ├── index.ts   views/           │   │                                  │
│  ├── commands/  services/        │   │  installs from the local registry │
│  └── features/  menus/           │   │  dogfoods the framework          │
│  cheshire.config.ts                 │   │                                  │
│                                  │   │                                  │
│  imports @cheshire/app, only     │   │  imports @cheshire/app, only     │
└──────────────────────────────────┘   └──────────────────────────────────┘
```

---

## Appendix — names

| Thing                   | Name                                                        |
| ----------------------- | ----------------------------------------------------------- |
| Framework / repo        | `cheshire`                                                  |
| npm scope               | `@cheshire/*`                                               |
| Create package          | `create-cheshire` (`npm create cheshire`)                   |
| Tooling CLI             | `@cheshire/cli` — installs the `cheshire` command           |
| Application surface     | `@cheshire/app` — the only package an application imports   |
| Config contract         | `cheshire.config.ts` — `defineConfig({ ... })`              |
| Contribution contract   | `src/index.ts` — default-exports `defineApp({ views })`     |
| Contribution entry      | `@cheshire/core/views`, forwarded whole by `@cheshire/app`  |
| Internal entry suffix   | `/internal` — published, forwarded by nothing app-facing    |
| Playground repo         | `play-cheshire`                                             |
| Design system           | `@cheshire/ui`                                              |
| Command system          | `@cheshire/commands` (internal to `shell` until extracted)  |
| Shell system            | `@cheshire/shell` + `@cheshire/layout`                      |
| The shell's three zones | title bar · **body** · status bar                           |
| Templates               | `workbench` (built) · `chat`, `community` (named, unbuilt)  |

npm registry status (checked 2026-08-06): the `@cheshire` org is **created and owned**, so the
scope reserves every package on the roadmap. Unscoped `cheshire` is taken by an unrelated,
dormant package (a websocket boardgame framework, last published 2022) — which is why there is
no bare package and the application surface is `@cheshire/app`. `create-cheshire` is free, so
`pnpm create cheshire my-app` reads exactly as intended, and the `cheshire` command still exists
because a bin name lives in the application's own `node_modules/.bin` and never touches a
registry.

Two earlier names were abandoned at this step, both to registry collisions: `dinah` (bare name
taken by a maintained DynamoDB client) and `mogget` (bare name free, but the `@mogget` org
already owned by another user). The lesson that stuck: **a scope is the thing to secure first** —
a bare name is a per-package lottery, an org reserves the whole family at once.
