# cheshire

A platform for building desktop applications.

```bash
pnpm create cheshire my-app     # requires pnpm — see docs/design-and-roadmap.md §5
cd my-app
pnpm dev
```

A developer gets a fully configured desktop application, builds their domain in `src/`, and
never thinks about the runtime. Electron is the first runtime, and an implementation detail.

## This repository

This is the **framework** product — packages, template, and CLIs. A generated application is
its customer and lives in its own repository, depending on released `@cheshire/*` packages,
never on framework source.

```
packages/    @cheshire/* — core, react, ui, shell, layout, commands, customization,
             storage, identity, devtools, runtime, host
templates/   opinionated blueprints — a configuration of cheshire's systems (workbench)
cli/         create-cheshire (project generation) + @cheshire/app (dev, build,
             package — and the only package an application imports from)
docs/        principles and architecture
```

## Docs

- [docs/principles.md](docs/principles.md) — the 6 founding principles. Upstream of every decision.
- [docs/design-and-roadmap.md](docs/design-and-roadmap.md) — structure, packages, CLIs,
  development flow, roadmap.
- [docs/application-surface.md](docs/application-surface.md) — how an application layers on
  cheshire: the Shell and Host surfaces, every contribution kind, the platform systems.
- [docs/guides/](docs/guides/) — onboarding: framework architecture, codebase tour.

## Development

```bash
pnpm install
pnpm check     # lint + build + typecheck + test
```

Consumers install cheshire from npm or a local registry — never a workspace link. A link
resolves source paths and hides exactly the packaging failures that break a real install, so a
real install is the only proof that anything works.

## Status

Milestone A, stage 1 — an application contributes a view and the shell renders it.
Stage 2 (commands & menus) is next. See §13 of the design & roadmap doc.

Published at `0.1.2`. Pre-1.0 and moving: the surface will change before it settles.
