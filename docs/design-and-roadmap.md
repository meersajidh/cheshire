# mogget — Design & Roadmap

> **Version:** 0.1 (living document) · **Date:** 2026-08-03
>
> Upstream: [premises.md](premises.md). This document describes how mogget is structured
> and built; the premises say what is true at all times. Where the two disagree, the
> premises win or are amended explicitly.
>
> Downstream: [guides/framework-architecture.md](guides/framework-architecture.md) explains the
> framework pattern this structure is an instance of, and
> [guides/codebase-tour.md](guides/codebase-tour.md) walks the code that implements it. Both are
> onboarding material — they never decide anything.

---

## 1. Purpose

mogget is a **platform for building desktop applications**. The goal is not one
application — it is the platform from which many applications are created with a single
command:

```bash
pnpm create mogget my-app
```

After that command, a developer has a fully configured, runnable desktop application and
spends their time in `src/`, building their domain.

## 2. Vision

The platform provides, so the application never has to:

**Foundations**

- Runtime integration (Electron first)
- UI framework (React first)
- TypeScript and Vite, fully configured
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

Condensed from the premises; stated here so the design reads on its own.

1. **Developer experience first** — every API is judged by effort removed (premise 1).
2. **Convention over configuration** — minimal setup, sensible defaults (premise 1).
3. **Opinionated infrastructure, platform for domain layering** — one obvious way to
   build; the business domain uses platform services, it never re-plumbs them (premise 1).
4. **Runtime independence** — a strategic objective, validated by porting in Phase 4
   (premise 5).
5. **Momentum over meta-work** — consolidation never blocks the next runnable milestone
   (premise 8).

## 4. The two products

The most important structural fact (premise 2): mogget is **two products**.

```
                        YOU
                         │
             ┌───────────┴────────────┐
             ▼                        ▼
     Framework Product        Generated Application
     (repo: mogget)            (the customer's repo)
```

- The **framework product** is what framework developers maintain: packages, template,
  CLI, docs. Its user is an application developer.
- A **generated application** is a consumer. It contains no framework source — only
  `@mogget/*` dependencies — exactly as `npm install react` copies no React source into an
  app.

```
     Framework repository ── publishes ──▶ npm packages ──▶ Generated application
```

An application depends on released packages. Never on framework source.

## 5. The four systems

The framework product has four major systems. Three live in the framework repository; the
playground lives in its own.

```
                  Framework Product
                         │
     ┌───────────┬───────┴──────┬────────────────┐
     ▼           ▼              ▼                ▼
  Packages    Template         CLI          Playground
  (mogget)     (mogget)         (mogget)       (play-mogget)
```

### Packages

The framework code itself, published under the `@mogget/*` scope:

```
@mogget/core        @mogget/react          @mogget/ui
@mogget/shell       @mogget/layout         @mogget/commands
@mogget/customization                     @mogget/storage
@mogget/identity    @mogget/devtools       @mogget/runtime
@mogget/host
```

Packages are the delivery unit; **systems** (§2) are the unit of meaning, and one system may
span several packages before it earns a boundary of its own. Package factoring is decided
case by case as the platform grows — the list above is the current shape, not a cap.

### Template

A template is an **opinionated blueprint: a configuration of the systems mogget encapsulates**,
plus the contributions and labels that suit a shape of application. `create-mogget` materialises
one into a generated app.

`workbench` — VS Code-like — is the first and currently only template. The named next shapes
are `chat` (Slack-like) and `community` (Discord-like). Templates differ in **which systems are
switched on and what things are called**, not in code an application would otherwise write: one
carries structured storage, another carries only blobs, another carries neither.

