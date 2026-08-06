# create-cheshire

Generate a [cheshire](https://github.com/meersajidh/cheshire) desktop application.

```bash
pnpm create cheshire my-app
cd my-app
pnpm dev
```

You get a fully configured desktop application. Build your domain in `src/`, and never think
about the runtime.

**Requires pnpm.** A generated application declares `nodeLinker: hoisted`, which npm and yarn
have no equivalent for and electron-builder needs to package correctly on Windows. The
generator refuses, with the fix, if pnpm is missing.

## Options

| | |
| --- | --- |
| `--no-install` | Skip installing dependencies |
| `--no-git` | Skip `git init` |

## Status

**Pre-1.0 and changing.** Milestone A, stage 1: an application contributes a view and the shell
renders it. The published surface will move before 1.0.

MIT © MSH
