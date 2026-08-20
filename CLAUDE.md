# Cheshire — project instructions

Cheshire is a **platform for building desktop applications**: `npm create cheshire my-app` gives
a developer a fully configured desktop app; they build their domain in `src/` and never think
about the runtime. Cheshire is the product, and what matters is **the line between it and an
application built with it**.

## Source of truth — read in order, do not duplicate here

1. **`docs/principles.md`** — 6 principles, upstream of every decision. A decision that
   contradicts one is wrong, or the principle is amended explicitly first.
2. **`docs/design-and-roadmap.md`** — structure, packages, the CLIs, development flow, roadmap,
   Milestone A and its stage slicing (§12). Names live in its appendix.
3. **`docs/application-surface.md`** — how an application layers on Cheshire: the two surfaces,
   every contribution kind, the platform services. Settles the **layering**, deliberately not the
   API shape of anything unbuilt. Its §7 is the live list of open decision points.

`docs/references/` is **deep-dive and lookup material, not source of truth**: framework-architecture
and codebase-tour explain what 1 and 2 decide, and a per-system reference (command-system) settles
one system's mechanics downstream of 3. Only `path:symbol` cites are gated, so its prose goes stale
— refresh at stage boundaries, never resolve a disagreement in its favour. `docs/guides/` is
reserved for **how-to** material and is empty; a reference answers *how does this work*, a guide
*how do I do this*.

## Current position

**Read `.local/status.md` at the start of a session, before planning or editing.** It holds the
live state — package layout, what stage is next, review status, held decisions, the local-registry
loop — and is updated at every stage boundary. Everything below this line is a rule that does not
change with the stage.

## How we work — this overrides default agent instincts

- **Build with vision.** Scope and direction are the product owner's. No evidence-gating, no YAGNI
  vetoes, no "wait for a second consumer" arguments — not in planning, code, review, or docs. The
  one survivor: a genuinely hard-to-reverse decision (published API name, persisted format, wire
  protocol) is surfaced as a one-line decision point for the owner — never blocked, never decided
  unilaterally.
- **Momentum over meta-work.** Every stage ends with something that runs, and it is actually run.
  Consolidation, documentation and refactoring queue **behind** the next runnable milestone.
  Meta-work recursion killed the last attempt.
- **One bounded step, then show.** No long unbroken pushes ending in a wall of text.
- **Write matter-of-fact prose.** No announcing a claim before making it, no define-by-comparison
  in anything a newcomer reads, no restating what a table or heading already carries. When the
  owner quotes text and says *replace*, the text is the content, not a brief.
- **The user runs installs and git mutations.** Hand over `pnpm install`-type commands; read-only
  git is fine; never stage, commit or push — and never `checkout`, `restore`, `clean` or `reset` a
  tracked file. Cleanup takes an explicit path, never `.`; undo an edit with the tool that made it.
  (Paid for once: `git checkout -- .` appended to a scratch-dir cleanup reverted a stage of
  uncommitted work.)

## Hard invariants — already paid for, do not relearn

- **Ships built; a real install is the only proof.** No framework source reaches a consumer; an
  app's build compiles app code only. **Never trust a workspace link** — it resolves source paths
  and hides exactly the packaging failures that break a real install.
- **A gate must live outside the framework repository.** `.local/gate/demo` sat inside it and
  silently inherited the framework's `allowBuilds: { electron: true }`, which the template does not
  ship; every gate passed and the first app generated outside had no Electron binary. Proximity, not
  linkage. Story: codebase-tour, part 5.
- **Framework `src/` is never in a consumer's dev module graph.** After editing framework source,
  `registry:publish` then `pnpm update --latest "@cheshire/*"`, or the change silently does not
  appear.
- **Two tools write one `dist/`, and neither may own it.** Vite writes `dist/lib`, `tsc -b` writes
  `dist/types`. A tool that empties its output directory deletes the other's, and `tsc -b` then
  declines to re-emit what its tsbuildinfo says is current.
- **No source maps ship.** `sourceMap` and `declarationMap` are off in `tsconfig.base.json` because
  every package is `files: ["dist"]`, and a map would ship the source of a framework that promises
  built output only.
- **Packages cross-reference with `workspace:^`.** Generated apps declare a caret range, never an
  exact pin — `create-cheshire` stamps its own version, so every package moves together.
  `pnpm publish` does **not** build; `dist` is whatever was last built.
