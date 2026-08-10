/**
 * `@cheshire/core/views` — the contribution contract an application declares.
 *
 * A separate entry from the barrel because it names React's `ComponentType`,
 * and `@cheshire/runtime-electron` imports the barrel from the main process.
 * The React reference is type-only and erased at build, so importing this from
 * node loads nothing — but the `.d.ts` still names `react`, and `skipLibCheck`
 * turns an unresolved one into `any` without saying so.
 *
 * Public, therefore application-facing and no more: `resolveApp` and
 * `CheshireAppError` are the shell's, and live on `./views/internal`.
 */
export {
  defineApp,
  type AppDefinition,
  type ResolvedApp,
  type ViewContribution,
} from './contributions.js'
