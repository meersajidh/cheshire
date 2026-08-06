# @cheshire/core

Foundational services and the `cheshire.config` contract for
[cheshire](https://github.com/meersajidh/cheshire).

**You do not install this directly.** It arrives with `@cheshire/app`, which is what an application imports from.

```bash
pnpm create cheshire my-app
```

## What is in it

- `defineConfig` and the config contract — what an application declares that it *is*
- `defineApp` and the contribution contract — what an application declares that it *has*

`./views` is a separate entry point on purpose: the core barrel is imported by
`@cheshire/runtime-electron` from the main process and must stay React-free.

## Status

**Pre-1.0 and changing.** The published surface will move before 1.0.

MIT © MSH
