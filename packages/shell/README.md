# @cheshire/shell

The [cheshire](https://github.com/meersajidh/cheshire) shell — title bar, body, status bar; the root
of the renderer.

**You do not install this directly.** It arrives with `@cheshire/app`, and the framework mounts it. An
application contributes views; the shell decides what is on screen.

```bash
pnpm create cheshire my-app
```

## Status

**Pre-1.0 and changing.** Today the shell renders the body — an activity bar, a sidebar listing the
application's contributed views, and an editor area rendering the active one — under a status bar.
The status bar's own contents are fixed for now; nothing contributes into it yet. The title bar is
named in the anatomy and not yet built (stage 2a).

React and React DOM are peer dependencies — an application owns exactly one copy of each.

MIT © MSH
