# dinah

A platform for building desktop applications.

```bash
pnpm create dinah my-app     # requires pnpm — see docs/design-and-roadmap.md §5
cd my-app
pnpm dev
```

A developer gets a fully configured desktop application, builds their domain in `src/`, and
never thinks about the runtime. Electron is the first runtime, and an implementation detail.

## This repository

This is the **framework** product — packages, template, and CLIs. A generated application is
its customer and lives in its own repository, depending on released `@dinah/*` packages,
never on framework source.

```
packages/    @dinah/* — core, react, ui, shell, layout, commands, customization,
             storage, identity, devtools, runtime, host
templates/   opinionated blueprints — a configuration of dinah's systems (workbench)
cli/         create-dinah (project generation) + dinah (dev, build, package)
docs/        premises and architecture
```

## Docs

- [docs/premises.md](docs/premises.md) — the 8 founding premises. Upstream of every decision.
- [docs/design-and-roadmap.md](docs/design-and-roadmap.md) — structure, packages, CLIs,
  development flow, roadmap.
- [docs/application-surface.md](docs/application-surface.md) — how an application layers on
  dinah: the Workbench and Host surfaces, every contribution kind, the platform services.
- [docs/guides/](docs/guides/) — onboarding: framework architecture, codebase tour.

## Development

```bash
pnpm install
pnpm check     # lint + build + typecheck + test
```

Consumers install dinah from a packed tarball or a local registry — never a workspace link.
A link resolves source paths and hides exactly the packaging failures that break a real
install, so the tarball loop is the only proof that anything works.

## Status

Milestone A, stage 1 — an application contributes a view and the workbench renders it.
Stage 2 (commands & menus) is next. See §13 of the design & roadmap doc.
