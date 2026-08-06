# Codebase tour

> **What this is.** A walk through cheshire's code in the order it actually runs. It follows one
> `pnpm dev` from the developer's keystroke to a painted window, then `build` and `package` to an
> installable application, naming the file and line at each step.
>
> **Who it is for.** A new engineer on this team, on their first day in the repository. It
> assumes [framework-architecture](framework-architecture.md) has been read — that document
> explains _why_ the shape is this shape; this one shows you the shape.
>
> **Status.** Accurate at the close of **stage 1**; pointers refreshed 2026-08-05. The codebase is
> small on purpose: about 1,550 lines of framework source across five packages. You can read all
> of it in an afternoon, and this tour is a suggestion for the order.
>
> **A warning about scale.** cheshire's design documents describe *systems* — a design system, a
> command system, storage, settings — and almost none of that is code yet. This tour is the honest
> counterweight: it walks what exists. When the two disagree, the code is right and
> [the application surface](../application-surface.md) is intent.

---

## How to read it

Open the repository beside this document. Every reference is `path:line`, and every claim is
something you can check by opening the file. Where the tour says a thing is _not_ built, that is
also worth checking — the roadmap leaves deliberate gaps, and knowing which gaps are deliberate is
half of onboarding.

Two commands before you start:

```bash
pnpm install
pnpm check        # lint + 5 builds + 5 typechecks + 22 tests — the whole gate
```

`pnpm check` is the gate. If it is green, the framework compiles and its unit tests pass. It does
**not** tell you the framework installs correctly — only the proof gate does that, and there is a
section on it at the end.

---

## Orientation: five packages, two CLIs, one template

```
cheshire/
├── packages/
│   ├── core/                  @cheshire/core              the config + contribution contracts
│   ├── shell/                 @cheshire/shell             the React shell
│   └── runtime/electron/      @cheshire/runtime-electron  window + lifecycle
├── cli/
│   ├── cheshire/                 cheshire                    dev · build · package
│   └── create-cheshire/          create-cheshire             generate an application
├── templates/workbench/       a blueprint (not a workspace package)
└── docs/
```

A **template** is an opinionated blueprint — a configuration of cheshire's systems that
`create-cheshire` materialises into an application (design & roadmap §5). `workbench` is the only one
that exists; `chat` and `community` are named shapes and nothing more. Today a template configures
very little, because there is very little to configure — that grows with the systems, not ahead of
them.

Split by who runs the code, which is the split that matters when you are looking for something:

| Runs in | Packages |
| --- | --- |
| The developer's terminal | `@cheshire/app`, `create-cheshire` |
| Electron's main process | `@cheshire/runtime-electron` |
| The browser page | `@cheshire/shell` |
| All three | `@cheshire/core` — types plus four pure functions, on two entries |

`@cheshire/core` has a second entry, `@cheshire/core/views`, and the split is not cosmetic. It holds the
contribution contract, which names React's `ComponentType`; the barrel stays React-free because
`@cheshire/runtime-electron` imports it from Electron's main process. With `skipLibCheck` on, an
unresolved `react` inside a `.d.ts` silently becomes `any` rather than failing, so the separation
is the only thing keeping that honest.

`templates/workbench` is deliberately **not** a workspace package. If it were, its dependencies
would resolve to framework _source_ through workspace links, and the one artifact meant to prove
the seam would prove an arrangement no consumer can reproduce.

---

## Part 1 — `pnpm dev`, end to end

A generated application's `package.json` has `"dev": "cheshire dev"`. Everything below follows from
those two words.

### 1. The CLI dispatches

`cli/cheshire/src/cli.ts` — a shebang, a switch, and an error handler.

The error handler at the bottom is the part worth noticing:

```ts
if (error instanceof CheshireCliError) {
  console.error(`\n${error.message}\n`)
  process.exitCode = 1
} else {
  throw error
}
```

`CheshireCliError` (`cli/cheshire/src/errors.ts:6`) means "this message is already the whole story for
the developer reading it" — printed without a stack, because a stack through framework internals
tells an application author nothing they can act on. Anything else is a bug in cheshire and keeps its
stack. When you add a CLI failure path, that is the choice you are making.

### 2. Finding and reading the application

`cli/cheshire/src/app.ts:30` — `loadApp()`.

