# dinah — Design & Roadmap

> **Version:** 0.1 (living document) · **Date:** 2026-08-03
>
> Upstream: [premises.md](premises.md). This document describes how dinah is structured
> and built; the premises say what is true at all times. Where the two disagree, the
> premises win or are amended explicitly.
>
> Downstream: [guides/framework-architecture.md](guides/framework-architecture.md) explains the
> framework pattern this structure is an instance of, and
> [guides/codebase-tour.md](guides/codebase-tour.md) walks the code that implements it. Both are
> onboarding material — they never decide anything.

---

## 1. Purpose

dinah is a **platform for building desktop applications**. The goal is not one
application — it is the platform from which many applications are created with a single
command:

```bash
npm create dinah my-app
```

After that command, a developer has a fully configured, runnable desktop application and
spends their time in `src/`, building their domain.

## 2. Vision

The platform provides, so the application never has to:

- Runtime integration (Electron first)
- UI framework (React first)
- TypeScript and Vite, fully configured
- Window layout — a VS Code-like workbench as the first option
- Docking, panels, toolbars
- Menus and commands
- Theming
- Settings
- State management
- Persistence storage (DB, blobs)
- Logging
- Build, packaging, and distribution configuration

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

The most important structural fact (premise 2): dinah is **two products**.

```
                        YOU
                         │
             ┌───────────┴────────────┐
             ▼                        ▼
     Framework Product        Generated Application
     (repo: dinah)            (the customer's repo)
```

- The **framework product** is what framework developers maintain: packages, template,
  CLI, docs. Its user is an application developer.
- A **generated application** is a consumer. It contains no framework source — only
  `@dinah/*` dependencies — exactly as `npm install react` copies no React source into an
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
  (dinah)     (dinah)         (dinah)       (play-dinah)
