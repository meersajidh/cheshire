# The command system

> **What this is.** The full design of one system: how an application declares a command, how a
> keystroke or a menu or the palette reaches it, and who is allowed to know what.
>
> **Status.** Design, written 2026-08-16. The contract and the first slice land in **stage 2b**;
> everything else is marked. **✅ built · ◐ stage 2b · ○ later.** Where this document and the code
> disagree, the code is right.
>
> **Upstream:** [principles](../principles.md) → [design & roadmap](../design-and-roadmap.md) §3
> → [the application surface](../application-surface.md) §1. Those settle *that* there is a
> command system and which side of the line it sits on. This settles *how it works*.

---

## 1. The test

Almost every piece of this system has an obvious VS Code answer, and **most of VS Code's command
machinery exists to solve problems Cheshire does not have.** So every mechanism below is put
through one question:

> **What forced this on VS Code, and does it force us?**

Its extensions are separately loaded artifacts: late-bound, third-party, declared in JSON,
versioned independently of the host. Nearly every mechanism traces back to one of those four
facts. Cheshire's application is first-party TypeScript compiled into the same bundle as the shell
([principle 3](../principles.md)) — so each time the answer is "nothing forces us", the mechanism
shrinks or disappears. §8 is the whole system scored against it.

---

## 2. The command is a value

✅ the pattern · ◐ the type

An application declares commands the same way it declares views — as plain values in the object
it default-exports from `src/index.ts`:

```ts
// src/commands.ts
import type { CommandContribution } from '@cheshire/app'

export const commands: CommandContribution[] = [
  {
    id: 'demo.showWelcome',
    title: 'Show Welcome',
    shortcut: 'Mod+1',
    run: (ctx) => ctx.showView('welcome'),
  },
]
```

```ts
// src/index.ts — the assembly point
import { defineApp } from '@cheshire/app'
import { views } from './views'
import { commands } from './commands'
import { menus } from './menus'

export default defineApp({ views, commands, menus })
```

The contract:

```ts
interface CommandContribution {
  /** Namespaced `ns.verb`, e.g. `demo.showWelcome`. Validated. */
  id: string
  title: string
  /** Cheshire's portable chord form, e.g. 'Mod+1'. A default; the user outranks it unless fixed. */
  shortcut?: string
  run(ctx: CommandContext): void | Promise<void>
}

interface CommandContext {
  /** Ask the shell to make a contributed view active. */
  showView(id: string): void
}
```

`defineApp` and `resolveApp` already exist for views
(`packages/core/src/contributions.ts:defineApp`, `packages/core/src/contributions.ts:resolveApp`);
commands extend the same object and the same validation path.

### Why a value, and not a registration call

VS Code splits a command in two: `contributes.commands` in `package.json` declares the id and
title, and `commands.registerCommand(id, fn)` supplies the function later, when the extension
activates. The prior attempt inherited the split — `new-ru-soam`'s `CommandService` carries *two*
maps, `_cmds` (registered, has a handler) and `_contributed` (metadata only, seeded from bundle
manifests), merged on read, plus a `setRemoteExecutor` hook to run a command whose code lives in
another process.

Apply the test. **What forced the split?** The palette must list a command before the extension
owning it has loaded. That is the entire reason. Cheshire's commands are compiled into the same
bundle as the shell, so there is no "before it loads" — and the split collapses:

| | VS Code / ru-soam | Cheshire |
| --- | --- | --- |
| Declaration | JSON in a manifest, parsed at runtime | a typed value, checked at build |
| Implementation | `registerCommand` at activation | the same value's `run` |
| Registry | two maps merged on read, plus a remote executor | one map |
| A typo'd id | a runtime warning in a log | a build error naming `src/index.ts` |

Cheshire keeps the contribution vocabulary and drops the delivery mechanism, which is what makes a
contribution a value rather than a call — [the application surface](../application-surface.md) §1.

### The id

◐ stage 2b

