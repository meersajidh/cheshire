import { createServer } from 'vite'
import { loadApp } from './app.js'
import { ensureElectronBinary, launchElectron } from './electron.js'
import { MoggetCliError } from './errors.js'
import { generate } from './generate.js'
import { rendererConfig } from './renderer-config.js'

/**
 * `mogget dev` — the renderer on a Vite dev server, the runtime pointed at it.
 *
 * The order matters: the server has to be listening before Electron starts, or
 * the first window load races the port. The two processes then share a fate —
 * closing the app stops the server, and Ctrl-C stops both.
 */
export async function dev(root?: string): Promise<void> {
  const app = await loadApp(root)
  const files = generate(app)

  const server = await createServer(rendererConfig(app, 'dev'))
  await server.listen()

  const url = server.resolvedUrls?.local[0]
  if (!url) {
    await server.close()
    throw new MoggetCliError('mogget: the dev server started but reported no address to load.')
  }

  const binary = await ensureElectronBinary()

  console.log(`\n  mogget  ${app.config.productName}\n  dev server  ${url}\n`)

  const child = launchElectron({
    binary,
    entry: files.devMain,
    cwd: app.root,
    runtimeOptions: { config: app.config, devServerUrl: url },
  })

  const stop = (): void => {
    if (child.exitCode === null && !child.killed) child.kill()
  }
  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)

  await new Promise<void>((resolvePromise) => {
    child.on('exit', (code) => {
      void server.close().then(() => {
        process.exitCode = code ?? 0
        resolvePromise()
      })
    })
  })
}
