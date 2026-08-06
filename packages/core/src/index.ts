/**
 * The barrel is deliberately React-free: `@mogget/runtime-electron` imports it
 * from the main process. The contribution contract, which names React, is a
 * separate entry — `@mogget/core/views`.
 */
export {
  defineConfig,
  resolveConfig,
  MoggetConfigError,
  type MoggetConfig,
  type ResolvedMoggetConfig,
  type WindowConfig,
} from './config.js'