Namespaced `ns.verb` — `demo.showWelcome`, `workbench.togglePanel` — validated at
`resolveApp`, duplicates rejected, with the error naming the application's own file.

The id is the one VS Code mechanism that pays for itself with no external cause. It is the
indirection that lets a **menu item, a keybinding, a palette row and a user's rebind** all name
the same action without any of them holding a function. Remove it and every one of those features
becomes impossible at once. Keep it even though the manifest that motivated it is gone.

---

## 3. The registry

◐ stage 2b

One `Map<string, CommandContribution>`, built from `resolveApp`'s output at shell mount, plus:

```ts
execute(id: string, ...args): Promise<unknown>
```

`execute` constructs the `CommandContext` and calls `run`. Everything else in the system is a
*reader* of this map — the menu bar resolves item titles and shortcuts from it, the palette lists
it, the chord matcher resolves into it, the shortcuts editor enumerates it. So there is no
"register with the palette" step — one registry, not a registry per surface.

**`CommandContext` is how the layering invariant survives contact with commands.** `showView`
closes over the shell's own state setter, so an application asks the shell to change what is on
screen; it never assigns. That preserves *an application declares what exists, never what is on
screen* ([the application surface](../application-surface.md) §3.2), which in turn is what leaves
layout persistence somewhere to live that an application cannot contradict.

`ctx` is also the reason `run` takes an argument at all. Without it an application would reach for
a module-scope handle to the shell, and the invariant would be gone in the first week.

---

## 4. Chords

### The portable form

◐ stage 2b

An application writes `'Mod+1'`. `Mod` resolves to the platform's primary modifier — `Ctrl` on
Linux and Windows, `Cmd` on macOS. An application never writes `Ctrl` or `Cmd` directly, for the
same reason it never writes an Electron module name: it would be naming a platform
([principle 4](../principles.md)).

Three pure functions, unit-tested — this is the one part of the system a test covers completely:

| Function | Does |
| --- | --- |
| `normalizeChord('Mod+1')` | → `'ctrl+1'` / `'meta+1'`, modifiers in canonical order |
| `chordFromEvent(e)` | a `KeyboardEvent` → the same canonical string |
| `formatChord(chord, platform)` | → the display string for a menu: `Ctrl+1`, `⌘1` |

Both sides — what an application *wrote* and what the user
*pressed* — must reduce to the same string, or matching silently fails for `Shift+Ctrl+P` versus
`Ctrl+Shift+P`. Canonical modifier order is `ctrl → meta → alt → shift`, taken from ru-soam's
`keybinding-service.ts`, which is the one piece of prior art transferable nearly verbatim.

### Matching

◐ stage 2b (single stroke) · ○ later (sequences)

One `keydown` listener at the window level, matching the canonical stroke against the registry's
normalized shortcuts. Window level rather than per-component, because a shortcut has to work
regardless of what has focus — which immediately raises the question of what happens when the
thing with focus is a text box.

**Cheshire's answer is a focus guard: the matcher bails while focus is in an editable element.**
Explicit, one condition, no machinery. See §7 for why it is not a `when` clause.

Multi-stroke sequences (`Ctrl+K Ctrl+S`) are deferred. When they land the mechanism is known,
because ru-soam built it: a set of first strokes, a pending-stroke state with a ~1.2 s timeout,
and one non-obvious rule — **a lone modifier keydown is not a stroke.** Pressing `Ctrl` then `K`
fires a bare `Ctrl` keydown first, and treating it as a stroke clears the pending state and breaks
every sequence.

### Precedence

○ phase 3, with the settings system

A keybinding is a setting like any other, so it follows the inheritance rule
([the application surface](../application-surface.md) §1): an option space, a default, and whether
the next level may change it, passed down **platform → application → user**. An application's
`shortcut` is therefore a default the user outranks *by default* — and an application that fixes it
leaves the user no say, which is a legitimate declaration rather than a missing feature.

