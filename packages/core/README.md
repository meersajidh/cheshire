# @mogget/core

Foundational services and the `mogget.config` contract for
[mogget](https://github.com/meersajidh/mogget).

**You do not install this directly.** It arrives with `mogget`, and an application imports what
it needs from `mogget` rather than from here.

```bash
pnpm create mogget my-app
```

## What is in it

- `defineConfig` and the config contract — what an application declares that it *is*
- `defineApp` and the contribution contract — what an application declares that it *has*

`./views` is a separate entry point on purpose: the core barrel is imported by
`@mogget/runtime-electron` from the main process and must stay React-free.

## Status

**Pre-1.0 and changing.** The published surface will move before 1.0.

MIT © MSH
