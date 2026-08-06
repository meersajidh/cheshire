import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import type { ResolvedDinahConfig } from '@dinah/core'
import { resolveApp } from '@dinah/core/views'
import { Shell } from './Shell.js'

export interface MountOptions {
  config: ResolvedDinahConfig
  /**
   * The default export of the application's `src/index.ts`, unvalidated.
   *
   * Typed `unknown` on purpose. `defineApp` already checks the shape where the
   * developer wrote it; anything that gets past it is caught by `resolveApp`,
   * whose errors name `src/index.ts` — not this framework-generated entry.
   */
  app: unknown
  /** Defaults to `#root`, which the framework-owned HTML always provides. */
  container?: HTMLElement
}

/**
 * Boot the shell into the page. Called by the framework-owned renderer entry —
 * an application never calls this, and never authors the entry that does
 * (premise 3).
 */
export function mountShell({ config, app, container }: MountOptions): void {
  const host = container ?? document.getElementById('root')
  if (!host) {
    throw new Error('dinah: no mount container — expected an element with id "root".')
  }

  const { views } = resolveApp(app)

  document.title = config.productName

  createRoot(host).render(
    <StrictMode>
      <Shell productName={config.productName} views={views} />
    </StrictMode>,
  )
}