```ts
const { module } = await runnerImport<{ default?: CheshireConfig }>(configPath)
```

Three things happen in twenty lines:

1. **`cheshire.config.ts` is the marker.** No file, no application — and the error names the fix
   (`app.ts:35`).
2. **Vite's module runner evaluates the TypeScript** (`app.ts:41`). This is the only place in
   cheshire that loads TypeScript at run time.
3. **`resolveConfig` applies defaults** (`app.ts:48`), and `CheshireConfigError` is re-wrapped as a
   `CheshireCliError` so it arrives stack-free.

The result is an `AppContext` (`app.ts:9`): the app root, the config path, the `.cheshire/` path, and
the resolved config. Every command takes one and passes it around.

Follow `resolveConfig` into `packages/core/src/config.ts:49` while you are here — it is 25 lines,
and the whole config contract is the file above it. Note the error messages: `` `cheshire.config.ts`
is missing `appId`. Add it, e.g. `appId: 'com.example.my-app'` `` — field, file and fix in one
sentence. That is the house style for anything a developer reads.

Its sibling `packages/core/src/views.ts` is the contribution contract, and reads the same way:
`defineApp:46` is identity, `resolveApp:55` validates, and every message it throws names
`src/index.ts` and the field. `resolveApp` runs in the renderer rather than here — the CLI never
looks at what an app contributes.

### 3. Generating `.cheshire/`

`cli/cheshire/src/generate.ts:35` — `generate()` writes seven files and returns the paths worth
naming.

| File | What it is |
| --- | --- |
| `index.html` | Vite's root document. Has `#root` and loads the renderer entry |
| `renderer.tsx` | Imports `mountShell`, the stylesheet, the config **and the app's `src/index`**; mounts |
| `config.ts` | The resolved config, as a TypeScript module |
| `main.mjs` | Electron's entry in development |
| `prod/main.mjs` | Electron's entry when packaged — the one that gets bundled |
| `tsconfig.json` | What typechecks the application |
| `env.d.ts` | `declare module '*.css'` |

Each carries a banner: _"Generated by cheshire. Do not edit — this file is rewritten on every run."_

Read the generator functions in order — `indexHtml:64`, `rendererEntry:91`, `configModule:110`,
`devMainEntry:126`, `prodMainEntry:146`, `tsconfig:170`. They are string templates, and the
comments above each explain the one non-obvious thing about it.

`rendererEntry` is where the two halves of the program are joined:

```js
import app from '../src/index'

mountShell({ config, app })
```

That import is the **only** place the framework reads application code, and it is a plain relative
path because `.cheshire/` lives inside the application. `hasAppEntry:102` decides whether to emit it:
an app with no `src/index.ts` still gets a running shell and an empty state, rather than a
module-resolution failure from a file the developer did not write.

The two Electron entries are the other interesting pair:

```js
// .cheshire/main.mjs — development
start(JSON.parse(process.env.CHESHIRE_RUNTIME_OPTIONS))

// .cheshire/prod/main.mjs — packaged
start({
  config: { /* baked in at build time */ },
  rendererDir: fileURLToPath(new URL('../renderer', import.meta.url)),
})
```

Development reads the environment because the dev server's port is not known when the file is
written — the server has not started yet. A packaged app has no CLI to hand it anything, so
everything is baked in and the renderer is found relative to the bundle it ships beside.

`tsconfig()` at `generate.ts:170` has the highest trap-per-line ratio in the repository; its
comment names all three traps. Do not "clean up" the explicit `include` list.

### 4. The dev server

`cli/cheshire/src/dev.ts:15` — `dev()`, and `cli/cheshire/src/renderer-config.ts:20` for the config it
uses.

The Vite config is **in code, never on disk**. The application authors no build config, so there
is no file for it to have opinions about and no config file for Vite to find —
`configFile: false` at `renderer-config.ts:22` says so literally.

Three settings are deliberate:

- `root` is `.cheshire/`, where the generated HTML lives.
- `server.fs.allow` names the **app root**, because Vite's default allowlist is derived from
  `root`, which here is the generated subdirectory. Without it, `src/` is off-limits.
- `cacheDir` is moved to `node_modules/.cheshire-vite`; the default would put a `node_modules`
  directory inside generated output.

Ordering in `dev()` matters: the server must be listening before Electron starts, or the first
window load races the port (`dev.ts:20`).

