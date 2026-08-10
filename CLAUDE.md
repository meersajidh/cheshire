# cheshire — project instructions

cheshire is a **platform for building desktop applications**: `npm create cheshire my-app` gives
a developer a fully configured desktop app; they build their domain in `src/` and never
think about the runtime. Two products: the **framework** (this repo) and the **generated
application** (its customer). The developer is the customer; developer experience is the
product.

## Source of truth — read in order, do not duplicate here

1. **`docs/principles.md`** — 6 principles, upstream of every decision. A decision that
   contradicts one is wrong, or the principle is amended explicitly first.
2. **`docs/design-and-roadmap.md`** — structure, packages, the two CLIs, development flow,
   roadmap, and Milestone A with its stage slicing (§13). Names live in its appendix.
3. **`docs/application-surface.md`** — how an application layers on cheshire: the two surfaces
   (Shell and Host), every contribution kind, the platform services and which zone each sits
   in. Settles the **layering**, deliberately not the API shape of anything unbuilt — that is the
   building stage's call. Its §7 is the live list of open decision points.

`docs/guides/` (framework-architecture, codebase-tour) is onboarding material, not source of
truth — it explains and walks what 1 and 2 decide. It cites `path:line`, so it goes stale;
refresh it at stage boundaries, and never resolve a disagreement in its favour.

## Current position

**The framework is `cheshire`, published on npm at `0.1.2` (2026-08-06).** It was `dinah`, then
briefly `mogget`; both died at the registry — `dinah`'s bare name is a maintained DynamoDB client,
and the `@mogget` org was already owned. **The rule that came out of it: secure the scope, not the
name.** A bare name is a per-package lottery; an org reserves the whole roadmap at once.

Six packages: `@cheshire/core`, `@cheshire/shell`, `@cheshire/runtime-electron`,
**`@cheshire/app`**, **`@cheshire/cli`** and `create-cheshire`. There is deliberately **no bare
`cheshire` package** — that name is taken by an unrelated dormant project — so `@cheshire/cli`
installs the `cheshire` command. A bin name lives in the application's own `node_modules/.bin`
and never touches a registry, which is why every user-visible string (`pnpm create cheshire`,
`cheshire dev`, `cheshire.config.ts`) survived both the rename and the split unchanged.

**Two names are application-facing and the rest are not.** `create-cheshire` generates the
application; **`@cheshire/app` is its entire surface onto cheshire thereafter** — an application
imports that name and no other `@cheshire/*` package, ever. `core`, `shell`,
`runtime-electron` and every system package to come are the framework's internal factoring.
`@cheshire/cli` is a devDependency that supplies a command, not an import.

**A package's directory basename is its name with the scope stripped**, flat under `packages/`
— `packages/runtime-electron`, `packages/create-cheshire` (stripping an absent scope is a
no-op, so the rule has no exceptions). `scripts/check-layout.mjs` gates it, and
`pnpm-workspace.yaml` is one glob because of it.

**Entries split on two axes, and `@cheshire/app` is `export *` because of it.** A framework
package's *public* entry is exactly its application-facing API; framework-internal API lives on
a matching `internal` entry (`@cheshire/core/internal`, `@cheshire/core/views/internal`). That
is what makes forwarding whole entries safe — a hand-listed re-export drifts silently, since a
symbol added upstream is simply absent downstream with no error anywhere. Crossing that is the
second axis, runtime environment: the barrel stays React-free because
`@cheshire/runtime-electron` imports it from the main process, so React-touching API sits on
`./views` and later `./react` and `./ui`.

**Stage 1 — complete.** An app contributes a view and the shell renders it.
`src/index.ts` default-exports `defineApp({ views })`, the generated renderer imports it by
relative path, and the sidebar lists the views while the editor area renders the active one.
Verified on a freshly generated app installed for real: the view renders in `dev`,
editing it updates the window with no restart, and the packaged app renders the same view
from inside its asar. **Stage 2 (commands & menus: the app's command appears in the menu and
on a shortcut, and opens the view) is next** — it extends the same `AppDefinition` object;
nothing about the mechanism changes. **Stage 2 is on hold** while the owner reviews the
design docs; the plan is `.local/plans/stage-2.md` (Part 0 committed, Part 1 not started).
It splits into **2a** — frameless window, preload membrane, CSP, window controls, cheshire's own
title bar — and **2b** — commands, keybindings, menu bar. The preload lands in 2a regardless
of the menu decision, because `frame: false` means cheshire draws the window controls.

**The local registry is the whole consumer loop — there is no second mechanism.** `pack:local`
and `create-cheshire --from-tarballs` were retired on 2026-08-07; the registry does everything
they did and proves what they could not — that a scope is readable, that `pnpm create cheshire`
resolves `create-cheshire` by name, that a transitive dependency is reachable.
`pnpm registry:start` (Verdaccio on :4873, foreground), `registry:publish`, `registry:status`,
`registry:reset`. One command each side:

