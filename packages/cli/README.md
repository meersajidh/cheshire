# @cheshire/app

A platform for building desktop applications.

This package is the cheshire CLI — `dev`, `build`, `package` — and the application-facing config
API. It is a **dev dependency** of a generated application, which is what lets that application
ship without ever naming its runtime.

It installs the `cheshire` command, and it is the one cheshire package an application imports
from. Everything else — `@cheshire/core`, `@cheshire/shell`, `@cheshire/runtime-electron` —
arrives behind it and is never named directly.

Start here instead:

```bash
pnpm create cheshire my-app
```

## The CLI

| | |
| --- | --- |
| `cheshire dev` | Start the dev server and open the application |
| `cheshire build` | Typecheck and compile |
| `cheshire package` | Produce a distributable (`--dir` for an unpacked build) |

## The config API

An application supplies `cheshire.config.ts` and `src/` — never a process entry, build config, or
runtime wiring.

```ts
import { defineConfig } from '@cheshire/app'

export default defineConfig({
  appId: 'com.example.my-app',
  productName: 'My App',
  window: { width: 1280, height: 800 },
})
```

## Status

**Pre-1.0 and changing.** Milestone A, stage 1: an application contributes a view and the shell
renders it. The published surface will move before 1.0.

Docs: [github.com/meersajidh/cheshire](https://github.com/meersajidh/cheshire)

MIT © MSH