### 5. The Electron binary, and the flags

`cli/cheshire/src/electron.ts`.

`ensureElectronBinary():33` checks for the binary and downloads it if missing. This is not
defensive coding — electron 43 declares **no postinstall**. It ships its downloader as a bin
(`install-electron`) and expects someone to call it, and nobody does. Without this function a
generated app's first `pnpm dev` dies on a cryptic missing-path error from inside
`electron/index.js`.

`devLaunchFlags():72` is the most-commented function in the repository, for good reason. Read the
comment. The short version: `--no-sandbox` is **dev-only, Linux-only**, it is required because
nothing SUIDs `chrome-sandbox` inside `node_modules`, and it is a **different setting** from
`webPreferences.sandbox`, which stays `true` everywhere. If you ever find yourself simplifying
that platform check, the comment is addressed to you.

`launchElectron():87` spawns the binary with the generated entry and passes the config and dev URL
through `CHESHIRE_RUNTIME_OPTIONS`.

### 6. The main process

`packages/runtime/electron/src/main.ts` — 77 lines, and the only file in cheshire that imports
`electron`.

`start(options):59` sets the app name and identifier, waits for `whenReady`, and creates a window.
`createWindow():21` is where the security posture lives:

```ts
webPreferences: {
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
}
```

The renderer is web content and is treated as such. Application code never reaches those APIs
anyway, so none of it costs anything. Also here: `show: false` until `ready-to-show` (no white
flash), and `setWindowOpenHandler` sending anything the app does not own to the user's browser
rather than a chrome-less Electron window.

Note what the file does **not** do: it does not read a config file, parse TypeScript, or know
about Vite. It is handed a plain object and starts. That is what makes it packageable.

### 7. The renderer

The generated `renderer.tsx` calls `mountShell` from
`packages/shell/src/mount.tsx:26`, which validates the app's default export with `resolveApp`,
sets `document.title` from the config, and renders `<Workbench>` into `#root` inside
`<StrictMode>`.

`MountOptions.app` is typed `unknown`, deliberately. `defineApp` already checks the shape at the
line the developer wrote; typing it here would only move a failure into a generated file and
report it there. Anything that gets past `defineApp` is caught by `resolveApp`, whose messages
name `src/index.ts`.

`packages/shell/src/Shell.tsx:24` is the shell: an activity bar, a sidebar, an editor
area, a status bar — four CSS grid regions. The sidebar lists the contributed views and
`ActiveView:73` renders the active one under the shell's own chrome. `EmptyState:85`
survives for an app that contributes nothing.

The active view is held in `useState` **in the shell**, not passed in. An application declares
what exists and never what is on screen — which is what leaves stage 3 (layout persistence)
somewhere to live that an app cannot contradict.

`shell.css` is plain CSS with custom properties and a `prefers-color-scheme` block. No
Tailwind, no CSS-in-JS: the shell ships as a stylesheet a consumer imports.

**You now have a window, with the application's view in it.** Total framework code executed: on
the order of 400 lines.

---

## Part 2 — `pnpm build`

`cli/cheshire/src/build.ts:30`.

Same first two steps as `dev` — load the config, generate `.cheshire/` — then three more:

1. **Typecheck the application** (`build.ts:35`). It spawns `tsc -p .cheshire/tsconfig.json` using
   the TypeScript the _framework_ depends on, so the application does not need one. Errors come
   out as `src/index.ts(11,14): error TS2322: ...` — the app's file, the app's line, no framework
   stack.
2. **Build the renderer** — the same Vite config as dev, with `build.outDir` and `base: './'`,
   because a packaged renderer is loaded from a `file://` path and not from the root of an origin.
3. **Build the main process** (`cli/cheshire/src/main-config.ts:27`).

That third step is the one to read properly. `RUNTIME_PROVIDED` at `main-config.ts:17` is
`electron` plus every Node builtin, in both bare and `node:` form. They stay external because they
are baked into the Electron binary and exist only at run time — you cannot bundle them, and you do
not need to. Everything else, including all of cheshire's own packages, is inlined
(`ssr: { noExternal: true }` at `main-config.ts:49`).

The output is one self-contained `.cheshire/dist/main/main.mjs`. `entryFileNames: 'main.mjs'` is
forced so the entry is unambiguously ESM to Electron regardless of the surrounding
`package.json`.