```

### Packages

The framework code itself, published under the `@dinah/*` scope:

```
@dinah/core        @dinah/react       @dinah/workbench
@dinah/layout      @dinah/commands    @dinah/settings
@dinah/runtime
```

Package factoring is decided case by case as the platform grows — the list above is the
current shape, not a cap.

### Template

The starter application: **the VS Code-like workbench**, the default and only template for
now. Minimal, generic, no business logic. Contains a welcome screen, a sample layout,
settings, a menu, and example commands.

The template is a **curated snapshot**: the playground changes daily; the template changes
only when the developer experience is intentionally improved.

```
Playground  ──▶  Polish  ──▶  Template
```

### CLI — two responsibilities, two tools

1. **`create-dinah`** (invoked as `npm create dinah`) — project generation only: ask the
   project name, copy the template, replace placeholders, install dependencies, `git init`,
   print next steps. Nothing more.
2. **`dinah`** — the framework tooling an application uses day to day: `dev`, `build`,
   `package`. Owned and shipped by the framework, so application authors never configure
   Electron or Vite targets themselves.

Tooling is part of the framework. The generated application's `package.json` scripts call
`dinah`, and the framework owns what those verbs mean.

### Playground — external repository `play-dinah`

Development application(s) whose purpose is to dogfood the framework. Nothing seriously
domain-specific; it exercises menus, docking, the command palette, theming — the platform
surface itself.

**It installs dinah from a packed tarball or a local registry — exactly what a real
developer gets. Never a workspace link** (premise 4): links resolve source paths and hide
packaging failures.

## 6. Repository structure

Framework repository:

```
dinah/
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
├── cli/                  # create-dinah + dinah tooling
├── docs/
├── scripts/
├── package.json
└── pnpm-workspace.yaml
```

Playground repository (separate; installs dinah like any consumer):

```
play-dinah/
└── apps/
```

## 7. Package responsibilities

**core** — foundational services: lifecycle, events, logging, configuration, dependency
injection.

**react** — React bindings for platform services; the component-facing API surface.

**workbench** — the application shell: activity bar, sidebar, panels, status bar. Menus
and theming live here as internal modules until they earn a package boundary.

**layout** — docking, split views, window/layout persistence.

**commands** — command registry, command palette, keyboard shortcuts.

**settings** — application configuration, schema, persistence.

**runtime** — runtime-specific implementations, `runtime/electron` first: window creation,
native dialogs, native menus, auto-update. Safe renderer–main IPC is an internal detail
here, not a package. Applications never import this directly (premise 5).

## 8. The generated application

An application developer spends nearly all their time in `src/`:

```
my-app/
├── src/
│   ├── features/
│   ├── views/
│   ├── commands/
│   ├── menus/
│   ├── services/
│   └── main.tsx
├── package.json          # scripts call the dinah CLI
└── dinah.config.ts       # the config contract (premise 3)
```

What the application does **not** contain: a process entry file, Electron/Vite config, a
build pipeline, or any reference to the runtime. dinah owns the entry and generates what
the entry needs; the application seats into the socket via `dinah.config.ts`.

## 9. Development flow

```
Feature idea
   ▼
Implement framework API        (dinah repo)
   ▼
Exercise it in the playground  (play-dinah, installed from tarball)
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
`pack tarball → create-dinah → build → smoke test` runs against the real artifacts. The
generated-from-tarball application is the ground truth; the playground is for speed.

## 10. Bootstrapping flow

```
Developer
   ▼
npm create dinah my-app
   ▼
create-dinah: copy template → rename → update package.json → install → git init
   ▼
cd my-app && npm run dev     # invokes the dinah CLI
   ▼
A workbench window opens. Ready.
```

## 11. Versioning

Packages follow semantic versioning. `create-dinah` always generates projects pinned to a
compatible, tested set of `@dinah/*` versions — a generated app never starts life on a
mismatched matrix.

## 12. Runtime independence

A first-class strategic objective (premise 5), executed in two moves:

1. **Now — the enforced invariant.** No application code names the runtime: no Electron
   modules, process/window APIs, IPC channels, or schemes. Everything reaches the runtime
   through dinah's abstractions. This is testable from day one.
2. **Phase 4 — the real test.** Introduce the runtime interfaces (`WindowService`,
   `MenuService`, `DialogService`, `FileSystemService`, …), decouple Electron behind them,
   and **prototype a Tauri backend**. The interfaces are validated by the port itself —
   not frozen speculatively before a second runtime exists.

```
        Application
            ▼
   dinah runtime API          ◀── defined and hardened in Phase 4
            ▼
  Electron │ Tauri │ future
```

dinah is not "an Electron framework". It is a desktop application platform whose first
runtime is Electron.

## 13. Roadmap

### Phase 1 — Foundation

Monorepo · Electron runtime · React integration · `create-dinah` · workbench template ·
`dinah dev`/`build`.

### Phase 2 — Workbench

Window layout · docking · panels · menus · commands · theming.

### Phase 3 — Productivity

Settings · state management · persistence storage · logging · diagnostics · testing
utilities.

### Phase 4 — Runtime abstraction

Runtime interfaces · decouple Electron · Tauri prototype · validate portability by
porting.

### Milestone A — the acceptance scenario

The platform's first honest end-to-end proof, kept visible from day one:

```
pnpm create dinah demo
cd demo
pnpm dev

The app defines one view and one command.
The command appears in the menu and on a keyboard shortcut.
Invoking it opens the view in the workbench.
The app restarts with its layout preserved.
pnpm build produces a runnable package.
```

Sliced so every stage ends with something that runs (premise 8):

| Stage | Slice | Exit condition (runs, and is run) |
| --- | --- | --- |
| 0 | Create → dev → build | `pnpm create dinah demo` generates an app with `dinah.config.ts`; `pnpm dev` opens the workbench shell; `pnpm build` produces a runnable package — dinah consumed **from a tarball** from the very first run. |
| 1 | Views | The app contributes a view; it renders in the workbench. |
| 2 | Commands & menus | The app's command appears in the menu and on a shortcut, and opens the view. |
| 3 | Layout persistence | The app restarts with its layout preserved. Milestone A complete. |

## 14. Final mental model

```text
                     Framework Repository (dinah)
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  packages/         templates/         cli/              │
│  ├── core          workbench          create-dinah      │
│  ├── react                            dinah             │
│  ├── layout                              │              │
│  ├── commands                            │              │
│  ├── workbench                           │              │
│  ├── settings                            │              │
│  └── runtime                             │              │
└──────────────────────────────────────────┼──────────────┘
                                           │
                        publish packages   │
                                           ▼
                        npm Registry (private/public)
                                           │
                     ┌─────────────────────┴─────────────────────┐
                     ▼                                           ▼
┌──────────────────────────────────┐   ┌──────────────────────────────────┐
│ Generated Application            │   │ Playground (play-dinah repo)     │
│                                  │   │                                  │
│  src/                            │   │  apps/                           │
│  ├── features/  views/           │   │                                  │
│  ├── commands/  services/        │   │  installs from tarball/registry  │
│  └── main.tsx                    │   │  dogfoods the framework          │
│  dinah.config.ts                 │   │                                  │
│                                  │   │                                  │
│  depends on @dinah/* packages    │   │  depends on @dinah/* packages    │
└──────────────────────────────────┘   └──────────────────────────────────┘
```

---

## Appendix — names

| Thing | Name |
| --- | --- |
| Framework / repo | `dinah` |
| npm scope | `@dinah/*` |
| Create package | `create-dinah` (`npm create dinah`) |
| Tooling CLI | `dinah` |
| Config contract | `dinah.config.ts` |
| Playground repo | `play-dinah` |
| First template | `workbench` |

npm registry status (checked 2026-08-03): unscoped `dinah` is taken by an unrelated
package; `create-dinah` is free; availability of the `@dinah` org for public publishing is
unverified. None of this blocks tarball/local-registry development; verify the org before
the first public publish.
