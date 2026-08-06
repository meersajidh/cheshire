import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import type { RuntimeOptions } from '@cheshire/runtime-electron/main'
import { CheshireCliError } from './errors.js'

const require = createRequire(import.meta.url)

/** Matches the runtime's own contract — options travel as JSON in this variable. */
const OPTIONS_ENV = 'CHESHIRE_RUNTIME_OPTIONS'

/** The Electron executable, or `undefined` if it has not been downloaded yet. */
function findElectronBinary(): string | undefined {
  const electronDir = dirname(require.resolve('electron/package.json'))
  const pathTxt = join(electronDir, 'path.txt')
  if (!existsSync(pathTxt)) return undefined

  const binary = join(electronDir, 'dist', readFileSync(pathTxt, 'utf8').trim())
  return existsSync(binary) ? binary : undefined
}

/**
 * Fetch the Electron binary if it is missing.
 *
 * electron 43 declares **no postinstall**: it ships its downloader as a bin
 * (`install-electron`) and expects someone to call it. Nobody does, so a
 * generated application's first `pnpm dev` would otherwise die on a cryptic
 * missing-path error from inside `electron/index.js`. The framework owns the
 * runtime, so the framework fetches it.
 */
export async function ensureElectronBinary(): Promise<string> {
  const existing = findElectronBinary()
  if (existing) return existing

  console.log('cheshire: downloading the Electron runtime (first run only)…')
  const code = await runToCompletion(process.execPath, [require.resolve('electron/install.js')])
  if (code !== 0) {
    throw new CheshireCliError(
      `cheshire: downloading the Electron runtime failed (exit code ${code}).\n` +
        'Check network access, then run the command again.',
    )
  }

  const downloaded = findElectronBinary()
  if (!downloaded) {
    throw new CheshireCliError(
      'cheshire: the Electron runtime reported a successful download but no binary is present.\n' +
        'Remove `node_modules/electron/dist` and install again.',
    )
  }
  return downloaded
}

/**
 * Flags for an **unpackaged, development** launch. Lifted from the previous
 * attempt unchanged, because each one was paid for:
 *
 * - `--no-sandbox` (Linux only): Ubuntu 22+ AppArmor blocks Electron's
 *   unprivileged-userns helper, and nothing SUIDs `chrome-sandbox` inside
 *   `node_modules`, so an unpackaged launch cannot start its sandbox helper at
 *   all. A packaged build is unaffected — the installer's postinstall does SUID
 *   it — so this flag must **never** reach one. It is also a different setting
 *   from `webPreferences.sandbox`, which stays `true` everywhere, in dev and in
 *   production alike. Do not collapse the platform check "for simplicity".
 * - `--ozone-platform=x11` (Linux only): forces X11 rather than letting Ozone
 *   pick Wayland, where the dev launch has been observed to come up blank.
 * - `--remote-debugging-port=9333`: attach a debugger to the renderer without
 *   restarting the app.
 */
function devLaunchFlags(): string[] {
  return process.platform === 'linux'
    ? ['--no-sandbox', '--ozone-platform=x11', '--remote-debugging-port=9333']
    : ['--remote-debugging-port=9333']
}

export interface LaunchOptions {
  binary: string
  /** The generated `.cheshire/main.mjs`. */
  entry: string
  cwd: string
  runtimeOptions: RuntimeOptions
}

/** Start the Electron runtime in development. Returns the live child process. */
export function launchElectron({ binary, entry, cwd, runtimeOptions }: LaunchOptions): ChildProcess {
  return spawn(binary, [entry, ...devLaunchFlags()], {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, [OPTIONS_ENV]: JSON.stringify(runtimeOptions) },
  })
}

/** Run a command to completion, inheriting stdio, and resolve with its exit code. */
export function runToCompletion(command: string, args: string[], cwd?: string): Promise<number> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, { stdio: 'inherit', ...(cwd ? { cwd } : {}) })
    child.on('error', rejectPromise)
    child.on('exit', (code) => resolvePromise(code ?? 1))
  })
}