**A template's choices are declared in `mogget.config.ts`**, which makes the template a _preset
over the config contract_ rather than a parallel mechanism (premise 3 — one place where an
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

So `@mogget/shell` is general rather than IDE-shaped, and every system beneath it is built,
themed and tested once. `workbench` is the name of a _template_, not of the package that draws it.

**The playground is not upstream of the template.** `play-mogget` exercises the platform surface
and is where a shape is discovered; a template is authored and versioned with the framework,
and is not a snapshot of any one playground app.

### CLI — two responsibilities, two tools

1. **`create-mogget`** (invoked as `npm create mogget`) — project generation only: ask the
   project name, copy the template, replace placeholders, install dependencies, `git init`,
   print next steps. Nothing more.

   **A generated application requires pnpm**, and `create-mogget` installs with it regardless of
   what invoked the generator. `pnpm-workspace.yaml` carries `nodeLinker: hoisted`, which npm and
   yarn have no equivalent for and which electron-builder needs to package correctly on Windows;
   the generated manifest pins the version in `packageManager` so corepack agrees. Missing pnpm is
   a clear refusal naming the fix, with the application still generated — never a registry 404.

2. **`mogget`** — the framework tooling an application uses day to day: `dev`, `build`,
   `package`. Owned and shipped by the framework, so application authors never configure
   Electron or Vite targets themselves.

Tooling is part of the framework. The generated application's `package.json` scripts call
`mogget`, and the framework owns what those verbs mean.

### Playground — external repository `play-mogget`

Development application(s) whose purpose is to dogfood the framework. Nothing seriously
domain-specific; it exercises menus, docking, the command palette, theming — the platform
surface itself.

**It installs mogget from a packed tarball or a local registry — exactly what a real
developer gets. Never a workspace link** (premise 4): links resolve source paths and hide
packaging failures.

## 6. Repository structure

Framework repository:

```
mogget/
├── packages/
│   ├── core/
│   ├── react/
│   ├── commands/
│   ├── layout/
│   ├── workbench/
│   ├── settings/
│   └── runtime/
│       └── electron/
├── templates/
│   └── workbench/
├── cli/                  # create-mogget + mogget tooling
├── docs/
├── scripts/
├── package.json
└── pnpm-workspace.yaml
```

Playground repository (separate; installs mogget like any consumer):

```
play-mogget/
└── apps/
```

## 7. Package responsibilities

Packages are the delivery unit; **systems** (§2) are the unit of meaning. One system may span
several packages, and one package may serve more than one system — the mapping is noted where
it is not obvious.

**core** — foundational services: lifecycle, events, logging, configuration, dependency
injection. Also the two contracts an application declares against: the config contract on
the barrel, and the contribution contract on `@mogget/core/views` — a separate entry so the
barrel stays React-free for the main process.

**react** — how an application reaches a service: **one typed hook per service**, from this
package. `useCommands()`, `useSettings()`, `useTheme()`. No service ids, no registry, no
provider to learn — autocomplete finds the surface and a missing provider is a type error.
Both prior attempts used a service locator (`useService(CommandServiceId)`) over ~30 services;
mogget has an order of magnitude fewer, so the indirection buys nothing and costs every reader a
hop. This is the _service_-facing API surface, deliberately not the component-facing one —
that is `ui`.

**ui** — **the design system.** Accessible primitives (shadcn-derived, vendored and shipped
built), mogget's own primitives (`Icon` and its registry, `ResizeHandle`), `cn`, and the design
token contract. **Two token layers and deliberately not three:** the shadcn CSS-var contract as
real `:root` / `.dark` custom properties, plus an extension layer for what the contract has no
equivalent for — type scale, spacing, shadows, chrome heights. **The palette is neutral on
purpose:** mogget ships the token _contract_ and a neutral default, never a visual identity; an
application supplies its own CSS-var block. A palette that lands application-shaped stays that
way.

**shell** — **the shell system**, and the root of the renderer. Its anatomy is three vertical
zones — a **title bar** (window controls, product name, quick toggles), the **body**, and a
**status bar** — plus an overlay plane above all three for notifications, dialogs and toasts.
The body holds the regions: activity bar, primary and auxiliary side bars, editor area, panel.
**Which regions exist is not fixed** — a template may have no activity bar and no panel at all;
that is the layout service's call, not the shell's.

**layout** — the shell system's layout service, large enough for its own package: which regions
exist, their visibility and sizes, docking, split views, and persistence across restarts.

**commands** — **the command system.** Command registry, keyboard shortcuts, menus and context
menus, the command palette, and the keyboard-shortcuts editor. Menus belong here rather than in
the shell because **a menu item is a command reference** — it resolves its title, its shortcut
and its enablement from the registry, and never holds a handler. Lives as internal modules
inside `shell` until it earns the package boundary.

**customization** — **the customization system**: everything the _user_ can change, over
everything the _developer_ declared. It does not own the other systems' defaults — it
**aggregates** them. The command system owns the keybinding registry and an application's
default shortcuts; customization owns the user's overrides to them, the single persistence
layer they share, and the editor UI. Same for theme selection and region sizes. One precedence
rule for all of it: **user > application default > platform default.**

**storage** — **the storage system**: a `db` service (schema, migrations, queries,
transactions) and a `blob` service (large binary content addressed by id, off the record path).
Host-side. A template may switch on either, both, or neither.

**identity** — **the identity system**: an `auth` service (sessions, sign-in, providers) and a
`credentials` service (OS keychain, secrets at rest). Separate from storage because a keychain
is storage-_shaped_ but identity-_purposed_: an application that wants sign-in and no database
should not have to declare storage to get it.

**devtools** — **the devtools system**, in two halves that must not be confused. **Diagnostics
ships**: logging, crash capture, and a log viewer — a user's bug report is worthless without
them. **Developer tooling does not**: the component gallery, a contribution inspector, the
Electron devtools shortcut. The split is a build gate, not a convention; the same class of
mistake as `--no-sandbox` reaching a packaged build.

**runtime** — runtime-specific implementations, `runtime/electron` first: window creation,
native dialogs, native menus, auto-update. Safe renderer–main IPC is an internal detail
here, not a package. Applications never import this directly (premise 5).

**host** — the application's own backend process and the channel mogget brokers to it. Not
built; see [the application surface](application-surface.md) §4 for why it is a third
process rather than code in main.

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
├── package.json          # scripts call the mogget CLI
└── mogget.config.ts       # the config contract (premise 3)
```

What the application does **not** contain: a process entry file, Electron/Vite config, a
build pipeline, or any reference to the runtime. mogget owns the entry and generates what
the entry needs; the application seats into the socket via two files — `mogget.config.ts`
says what it _is_, `src/index.ts` says what it _contributes_. `src/index.ts` is the app's
own file: the generated renderer imports it, and never writes it.

The full surface an application eventually meets — every contribution kind, the host
process, and the platform services — is [the application surface](application-surface.md).

## 9. Development flow

```
Feature idea
   ▼
Implement framework API        (mogget repo)
   ▼
Exercise it in the playground  (play-mogget, installed from tarball)
   ▼
Improve the API — repeat
   ▼
Promote: polish into the template
   ▼
Publish packages
   ▼
Release CLI
```

The playground is never the product. It is the proving ground.

**The proof gate** (premise 4): before a milestone closes, the loop
`pack tarball → create-mogget → build → smoke test` runs against the real artifacts. The
generated-from-tarball application is the ground truth; the playground is for speed.

## 10. Bootstrapping flow

```
Developer
   ▼
npm create mogget my-app
   ▼
create-mogget: copy template → rename → update package.json → install → git init
   ▼
cd my-app && npm run dev     # invokes the mogget CLI
   ▼
A workbench window opens. Ready.
```

## 11. Versioning

Packages follow semantic versioning. `create-mogget` always generates projects pinned to a
compatible, tested set of `@mogget/*` versions — a generated app never starts life on a
mismatched matrix.

## 12. Runtime independence

A first-class strategic objective (premise 5), executed in two moves:

1. **Now — the enforced invariant.** No application code names the runtime: no Electron
   modules, process/window APIs, IPC channels, or schemes. Everything reaches the runtime
   through mogget's abstractions. This is testable from day one.
2. **Phase 4 — the real test.** Introduce the runtime interfaces (`WindowService`,
   `MenuService`, `DialogService`, `FileSystemService`, …), decouple Electron behind them,
   and **prototype a Tauri backend**. The interfaces are validated by the port itself —
   not frozen speculatively before a second runtime exists.

```
        Application
            ▼
   mogget runtime API          ◀── defined and hardened in Phase 4
            ▼
  Electron │ Tauri │ future
```

mogget is not "an Electron framework". It is a desktop application platform whose first
runtime is Electron.

## 13. Roadmap

### Phase 1 — Foundation

Monorepo · Electron runtime · React integration · `create-mogget` · workbench template ·
`mogget dev`/`build`.

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
pnpm create mogget demo
cd demo
pnpm dev

The app defines one view and one command.
The command appears in the menu and on a keyboard shortcut.
Invoking it opens the view in the workbench.
The app restarts with its layout preserved.
pnpm build produces a runnable package.
```

Sliced so every stage ends with something that runs (premise 8):

| Stage | Slice                | Exit condition (runs, and is run)                                                                                                                                                                             |
| ----- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Create → dev → build | `pnpm create mogget demo` generates an app with `mogget.config.ts`; `pnpm dev` opens the workbench shell; `pnpm build` produces a runnable package — mogget consumed **from a tarball** from the very first run. |
| 1     | Views                | The app contributes a view; it renders in the workbench.                                                                                                                                                      |
| 2     | Commands & menus     | The app's command appears in the menu and on a shortcut, and opens the view.                                                                                                                                  |
| 3     | Layout persistence   | The app restarts with its layout preserved. Milestone A complete.                                                                                                                                             |

## 14. Final mental model

```text
                     Framework Repository (mogget)
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  packages/         templates/         cli/              │
│  ├── core          workbench          create-mogget      │
│  ├── react         (chat)             mogget             │
│  ├── ui            (community)           │              │
│  ├── shell                               │              │
│  ├── layout                              │              │
│  ├── commands                            │              │
│  ├── customization                       │              │
│  ├── storage                             │              │
│  ├── identity                            │              │
│  ├── devtools                            │              │
│  ├── runtime                             │              │
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
│ Generated Application            │   │ Playground (play-mogget repo)     │
│                                  │   │                                  │
│  src/                            │   │  apps/                           │
│  ├── index.ts   views/           │   │                                  │
│  ├── commands/  services/        │   │  installs from tarball/registry  │
│  └── features/  menus/           │   │  dogfoods the framework          │
│  mogget.config.ts                 │   │                                  │
│                                  │   │                                  │
│  depends on @mogget/* packages    │   │  depends on @mogget/* packages    │
└──────────────────────────────────┘   └──────────────────────────────────┘
```

---

## Appendix — names

| Thing                   | Name                                                       |
| ----------------------- | ---------------------------------------------------------- |
| Framework / repo        | `mogget`                                                    |
| npm scope               | `@mogget/*`                                                 |
| Create package          | `create-mogget` (`npm create mogget`)                        |
| Tooling CLI             | `mogget`                                                    |
| Config contract         | `mogget.config.ts` — `defineConfig({ ... })`                |
| Contribution contract   | `src/index.ts` — default-exports `defineApp({ views })`    |
| Contribution entry      | `@mogget/core/views`, re-exported through `mogget`           |
| Playground repo         | `play-mogget`                                               |
| Design system           | `@mogget/ui`                                                |
| Command system          | `@mogget/commands` (internal to `shell` until extracted)    |
| Shell system            | `@mogget/shell` + `@mogget/layout`                           |
| The shell's three zones | title bar · **body** · status bar                          |
| Templates               | `workbench` (built) · `chat`, `community` (named, unbuilt) |

npm registry status (checked 2026-08-03): unscoped `mogget` is taken by an unrelated
package; `create-mogget` is free; availability of the `@mogget` org for public publishing is
unverified. None of this blocks tarball/local-registry development; verify the org before
the first public publish.