ru-soam had a rank Cheshire does not: `user > bundle > platform`, where *bundle* was a
separately-shipped extension. With no extensions, bundle collapses into application.

Two mechanics worth taking from the prior art when this lands, both non-obvious:

- **Rebinding must remove, not just add.** Setting a new key for a command has to suppress every
  other chord bound to it, or the old key keeps working. ru-soam persists a `-command` removal
  entry per displaced chord — VS Code's convention, and the reason its keybindings file has
  negative entries in it.
- **The recorder needs the matcher to stand down.** While the shortcuts editor is capturing a
  chord, the live matcher must not execute what is being typed. A `setCapturing(on)` flag, not a
  clever guess about focus.

---

## 5. Menus

◐ stage 2b

```ts
interface MenuItemContribution {
  /** The id of a contributed command. A menu never holds a handler. */
  command: string
}

interface MenuContribution {
  label: string
  items: MenuItemContribution[]
}
```

**A menu item is a command reference.** It resolves its title, its displayed shortcut and (later)
its enablement from the registry. It cannot hold a function — not by convention, by type.

The moment a menu item could carry its own handler, there would exist
an action the palette cannot find, the shortcuts editor cannot rebind, and a keybinding cannot
reach. One registry only works if there is no way around it.

Two decisions already made:

- **`menus` is optional.** Absent, Cheshire derives one menu labelled with `productName` holding
  every declared command. An application that declares three commands gets a working menu bar
  without writing a menu structure.
- **The menu bar is React in the renderer, not a native `Menu`.** A native menu lives in the main
  process, and command handlers are functions in the renderer — a native menu would force every
  command to cross the process boundary. Drawing it in the renderer removes the crossing entirely.
  Electron's own default menu is then removed on Linux and Windows, because its accelerators are
  live and would swallow a chord before the renderer sees it. **On macOS a role-only menu stays**,
  since the system menu bar is not optional there and a null menu breaks `Cmd+C`, `Cmd+V` and
  `Cmd+Q`.

Neither predecessor built a menu bar — x-bb left an empty slot, ru-soam used a palette instead —
so this is the first part of the system without prior art to check against.

---

## 6. The palette and the shortcuts editor

○ phase 2 (palette) · ○ phase 3 (editor)

Both are pure readers of the registry, and both are Cheshire's, never an application's
([the application surface](../application-surface.md) §3.3).

**The palette** — fuzzy search over every command by title, its keybinding shown alongside, Enter
executes. A command appears the moment it is declared. This is the second input path into
`execute(id)`, and it is why the id indirection earns its keep: keyboard and text search converge
on the same lookup.

**The shortcuts editor** — one row per registered command, showing the winning chord and where it
came from (user / application / platform), with rebind and reset. The command system owns the
defaults; the settings system owns selection over them, its UI and its persistence.

---

## 7. Enablement — the decision

**Settled 2026-08-16: nothing now, a predicate function when menus need one, never a string
expression language.**

The question is what expresses *"this command does not apply right now"* — grey out a menu item,
hide a palette row, make a chord fall through.

### What was rejected, and why

VS Code answers with **`when` clauses**: string expressions (`"editorTextFocus && !inDebugMode"`)
evaluated against a global registry of string-keyed context values. ru-soam copied it — a 228-line
expression parser with its own test suite, plus a context-key service.

Two findings decided this:

1. **The string form is forced, and the force does not reach us.** A `when` clause is a string
   because a manifest is JSON, and JSON cannot hold a function. Cheshire's contributions are
   TypeScript values. The constraint simply is not there.
2. **ru-soam built the machinery and then did not use it for keybindings.** Every one of its ten
   platform default keybindings is a bare `key → command` with no `when`. The 228 lines are
   consumed by menu-item visibility and two filters; the context-key service drifted into being a
   general reactive store (`workspace.activeId`, `workspace.kekLocked`) read through a hook. The
   expression language was carried, not needed.

