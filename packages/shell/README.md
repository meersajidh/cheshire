# @mogget/shell

The [mogget](https://github.com/meersajidh/mogget) shell — title bar, body, status bar; the root
of the renderer.

**You do not install this directly.** It arrives with `mogget`, and the framework mounts it. An
application contributes views; the shell decides what is on screen.

```bash
pnpm create mogget my-app
```

## Status

**Pre-1.0 and changing.** Today the shell renders the body and lists an application's contributed
views. The title bar and status bar are named in the anatomy and not yet built.

React and React DOM are peer dependencies — an application owns exactly one copy of each.

MIT © MSH
