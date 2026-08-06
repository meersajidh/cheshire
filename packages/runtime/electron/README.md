# @cheshire/runtime-electron

[cheshire](https://github.com/meersajidh/cheshire)'s Electron runtime — process entry, window
creation, lifecycle.

**You do not install this directly, and application code never imports it.** It arrives with
`@cheshire/app`, and the framework owns the process entry. No application names an Electron module, a
window API, an IPC channel, or a protocol scheme.

```bash
pnpm create cheshire my-app
```

## Why it is a separate package

Electron is cheshire's first runtime, and an implementation detail. Keeping it behind a package
boundary is what lets a second runtime slot in beside it rather than through it.

## Status

**Pre-1.0 and changing.** The published surface will move before 1.0.

MIT © MSH
