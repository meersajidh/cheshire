# cheshire — Principles

> **Status:** Settled (2026-08-03), revised (2026-08-13). Living document — amendments
> are explicit, never by drift.
>
> These principles are upstream of every design decision. A decision that contradicts one of
> them is wrong, or the principle changes first — explicitly.

cheshire is a platform for building desktop applications: the infrastructure an application
runs on, so the application only has to be the application.

---

# What cheshire is

## 1. Desktop app development framework

cheshire produces a fully configured, yet opinionated, application infrastructure for
developers to code, build, run and release their apps. Convention over configuration: minimal
setup, sensible defaults, one obvious way to do things.

## 2. The framework owns the entry

The application supplies `cheshire.config.ts` and its own domain code. It never authors a
process entry file, a build pipeline, or runtime wiring — cheshire ships the entry, the boot
sequence, the dev runtime, and the build/package tooling.

## 3. The application is the only extension

An application contributes views, commands and menus into the Shell, and runs its own domain
code in the Host. That is the whole extension story: there is no third-party plugin system,
and therefore no trust model, no API version handshake, no extension isolation. Contributions
are plain values — a view carries a live React component, not a manifest entry.

---

# Where the boundaries are

## 4. The runtime is an infrastructure implementation detail

The application doesn't reference the runtime implementation's modules, APIs, channels,
protocols, etc.; it depends on cheshire's abstractions only. Electron is the first runtime,
may get replaced tomorrow, the seam stays and may continue to evolve.

## 5. The framework ships as a package

An application receives cheshire as a released, built package — compiled JavaScript and type
declarations, never framework source. Its own build compiles application code only.

---

# How it gets built

## 6. Frameworks are strategic in vision but can be tactical in implementation

Scope and direction for cheshire as a developer framework are ambitious, vision-driven. But
being strategic is not permission to be impractical. Every stage ends with something that
runs, and works.
