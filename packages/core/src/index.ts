/**
 * The barrel is deliberately React-free: `@dinah/runtime-electron` imports it
 * from the main process. The contribution contract, which names React, is a
 * separate entry — `@dinah/core/views`.
 */
export {
  defineConfig,
  resolveConfig,
  DinahConfigError,
  type DinahConfig,
  type ResolvedDinahConfig,
  type WindowConfig,
} from './config.js'