```
pnpm registry:publish          # framework repo: build → stamp → publish all five
(cd <consumer> && pnpm update --latest "@cheshire/*")
```

**`--latest` is load-bearing.** A plain `pnpm update` resolves the caret correctly and then
rewrites the specifier as an exact pin, so it works once and is a silent no-op forever after —
measured, and it cost a debugging session. `--latest` follows the `latest` dist-tag, which every
publish moves. `create-cheshire --registry` also writes `.npmrc` into the generated app
(`create-cheshire/src/cli.ts:pinRegistry()`); without it every later command in that app resolves from npmjs.org and
fails naming a version that only exists locally.

**`registry:publish` stamps `<next patch>-dev.<timestamp>` every time, and that is what makes
`pnpm update` enough.** Republishing one version is impossible on both sides and it was measured,
not guessed: Verdaccio rejects it with `EPUBLISHCONFLICT`, has no config to relax that, and
corrupts `_attachments` while rejecting (verdaccio#874); pnpm ≥10.34 makes a lockfile integrity
mismatch a hard failure that neither `--force` nor `pnpm update` will bypass — only
`--update-checksums`, which is a supply-chain guard, not a dev loop. A fresh version has no
conflict, correct integrity, and is admitted by the caret range `create-cheshire` stamps into the
generated app (`create-cheshire/src/cli.ts:versions()`), since every dev publish is a higher prerelease of the same patch.

**Consumers live outside this repository**, under `~/Repos/msh/play-cheshire/` — see the gate
invariant below. Nothing under `.local/` is a consumer any more.

Two rules make a registry test mean anything, both paid for the hard way. **Aim the customer path
with `PNPM_CONFIG_REGISTRY`, never `npm_config_*`** — pnpm 11 reads its own
`~/.config/pnpm/config.yaml` and the npm variables are silently inert, so every early "local
registry" test actually resolved from npm and looked like a caching bug. And **design the test so
the two registries disagree**: publish locally at a version npm does not have, or matching
versions resolve cleanly on either side and prove nothing. Mechanics, flags and the
`minimumReleaseAge` friction: `docs/guides/codebase-tour.md`, "the local registry".

**Vocabulary, settled 2026-08-06.** Capabilities are **systems**, reached through named
**services** via one typed hook from `@cheshire/react`. An application *declares into* a system
and never implements one. **`workbench` is now a template name only** — the package is
`@cheshire/shell`. The full vocabulary, the systems list and the shell's three zones:
`docs/design-and-roadmap.md` §2 and §7.

*Update this section at every stage boundary.*


## How we work — this overrides default agent instincts

- **Build with vision.** Scope and direction are the product owner's. No evidence-gating,
  no YAGNI vetoes, no "wait for a second consumer" arguments — not in planning, code,
  review, or docs. The one survivor: a genuinely hard-to-reverse decision (published API
  name, persisted format, wire protocol) is surfaced as a one-line decision point for the
  owner to call — never blocked, never decided unilaterally.
- **Momentum over meta-work.** Every stage ends with something that runs, and it is
  actually run. Consolidation, documentation, and refactoring queue **behind** the next
  runnable milestone, never in front of it. Meta-work recursion killed the last attempt.
- **One bounded step, then show.** Do one step, show the result, continue. No long
  unbroken pushes ending in a wall-of-text summary.
- **The user runs installs and git mutations.** Hand over `pnpm install`-type commands to
  run; read-only git is fine; never stage, commit, or push — and never `checkout`,
  `restore`, `clean`, or `reset` a tracked file. Cleanup takes an explicit path, never `.`;
  undo an edit with the tool that made it. (Paid for once: `git checkout -- .` appended to a
  scratch-dir cleanup reverted a stage of uncommitted work.)


## Hard invariants — already paid for, do not relearn

- **Ships built; a real install is the only proof.** No framework source reaches a
  consumer; an app's build compiles app code only. **Never trust a workspace link** —
  links resolve source paths and hide packaging failures (e.g. `exports` pointing at `.ts`
  under `node_modules` fails on a real install; a link hides it completely). The
  playground (`play-cheshire`, external repo) and all gates consume cheshire from the local
  registry.
- **A gate must live outside the framework repository.** `.local/gate/demo` sat *inside* it
  and silently inherited settings it was supposed to be proving it did not need: the
  framework's `allowBuilds: { electron: true }` reached it, the template shipped no such
  allowlist, and every gate passed. The first application generated outside the repo — from
  the published 0.1.0 packages — installed cleanly and then had no Electron binary to launch,
  because pnpm 10+ silently skips a dependency's install scripts unless allowlisted. Same
  class of blind spot as a workspace link: proximity, not linkage. Move `.local/gate` out.
- **Consequence of installed consumption:** framework `src/` is never in a consumer's dev
  module graph. After editing framework source, `pnpm registry:publish` then
  `pnpm update --latest "@cheshire/*"` in the consumer, or the change silently does not
  appear — with nothing said about why.
- **Two tools write one `dist/`, and neither may own it.** Vite writes `dist/lib`, `tsc -b`
  writes `dist/types`. A tool that empties its output directory silently deletes the other's
  output, and `tsc -b` then declines to re-emit what its tsbuildinfo says is current. A
  workspace link would never have shown this.
- **No source maps ship.** `sourceMap` is off in `tsconfig.base.json` because every package is
  `files: ["dist"]` and a map would ship the source of a framework that promises built output
  only. `declarationMap` likewise — it points at a `src/` that never ships.
- **Packages cross-reference with `workspace:^`**, so a patch to `@cheshire/core` does not
  strand consumers. Generated apps declare a caret range (`^<current>`), never an exact pin:
  `create-cheshire` stamps its own version, so all five move together or a generated app asks
  for a version that does not exist. Note `pnpm publish` does **not** build — `dist` is
  whatever was last built.
- **A reachability check is a bounded TCP probe, never `curl`.** `registry:publish` refuses
  unless the local registry answers, because without that guard a mistyped flag reaches
  npmjs.org — but `curl http://localhost:4873` was measured hanging for its full timeout
  against a dead port instead of failing fast.
- **The framework owns the entry.** An app supplies `cheshire.config.ts` and `src/` only —
  never a process entry file, build config, or runtime wiring. `src/index.ts` is the app's
  own file, not a framework entry: the framework *imports* it, and never writes it.
- **An app declares what exists, never what is on screen.** Contributions are values, not
  calls; the workbench owns which view is active, which is what leaves layout persistence
  somewhere to live that an app cannot contradict.
- **App code never names the runtime.** No Electron modules, process/window APIs, IPC
  channels, or protocol schemes above the framework line. Enforced from day one, and the
  runtime interfaces are designed with the runtime layer — a port validates them and is
  expected to expose gaps, but nothing waits on one being scheduled.
- **Proof gate before a milestone closes:** `registry:publish` → `create-cheshire --registry`
  → build → smoke test, against the real artifacts.
- **`--no-sandbox` is a dev-only, Linux-only launch flag** and must never reach a packaged
  build. Ubuntu 22+ AppArmor blocks Electron's unprivileged-userns helper and nothing SUIDs
  `chrome-sandbox` inside `node_modules`; an installer's postinstall does, so a real
  installation needs no flag. It is **not** `webPreferences.sandbox`, which stays `true`
  everywhere. The reasoning lives at the call site in `packages/cli/src/electron.ts` — keep it
  there, or someone collapses the platform check and ships it.
- **No plugin system.** First-party surface only; apps contributing views/commands/menus
  is the platform's ordinary surface, not a plugin mechanism.

## Locked decisions — published surface, do not relitigate

- Packages are **ESM-only**, and build with Vite (UI) and `tsc -b` (node code + types) — no tsup.
- The app writes `defineConfig({ appId, productName, window })` imported from `@cheshire/app`.
- The Electron runtime is **`@cheshire/runtime-electron`**, so a Tauri backend slots in beside it
  at Phase 4.
- An app declares contributions by **default-exporting `defineApp(...)` from `src/index.ts`**.
- A view is `{ id, title, component }`, where `component` is a plain React component.
- The active view is the **shell's** state, never the app's.

## Gates

Established in stage 0. `pnpm check` is the full gate, plus the proof gate above at milestone
boundaries. Currently: lint · 6 builds · 6 typechecks · 29 tests · 43 cites · 6 packages placed ·
21 manifest paths. Run it rather than trusting these numbers — they go stale, the gate does not.

Three of those are scripts, and each exists because something silent got through:

- **`check-cites.mjs`** — every `path:symbol` cite resolves, and ambiguity is an error rather than
  a guess. Line-number cites rot on any edit above them and nothing can check them.
- **`check-layout.mjs`** — a package's directory basename is its name minus scope. `cli/cheshire`
  published as `@cheshire/app` for months; a directory name reaches no consumer, only a reader.
- **`check-dist.mjs`** — every `bin` and `exports` target a manifest promises exists on disk. It
  also runs inside `registry:publish`, the last point before artifacts leave. Written after a
  package shipped with a `bin` pointing at a file `tsc -b` never emitted, while **every other
  gate was green** — none of them look inside `dist/`, and `pnpm publish` packs rather than builds.

**No gate sees prose.** Stale diagrams, evidence-gating language, and comments that went false
while staying put have each been found by reading and never by a gate.

A generated app's window is inspected with **`agent-browser`** (`agent-browser connect 9333`
while `cheshire dev` runs — the CLI already passes `--remote-debugging-port`). Prefer it to a
hand-rolled CDP script; `agent-browser skills get electron` documents the flow.

## Prior work

The previous attempt lives at `~/Repos/msh/x-bb` (and its reference app at
`~/Repos/msh/new-ru-soam`). It is an **evidence bank** — consult it only when a concrete
technical question arises (packaging, workbench surface, error recovery). Never import its
process apparatus, and never cite it in cheshire's docs; cheshire's rules stand on their own
merits.