And the problem a `when` clause is most often reached for — a global key listener stealing
keystrokes from a text field — ru-soam did not solve with `when` at all. It solved it by **binding
chords that do not collide with text editing**: `Ctrl+B`, `Ctrl+J`, `Ctrl+\`, `Ctrl+Tab`, and no
`Ctrl+A`/`C`/`X`/`Z` anywhere. Cheshire adds the explicit focus guard of §4 on top of the same
chord discipline. Two lines, not two hundred.

### The staged answer

| Stage | Enablement | Cost of stopping here |
| --- | --- | --- |
| **◐ 2b — nothing** | `run` checks its own preconditions and returns early | A few commands that no-op. Acceptable at ~3 commands and one derived menu. |
| **○ when menus grow — a predicate** | `enabled?: (ctx) => boolean` on the contribution | — |
| **✗ never — a string expression** | `when?: string` + a context-key service | — |

The predicate is a strictly better version of the same idea once the JSON constraint is gone: it
is type-checked, it refactors with rename, it is greppable, and it deletes the parser, the
expression cache and the global string-keyed namespace outright.

**Two things a predicate genuinely cannot do:**

1. **It is not serializable.** A user-authored keybinding override cannot carry a condition,
   because a file cannot hold a function. If Cheshire ever wants users writing context-sensitive
   rebinds, that is the one feature this choice forecloses.
2. **It announces no change.** A context-key service knows when a key flips and can tell the
   palette to re-filter. A bare predicate must be re-evaluated by its reader — on render, on menu
   open, on palette open.

**The hard-to-reverse part:** if enablement is ever a string, it becomes a
**persisted format** the moment a user keybindings file exists — the same trap as the settings
schema in [the application surface](../application-surface.md) §7. A predicate never persists, so
it can be replaced at any time. That asymmetry is most of the argument.

---

## 8. What Cheshire does not take from VS Code

The test from §1, applied to the whole system:

| Mechanism | Its cause there | Reaches us? |
| --- | --- | --- |
| Manifest-declared commands | the code has not loaded yet | No — one bundle |
| `registerCommand` split from declaration | same | No |
| Activation events (`onCommand:x`) | defer loading an extension | No — an import graph the bundler already understands |
| `engines.vscode` version handshake | host and extension version independently | No — one version, one lockfile, one build |
| Extension host, sandbox, permission scopes | third-party code | No — first-party throughout |
| `when` clause expression language | conditions must survive JSON | No — §7 |
| A service locator (`useService(CommandServiceId)`) | ~30 services need addressing | No — Cheshire has an order of magnitude fewer; one typed hook each |
| **Namespaced command ids** | — | **Yes** — §2 |
| **One registry every surface reads** | — | **Yes** — §3 |
| **Menu item as command reference** | — | **Yes** — §5 |
| **Portable chord form** | — | **Yes** — §4 |

---

## 9. Where it lives

◐ stage 2b

| Piece | Package |
| --- | --- |
| The contract — `CommandContribution`, `MenuContribution`, validation | `@cheshire/core`, application-facing via `@cheshire/app` |
| Chord normalization, registry, matcher, menu bar | `@cheshire/shell` |
| Later: its own package | `@cheshire/commands` — the boundary stage 2b earns rather than declares |

An application imports `@cheshire/app` and nothing else, in every phase
([design & roadmap](../design-and-roadmap.md) §6).

---

## 10. Open

- **Multi-stroke sequences** — deferred, mechanism known (§4).
- **macOS system menu bar** — stage 2b draws an in-window bar on every platform; the native menu
  bar on macOS is a known follow-up.
- **`enabled?: (ctx) => boolean`** — the shape is settled, the timing is "when menus need it"
  (§7).
- **Context menus** — named as part of the command system in
  [design & roadmap](../design-and-roadmap.md) §3, not designed here. They are a third reader of
  the registry and should need nothing new beyond enablement.