---

## Part 3 — `pnpm package`

`cli/cheshire/src/pack.ts:26` — `packageApp()` builds, then hands the result to electron-builder's
programmatic API. `builderConfig():44` is the whole configuration, derived from the app's config;
nothing is authored by the app.

Four entries there are load-bearing:

**`electronVersion`.** electron-builder reads the Electron version from the _application's_
dependencies, and the application does not have one — the framework owns the runtime. So the CLI
resolves it from its own dependency and passes it in (`pack.ts:86`).

**`files` with `!node_modules/**`.** The renderer and main bundles are the entire package. The
negation is not redundant: electron-builder collects production dependencies in a pass of its own,
_outside_ these patterns. Without it, an app that names `@cheshire/app` as a runtime dependency ships
Vite, TypeScript and electron-builder inside its own asar — measured, during stage 0, at 74 MB
versus 396 KB.

**`extraMetadata`.** Sets `main` to the bundled entry, and `desktopName` so Linux desktop
environments can associate the running window with its launcher via WM_CLASS.

**`npmRebuild: false`.** Nothing here has a native binding, and electron-builder's rebuild step
silently finds nothing under pnpm's hoisted linker anyway — it reports success while changing
nothing. When a native module does arrive, that rebuild gets done deliberately, not by leaving
this on.

Verify the result yourself:

```bash
pnpm package --dir                                       # unpacked, no installer toolchain
du -sh dist/linux-unpacked/resources/app.asar            # ~396K
npx --yes @electron/asar list dist/linux-unpacked/resources/app.asar
```

The listing should be exactly the two built trees and a `package.json`. If `node_modules` appears
there, one of the two defences above has broken.

> **Running the unpacked build on Linux** aborts with _"The SUID sandbox helper binary was found,
> but is not configured correctly"_. That is correct behaviour, not a bug: `--dir` output was never
> installed, so `chrome-sandbox` is not root-SUID. A real installation's postinstall does that.
> To smoke-test the directory, pass `--no-sandbox` **by hand**, on the command line. cheshire never
> puts that flag in a package.

---

## Part 4 — `create-cheshire`

`cli/create-cheshire/src/`. Four small files.

- **`identity.ts:26`** — `deriveIdentity()` turns one typed word into `name`, `appId` and
  `productName`. The guesses land in `cheshire.config.ts` as ordinary editable values, rather than
  behind prompts nobody wants to answer before seeing the app run once.
- **`scaffold.ts:31`** — copies the template, restores `.gitignore`, and substitutes `{{tokens}}`.
- **`local-tarballs.ts:16`** — `--from-tarballs`, for the proof gate.
- **`cli.ts`** — argument parsing, `git init`, and the dependency install.

Two details there are non-obvious and both bite silently:

**`_gitignore`.** npm strips a real `.gitignore` out of a package, so the template carries the
file under a name that survives packing and generation renames it back (`scaffold.ts:29`). Without
this, every generated repository commits `node_modules`.

**The template ships inside the package.** It lives at the repository root, where it is edited and
reviewed on its own, and `cli/create-cheshire/scripts/copy-template.mjs` copies it into
`dist/template` at build time — a published generator has no repository to read from.

`useLocalTarballs()` exists for one reason: before a release there is nothing published to install
from, so the gate packs tarballs and generates against those. It rewrites the app's
devDependencies to `file:` specifiers, and appends `overrides:` to the app's `pnpm-workspace.yaml`
— because `pnpm pack` substitutes a version for `workspace:*`, so a packed `@cheshire/app` asks for
`@cheshire/core@0.0.0`, which no registry has. It changes nothing else about the generated app.

---

## Part 5 — the proof gate

**This is the part of the process most likely to feel like overhead and most likely to save you.**

The rule ([premise 4](../premises.md)): _never trust a workspace link_. Links resolve source
paths, so a package whose `exports` point at a `.ts` file — or one that ships with no type
declarations at all — works perfectly through a link and fails on every real install.

Run it:

```bash
# 1. build and pack every package into .local/tarballs
pnpm pack:local

# 2. generate, install, and run for real
cd .local/gate
pnpm exec create-cheshire demo --from-tarballs "$PWD/../tarballs"
cd demo && pnpm dev && pnpm build && pnpm package --dir
```

