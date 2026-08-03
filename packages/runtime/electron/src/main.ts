import { join } from 'node:path'
import { app, BrowserWindow, shell } from 'electron'
import { resolveConfig, type DinahConfig, type ResolvedDinahConfig } from '@dinah/core'

/**
 * What the `dinah` CLI hands to the runtime. Passed as JSON in
 * `DINAH_RUNTIME_OPTIONS` so the runtime never loads TypeScript itself, and the
 * process entry stays a plain, packageable file.
 */
export interface RuntimeOptions {
  config: DinahConfig
  /** Dev: the Vite server to load. Mutually exclusive with `rendererDir`. */
  devServerUrl?: string
  /** Production: directory containing the built `index.html`. */
  rendererDir?: string
}

const OPTIONS_ENV = 'DINAH_RUNTIME_OPTIONS'

function readOptions(): RuntimeOptions {
  const raw = process.env[OPTIONS_ENV]
  if (!raw) {
    throw new Error(
      `dinah: ${OPTIONS_ENV} is not set. The Electron runtime is launched by the dinah CLI, not directly.`,
    )
  }
  return JSON.parse(raw) as RuntimeOptions
}

function createWindow(options: RuntimeOptions, config: ResolvedDinahConfig): BrowserWindow {
  const window = new BrowserWindow({
    width: config.window.width,
    height: config.window.height,
    title: config.productName,
    show: false,
    backgroundColor: '#1e1e21',
    webPreferences: {
      // The renderer is web content and is treated as such: no Node, isolated
      // context, sandboxed. Application code never reaches these APIs
      // (premise 5), so nothing here is a compromise.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  window.once('ready-to-show', () => window.show())

  // Anything the app doesn't own opens in the user's browser, never in a
  // chrome-less Electron window.
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (options.devServerUrl) {
    void window.loadURL(options.devServerUrl)
  } else if (options.rendererDir) {
    void window.loadFile(join(options.rendererDir, 'index.html'))
  } else {
    throw new Error('dinah: runtime options must carry either `devServerUrl` or `rendererDir`.')
  }

  return window
}

export function start(): void {
  const options = readOptions()
  const config = resolveConfig(options.config)

  app.setName(config.productName)
  app.setAppUserModelId(config.appId)

  void app.whenReady().then(() => {
    createWindow(options, config)

    // macOS: clicking the dock icon with no windows open reopens one.
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow(options, config)
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}

start()
