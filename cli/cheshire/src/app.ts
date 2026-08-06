import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { runnerImport } from 'vite'
import { CheshireConfigError, resolveConfig } from '@cheshire/core'
import type { CheshireConfig, ResolvedCheshireConfig } from '@cheshire/core'
import { CheshireCliError } from './errors.js'

/** Everything the CLI needs to know about the application it is serving. */
export interface AppContext {
  /** Directory holding `cheshire.config.ts` — the application root. */
  root: string
  /** Absolute path to `cheshire.config.ts`. */
  configPath: string
  /** Absolute path to the generated `.cheshire/` directory. */
  generatedDir: string
  config: ResolvedCheshireConfig
}

export const CONFIG_FILE = 'cheshire.config.ts'
export const GENERATED_DIR = '.cheshire'

/**
 * Read and validate `cheshire.config.ts`.
 *
 * The config is TypeScript, and neither the CLI nor the Electron runtime loads
 * TypeScript. Vite's runner does it here, once, in the only process that has
 * Vite: the resolved plain object then travels to the renderer as a generated
 * module and to the runtime as JSON.
 */
export async function loadApp(root: string = process.cwd()): Promise<AppContext> {
  const appRoot = resolve(root)
  const configPath = resolve(appRoot, CONFIG_FILE)

  if (!existsSync(configPath)) {
    throw new CheshireCliError(
      `cheshire: no ${CONFIG_FILE} in ${appRoot}.\n` +
        `Run the cheshire CLI from an application directory, or create one with \`pnpm create cheshire <name>\`.`,
    )
  }

  const { module } = await runnerImport<{ default?: CheshireConfig }>(configPath)

  try {
    return {
      root: appRoot,
      configPath,
      generatedDir: resolve(appRoot, GENERATED_DIR),
      config: resolveConfig(module.default as CheshireConfig),
    }
  } catch (error) {
    // The config contract's own errors already name the file and the fix;
    // re-wrapping keeps them stack-free on the way out.
    if (error instanceof CheshireConfigError) throw new CheshireCliError(`cheshire: ${error.message}`)
    throw error
  }
}
