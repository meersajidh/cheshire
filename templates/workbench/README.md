# {{productName}}

A desktop application built with [cheshire](https://github.com/meersajidh/cheshire).

```bash
pnpm dev        # open the app, with the renderer hot-reloading
pnpm build      # typecheck and compile
pnpm package    # produce an installable application in dist/
```

## Where things live

| Path | Yours? | What it is |
| --- | --- | --- |
| `src/index.ts` | yes | What your application contributes — views, and later commands |
| `src/` | yes | The rest of your application |
| `cheshire.config.ts` | yes | Identity and window shape |
| `.cheshire/` | no | Generated on every run — process entry, renderer entry, tsconfig |
| `dist/` | no | Build and packaging output |

## Contributing a view

A view is a React component plus an id and a title, declared from `src/index.ts`:

```ts
import { defineApp } from '@cheshire/app'
import { Reports } from './views/Reports'

export default defineApp({
  views: [{ id: 'reports', title: 'Reports', component: Reports }],
})
```

The workbench lists every view in the sidebar and renders the active one. Which
view is active is the workbench's business, not yours.

## `.cheshire/`

`.cheshire/` is rewritten each time you run a command. Edit it and your changes are
gone on the next `pnpm dev`; whatever you wanted to change there belongs in
`cheshire.config.ts`, or is a gap in cheshire worth reporting.

## Why everything is a devDependency

The renderer is bundled, and so is the main process — with the runtime inlined.
Nothing has to resolve from `node_modules` when your app runs, so nothing is a
runtime dependency. A production dependency here would be collected into the
packaged application whether it is used or not.
