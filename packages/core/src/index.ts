/**
 * The barrel is deliberately React-free: `@cheshire/runtime-electron` imports it
 * from the main process. The contribution contract, which names React, is a
 * separate entry — `@cheshire/core/views`.
 */
export {
  defineConfig,
  resolveConfig,
  CheshireConfigError,
  type CheshireConfig,
  type ResolvedCheshireConfig,
  type WindowConfig,
} from './config.js'
