import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { AppContext } from './app.js'
import { generate } from './generate.js'

function fixture(): AppContext {
  const root = mkdtempSync(join(tmpdir(), 'dinah-generate-'))
  return {
    root,
    configPath: join(root, 'dinah.config.ts'),
    generatedDir: join(root, '.dinah'),
    config: {
      appId: 'com.example.scratch',
      productName: 'Demo & "Co"',
      window: { width: 1200, height: 800 },
    },
  }
}

function read(app: AppContext, name: string): string {
  return readFileSync(join(app.generatedDir, name), 'utf8')
}

/** Gives the fixture an application entry, as every generated app has. */
function withEntry(app: AppContext, name = 'index.ts'): AppContext {
  mkdirSync(join(app.root, 'src'), { recursive: true })
  writeFileSync(join(app.root, 'src', name), 'export default {}\n', 'utf8')
  return app
}

describe('generate', () => {
  it('writes an HTML entry that escapes the product name', () => {
    const app = fixture()
    generate(app)
    expect(read(app, 'index.html')).toContain('<title>Demo &amp; &quot;Co&quot;</title>')
  })

  it('resolves the framework by name, so nothing needs aliasing', () => {
    const app = fixture()
    generate(app)
    expect(read(app, 'renderer.tsx')).toContain("from '@dinah/workbench'")
    expect(read(app, 'main.mjs')).toContain("from '@dinah/runtime-electron/main'")
  })

  it('joins the application to the shell through its own entry', () => {
    const app = withEntry(fixture())
    generate(app)
    expect(read(app, 'renderer.tsx')).toContain("import app from '../src/index'")
    expect(read(app, 'renderer.tsx')).toContain('mountWorkbench({ config, app })')
  })

  it('still renders a workbench when the application has no entry', () => {
    const app = fixture()
    generate(app)
    // A missing `src/index.ts` is the developer's mistake; a module-resolution
    // failure in a generated file is not a useful way to tell them so.
    expect(read(app, 'renderer.tsx')).not.toContain("from '../src/index'")
    expect(read(app, 'renderer.tsx')).toContain('const app = {}')
  })

  it('accepts a .tsx application entry', () => {
    const app = withEntry(fixture(), 'index.tsx')
    generate(app)
    expect(read(app, 'renderer.tsx')).toContain("import app from '../src/index'")
  })

  it('writes a dev entry fed by the environment and a production entry that is not', () => {
    const app = fixture()
    generate(app)
    // The dev server's port is only settled at listen time, after this runs.
    expect(read(app, 'main.mjs')).toContain('process.env.DINAH_RUNTIME_OPTIONS')

    // A packaged app has no CLI to hand it anything: config is baked in, and
    // the renderer is found relative to the bundle it ships beside.
    const prod = read(app, 'prod/main.mjs')
    expect(prod).not.toContain('process.env')
    expect(prod).toContain('"appId": "com.example.scratch"')
    expect(prod).toContain("new URL('../renderer', import.meta.url)")
  })

  it('bakes the resolved config, defaults already applied', () => {
    const app = fixture()
    generate(app)
    const config = read(app, 'config.ts')
    expect(config).toContain('"appId": "com.example.scratch"')
    expect(config).toContain('"height": 800')
  })

  it('names no ambient types and lists every generated root explicitly', () => {
    const app = fixture()
    generate(app)
    // The banner is a JSONC comment; strip it before parsing.
    const tsconfig = JSON.parse(read(app, 'tsconfig.json').replace(/^\/\/.*\n/, '')) as {
      compilerOptions: { types: string[] }
      include: string[]
    }
    // `vite/client` is unresolvable from an application — TS2688.
    expect(tsconfig.compilerOptions.types).toEqual([])
    // TypeScript's wildcards skip dot-directories: anything in `.dinah/` that a
    // wildcard would have to find is checked by nothing.
    expect(tsconfig.include).toContain('./renderer.tsx')
    expect(tsconfig.include).toContain('./config.ts')
    expect(tsconfig.include).toContain('./env.d.ts')
  })
})
