import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { runnerImport } from 'vite'
import { MoggetConfigError, resolveConfig } from '@mogget/core'
import type { MoggetConfig, ResolvedMoggetConfig } from '@mogget/core'
import { MoggetCliError } from './errors.js'

/** Everything the CLI needs to know about the application it is serving. */
export interface AppContext {
  /** Directory holding `mogget.config.ts` — the application root. */
  root: string
  /** Absolute path to `mogget.config.ts`. */
  configPath: string
  /** Absolute path to the generated `.mogget/` directory. */
  generatedDir: string
  config: ResolvedMoggetConfig
}

export const CONFIG_FILE = 'mogget.config.ts'
export const GENERATED_DIR = '.mogget'

/**
 * Read and validate `mogget.config.ts`.
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
    throw new MoggetCliError(
      `mogget: no ${CONFIG_FILE} in ${appRoot}.\n` +
        `Run the mogget CLI from an application directory, or create one with \`pnpm create mogget <name>\`.`,
    )
  }

  const { module } = await runnerImport<{ default?: MoggetConfig }>(configPath)

  try {
    return {
      root: appRoot,
      configPath,
      generatedDir: resolve(appRoot, GENERATED_DIR),
      config: resolveConfig(module.default as MoggetConfig),
    }
  } catch (error) {
    // The config contract's own errors already name the file and the fix;
    // re-wrapping keeps them stack-free on the way out.
    if (error instanceof MoggetConfigError) throw new MoggetCliError(`mogget: ${error.message}`)
    throw error
  }
}
