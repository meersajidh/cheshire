/**
 * The config contract (premise 3). An application seats into dinah by exporting
 * one of these from `dinah.config.ts`; it authors no entry file, no build
 * config, and no runtime wiring.
 */
export interface DinahConfig {
  /** Reverse-DNS identifier for the packaged application, e.g. `com.example.demo`. */
  appId: string
  /** Human-visible application name — window title, menu bar, installer. */
  productName: string
  /** Main window shape. Every field has a default. */
  window?: WindowConfig
}

export interface WindowConfig {
  width?: number
  height?: number
}

/** A config with every default filled in. What the runtime actually consumes. */
export interface ResolvedDinahConfig {
  appId: string
  productName: string
  window: Required<WindowConfig>
}

/** Thrown when `dinah.config.ts` is not a usable config. */
export class DinahConfigError extends Error {
  override readonly name = 'DinahConfigError'
}

const WINDOW_DEFAULTS: Required<WindowConfig> = {
  width: 1200,
  height: 800,
}

/**
 * Identity at runtime; the point is the type. Gives an application author
 * completion and errors in `dinah.config.ts` without importing a type.
 */
export function defineConfig(config: DinahConfig): DinahConfig {
  return config
}

/**
 * Validate and apply defaults. Errors name the file and the fix, because the
 * developer reading them is the customer.
 */
export function resolveConfig(config: DinahConfig): ResolvedDinahConfig {
  if (config === null || typeof config !== 'object') {
    throw new DinahConfigError(
      'dinah.config.ts must default-export a config object. Use `export default defineConfig({ ... })`.',
    )
  }

  const appId = requireString(config.appId, 'appId', 'com.example.my-app')
  const productName = requireString(config.productName, 'productName', 'My App')

  return {
    appId,
    productName,
    window: { ...WINDOW_DEFAULTS, ...config.window },
  }
}

function requireString(value: unknown, field: keyof DinahConfig, example: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new DinahConfigError(
      `dinah.config.ts is missing \`${field}\`. Add it, e.g. \`${field}: '${example}'\`.`,
    )
  }
  return value
}
