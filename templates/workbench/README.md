# {{productName}}

A desktop application built with [dinah](https://github.com/dinah).

```bash
pnpm dev        # open the app, with the renderer hot-reloading
pnpm build      # typecheck and compile
pnpm package    # produce an installable application in dist/
```

## Where things live

| Path | Yours? | What it is |
| --- | --- | --- |
| `src/` | yes | Your application |
| `dinah.config.ts` | yes | Identity and window shape |
| `.dinah/` | no | Generated on every run — process entry, renderer entry, tsconfig |
| `dist/` | no | Build and packaging output |

`.dinah/` is rewritten each time you run a command. Edit it and your changes are
gone on the next `pnpm dev`; whatever you wanted to change there belongs in
`dinah.config.ts`, or is a gap in dinah worth reporting.

## Why everything is a devDependency

The renderer is bundled, and so is the main process — with the runtime inlined.
Nothing has to resolve from `node_modules` when your app runs, so nothing is a
runtime dependency. A production dependency here would be collected into the
packaged application whether it is used or not.