- **A reachability check is a bounded TCP probe, never `curl`.** `registry:publish` refuses unless
  the local registry answers, and `curl` against a dead port hangs for its full timeout instead of
  failing fast.
- **The framework owns the entry.** An app supplies `cheshire.config.ts` and `src/` only — never a
  process entry file, build config or runtime wiring. `src/index.ts` is the app's own file: the
  framework *imports* it and never writes it.
- **An app declares what exists, never what is on screen.** Contributions are values, not calls;
  the shell owns which view is active, which is what leaves layout persistence somewhere to live
  that an app cannot contradict.
- **App code never names the runtime.** No Electron modules, process/window APIs, IPC channels or
  protocol schemes above the framework line. Enforced from day one, which makes phase 4 a port.
- **`--no-sandbox` is a dev-only, Linux-only launch flag** and must never reach a packaged build.
  It is **not** `webPreferences.sandbox`, which stays `true` everywhere. The reasoning lives at the
  call site in `packages/cli/src/electron.ts` — keep it there, or someone collapses the platform
  check and ships it.
- **No plugin system.** The application is the only extension.
- **The settings system selects; it never creates.** A setting that adds an option rather than
  choosing among existing ones is an extension, which principle 3 forbids. A setting is an option
  space, a default, and whether the next level may change it; all three inherit **platform →
  application → user**. Named `settings`, not `customization` (2026-08-18).
- **Only the user level is persisted, and its store is main's** (2026-08-19). Defaults are
  compiled-in constants, so the three levels are not three stores. Main is alive before the renderer
  and alive without a host. Layout state is separate. Reasoning: design & roadmap §6,
  application-surface §5.
- **Proof gate before a milestone closes:** `registry:publish` → `create-cheshire --registry` →
  build → smoke test, against the real artifacts.

## Locked decisions — published surface, do not relitigate

- Packages are **ESM-only**, built with Vite (UI) and `tsc -b` (node code + types) — no tsup.
- The app writes `defineConfig({ appId, productName, window })` imported from `@cheshire/app`.
- The Electron runtime is **`@cheshire/runtime-electron`**, so Tauri slots in beside it at phase 4.
- An app declares contributions by **default-exporting `defineApp(...)` from `src/index.ts`**.
- A view is `{ id, title, component }`, where `component` is a plain React component.
- The active view is the **shell's** state, never the app's.

## Gates

`pnpm check` is the full gate, plus the proof gate above at milestone boundaries. Currently: lint ·
6 builds · 6 typechecks · 29 tests · 50 cites · 6 packages placed · 21 manifest paths. Run it
rather than trusting these numbers.

Three are scripts, each written because something silent got through. **`check-cites.mjs`** — every
`path:symbol` cite resolves, ambiguity is an error; line-number cites rot and nothing can check
them. **`check-layout.mjs`** — directory basename equals name minus scope. **`check-dist.mjs`** —
every `bin` and `exports` target exists on disk; it also runs inside `registry:publish`, and was
written after a package shipped a `bin` pointing at a file `tsc -b` never emitted while every other
gate was green.

**No gate sees prose**, and three lessons came out of that. Stale diagrams, evidence-gating
language and comments that went false have each been found by reading. A cite naming a *mechanism*
survives a rewrite; one quoting a *phrasing* does not. Numeric `§` cross-references break silently —
one renumbering cost 11 pointers across 5 files. And a reference is only correct while the layering
above it holds still.

A generated app's window is inspected with **`agent-browser`** (`agent-browser connect 9333` while
`cheshire dev` runs — the CLI already passes `--remote-debugging-port`). Prefer it to a hand-rolled
CDP script; `agent-browser skills get electron` documents the flow.

## Prior work

The previous attempt is at `~/Repos/msh/x-bb`, its reference app at `~/Repos/msh/new-ru-soam`. An
**evidence bank** — consult it for concrete technical questions (packaging, workbench surface,
error recovery). Never import its process apparatus, and never cite it in Cheshire's docs.

**VS Code is the primary source of inspiration; ru-soam is consulted for deviations** — and
preferred only after the reasoning has been discussed and found to apply here, since a deviation
nobody reasoned through is a defect. The test: **what forced this on VS Code, and does it force
us?** Most of its machinery exists because extensions are late-bound, third-party, JSON-declared and
independently versioned; strip those causes and the mechanism shrinks. Worked end to end in
`docs/references/command-system.md`.
