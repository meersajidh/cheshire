import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import type { ResolvedDinahConfig } from '@dinah/core'
import { Workbench } from './Workbench.js'

export interface MountOptions {
  config: ResolvedDinahConfig
  /** Defaults to `#root`, which the framework-owned HTML always provides. */
  container?: HTMLElement
}

/**
 * Boot the shell into the page. Called by the framework-owned renderer entry —
 * an application never calls this, and never authors the entry that does
 * (premise 3).
 */
export function mountWorkbench({ config, container }: MountOptions): void {
  const host = container ?? document.getElementById('root')
  if (!host) {
    throw new Error('dinah: no mount container — expected an element with id "root".')
  }

  document.title = config.productName

  createRoot(host).render(
    <StrictMode>
      <Workbench productName={config.productName} />
    </StrictMode>,
  )
}
