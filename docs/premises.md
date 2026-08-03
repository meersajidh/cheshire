# dinah — Founding premises

> **Status:** Settled (2026-08-03). Living document — amendments are explicit, never by drift.
>
> These premises are upstream of every design decision. A decision that contradicts one of
> them is wrong, or the premise changes first — explicitly.

dinah is a platform for building desktop applications: the infrastructure an application
runs on, so the application only has to be the application.

---

## 1. The developer is the customer

dinah's product is developer experience. The whole platform is judged by one moment:

```bash
npm create dinah my-app
```

produces a fully configured application, and from then on the developer thinks
*"I'm building a desktop application"* — never *"I'm wiring Electron"*.

Every API exists to remove effort. Convention over configuration: minimal setup, sensible
defaults, one obvious way to do things. Opinionated infrastructure, with the business
domain layering cleanly on top of platform services.

## 2. Two products, two repositories

**The framework is a software product. A generated application is a customer of that
product.** That is how React, Next.js, Electron, and Flutter are built, and it is how
dinah is built.

They live in different repositories, have different users, and carry different
responsibilities. An application depends on released `@dinah/*` packages — never on
framework source.

## 3. The framework owns the entry

A generated application supplies `dinah.config.ts` and its own domain code. It never
authors a process entry file, a build pipeline, or runtime wiring — dinah ships the entry,
the boot sequence, the dev runtime, and the build/package tooling.

The model is Vite's, not a library's: a socket the application seats into, with a config
contract and a managed lifecycle — not a flat API surface the application assembles itself.

## 4. dinah ships built, and a real install is the only proof

Consumers receive built output and type declarations, never framework source, and an
application's build compiles application code only.

A workspace link is never proof of anything: links resolve source paths and hide exactly
the class of packaging failure that breaks a real user. The playground and every gate
consume dinah the way a real developer does — installed from a packed tarball or a local
registry.

## 5. The application never names the runtime

Electron is the first runtime, and an implementation detail. No application code
references runtime modules, process or window APIs, IPC channels, or protocol schemes.
Applications depend on dinah's abstractions only.

**Runtime independence is a first-class strategic objective**, and it is proven the honest
way: Phase 4 of the roadmap ports the runtime layer (a Tauri prototype) and validates the
runtime interfaces *by porting* — not by freezing speculative abstractions before a second
runtime exists.

## 6. First-party surface only

There is no third-party plugin system — no plugin trust model, no version negotiation, no
extension isolation. Application developers contributing views, commands, and menus is the
platform's ordinary surface, not a plugin system.

Revisiting this is a deliberate strategic decision, never an accretion.

## 7. Built from vision

Scope and direction are set by the product owner's vision. dinah carries no
evidence-gating rules: no "don't build ahead of evidence", no YAGNI vetoes, no
consumer-count thresholds. Vision decides; evidence follows.

One obligation survives, because it protects the vision rather than braking it: a decision
that is genuinely hard to reverse — a published API name, a persisted format, a wire
protocol — is surfaced as an explicit decision point, then decided. Not deferred.

## 8. Momentum over meta-work

Every stage ends with something that runs, and it is actually run — not type-checked and
declared done.

Consolidation, documentation, and refactoring never block the next runnable milestone.
Ship the next thing that runs; queue the cleanup behind it.