**A generated application is pnpm-only, and `create-cheshire` enforces it** — it runs `pnpm install`
whatever invoked it, and refuses with a message naming the fix if pnpm is absent. Two things make
that non-negotiable: `pnpm-workspace.yaml` carries `nodeLinker: hoisted`, which npm and yarn have
no equivalent for and electron-builder needs on Windows; and in tarball mode the `overrides:` block
that resolves every `@cheshire/*` request lives in that same file, which nothing else reads. Detecting
the caller's package manager used to be the behaviour, and it offered a choice cheshire cannot honour:
npm 404s in tarball mode, and "succeeds" in registry mode while silently ignoring the linker.

After that, the loop while you work on the framework is one command plus one install:

```bash
pnpm pack:local --refresh .local/gate/demo     # build → pack → repoint
(cd .local/gate/demo && pnpm install)
```

`scripts/pack-local.mjs` stamps a **unique version per pack** (`0.0.0-dev.<timestamp>`), which is
the whole reason that install is enough. While every package sat at `0.0.0`, a repack was
_invisible_: the consumer's lockfile pinned the old tarball's integrity and pnpm reinstalled that
copy from the store, `--force` included, so the only way through was wiping `node_modules` **and**
the lockfile. A stamped version puts the version in the filename too, so the `file:` specifier
changes and there is nothing stale left to resolve to. `--refresh` rewrites those specifiers, and
the `overrides:` block, in a consumer that already exists.

The trap the stamping does _not_ remove:

**Framework source is never in a consumer's dev module graph.** After editing framework code you
must pack again. Skip it and your change simply does not appear, with nothing said about why —
which is exactly why the script builds before it packs rather than trusting `dist/`.

`.local/gate` and `.local/scratch` are the working consumers. Both are gitignored.

---

## Where the seams are

What stage 2 and beyond will touch, and what is deliberately empty today:

| Seam | Today | Next |
| --- | --- | --- |
| `AppDefinition` | `views` | Stage 2: `commands` and `menus` — the command system's contract |
| `ViewContribution` | `id`, `title`, `component` | Icons, placement, per-view state |
| Active view | `useState` in `Workbench` | Stage 3: persisted across restarts |
| `CheshireConfig` | `appId`, `productName`, `window` | A `services` block — how a template declares which systems are switched on |
| `@cheshire/runtime-electron` | One window, **no IPC and no preload** | Stage 2a: a preload membrane, window controls, a CSP |
| Design system | Hand-written CSS in `@cheshire/shell` | `@cheshire/ui` — components, icons, a two-layer token contract |
| Host process | Does not exist | The application's own backend, brokered by cheshire (surface doc §4) |
| Runtime abstraction | Electron named directly, inside the runtime package | Phase 4, validated by a Tauri port |

Read that table against [the application surface](../application-surface.md) and the size of the
gap is the point: the right-hand column is design, the left is code. Nothing in the right column
is load-bearing until a stage builds it.

And the gaps that are gaps rather than seams — worth fixing when they get in your way, not before:
no application icon in a packaged build, and no watch on the main process during `dev`.

---

## Poking at it yourself

Small experiments, roughly in order of how much they teach:

1. **Break the app's types.** Add `export const x: number = 'no'` to a generated app's
   `src/index.ts` and run `pnpm build`. You should get the app's own file and line, and no
   framework stack. Then break the contract instead — drop the `id` from the view, or point
   `component` at a string — and watch `defineApp` catch it at the line you wrote.
2. **Contribute a second view.** Add one to the `views` array and watch it appear in the sidebar.
   Give it the same `id` as the first and you get `resolveApp`'s duplicate-id error, naming
   `src/index.ts`.
3. **Read the generated directory.** `cat .cheshire/renderer.tsx .cheshire/prod/main.mjs`. Then delete
   `.cheshire/` entirely and run `pnpm dev` — it comes straight back.
4. **Change the config.** Set `window.width` in `cheshire.config.ts` and restart. Follow the value
   from the file through `loadApp` to `createWindow`.
5. **Look inside a package.** `tar tzf .local/tarballs/cheshire-shell-0.0.0.tgz` — `dist/lib` and
   `dist/types`, and no source. If `dist/types` were ever missing, an app would install with no
   type declarations and every import would be `any`. That has happened once.
6. **Inspect an asar.** As in Part 3. Watch for anything that is not the two built trees.
