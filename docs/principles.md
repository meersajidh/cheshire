# cheshire — Principles

> **Status:** Settled (2026-08-03), restructured (2026-08-07). Living document — amendments
> are explicit, never by drift.
>
> These principles are upstream of every design decision. A decision that contradicts one of
> them is wrong, or the principle changes first — explicitly.

cheshire is a platform for building desktop applications: the infrastructure an application
runs on, so the application only has to be the application.

---

# What cheshire is

## 1. The developer is the customer

cheshire's product is developer experience. The whole platform is judged by one moment:

```bash
pnpm create cheshire my-app
```

produces a fully configured application, and from then on the developer thinks
_"I'm building a desktop application"_ — never _"I'm wiring Electron"_.

Every API exists to remove effort. Convention over configuration: minimal setup, sensible
defaults, one obvious way to do things. Opinionated infrastructure, with the business domain
layering cleanly on top of platform services.

## 2. The framework owns the entry

A generated application supplies `cheshire.config.ts` and its own domain code. It never
authors a process entry file, a build pipeline, or runtime wiring — cheshire ships the entry,
the boot sequence, the dev runtime, and the build/package tooling.

cheshire is a framework, not a library: it calls the application, not the other way round.

## 3. First-party surface only

There is no third-party plugin system — no plugin trust model, no version negotiation, no
extension isolation.

An application contributing views, commands, and menus into the Shell, and running its own
domain code in the Host process, is the platform's ordinary surface. That is the whole
extension story, and it is enough: application code that must run at startup or expose a
service has a home already.

Revisiting this is a deliberate strategic decision, never an accretion.

---

# Where the boundaries are

## 4. The application is loosely coupled from what runs it

Electron is the first runtime, and an implementation detail. No application code references
runtime modules, process or window APIs, IPC channels, or protocol schemes. Applications
depend on cheshire's abstractions only.

This is enforced from day one and designed now — it does not wait for a second runtime to
exist. A runtime port (Tauri is the candidate) is how the seam gets validated if and when it
is scheduled, and it is expected to expose gaps. Finding them then is the point of porting;
it is not a reason to defer the design until then.

## 5. Two products, and cheshire ships built

**The framework is a software product. A generated application is a customer of that
product.** That is how React, Next.js, Electron, and Flutter are built, and it is how
cheshire is built.

They live in different repositories, have different users, and carry different
responsibilities. An application depends on released `@cheshire/*` packages and receives
built output and type declarations — never framework source. An application's build compiles
application code only.

---

# How it gets built

## 6. Vision sets scope; execution stays runnable

Scope and direction are set by the product owner's vision. cheshire carries no
evidence-gating rules: no "don't build ahead of evidence", no YAGNI vetoes, no
consumer-count thresholds. Vision decides; evidence follows.

Being strategic is not permission to be impractical. Every stage ends with something that
runs, and it is actually run — not type-checked and declared done. Consolidation,
documentation, and refactoring never block the next runnable milestone; ship the next thing
that runs and queue the cleanup behind it.

One obligation survives, because it protects the vision rather than braking it: a decision
that is genuinely hard to reverse — a published API name, a persisted format, a wire
protocol — is surfaced as an explicit decision point, then decided. Not deferred.
