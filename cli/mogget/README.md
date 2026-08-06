# mogget

A platform for building desktop applications.

This package is the mogget CLI — `dev`, `build`, `package` — and the application-facing config
API. It is a **dev dependency** of a generated application, which is what lets that application
ship without ever naming its runtime.

Start here instead:

```bash
pnpm create mogget my-app
```

## The CLI

| | |
| --- | --- |
| `mogget dev` | Start the dev server and open the application |
| `mogget build` | Typecheck and compile |
| `mogget package` | Produce a distributable (`--dir` for an unpacked build) |

## The config API

An application supplies `mogget.config.ts` and `src/` — never a process entry, build config, or
runtime wiring.

```ts
import { defineConfig } from 'mogget'

export default defineConfig({
  appId: 'com.example.my-app',
  productName: 'My App',
  window: { width: 1280, height: 800 },
})
```

## Status

**Pre-1.0 and changing.** Milestone A, stage 1: an application contributes a view and the shell
renders it. The published surface will move before 1.0.

Docs: [github.com/meersajidh/mogget](https://github.com/meersajidh/mogget)

MIT © MSH
