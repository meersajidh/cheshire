import type { ReactNode } from 'react'

export interface WorkbenchProps {
  /** Shown in the title strip and the empty state. Comes from `dinah.config.ts`. */
  productName: string
  /** Contributed content for the editor area. Empty until an app contributes a view. */
  children?: ReactNode
}

/**
 * The application shell: activity bar, sidebar, editor area, status bar.
 *
 * Stage 0 renders the shell only — the regions are structural, and views,
 * commands, and layout persistence fill them in later stages.
 */
export function Workbench({ productName, children }: WorkbenchProps) {
  return (
    <div className="dinah-workbench">
      <nav className="dinah-activity-bar" aria-label="Activity">
        <span className="dinah-activity-mark" aria-hidden="true">
          {productName.slice(0, 1).toUpperCase()}
        </span>
      </nav>

      <aside className="dinah-sidebar" aria-label="Sidebar">
        <h1 className="dinah-sidebar-title">{productName}</h1>
        <p className="dinah-sidebar-hint">No views contributed yet.</p>
      </aside>

      <main className="dinah-editor-area">{children ?? <EmptyState />}</main>

      <footer className="dinah-status-bar">
        <span>dinah</span>
        <span className="dinah-status-spacer" />
        <span>ready</span>
      </footer>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="dinah-empty-state">
      <p className="dinah-empty-title">The workbench is running.</p>
      <p className="dinah-empty-body">
        Contribute a view from your app&apos;s <code>src/</code> and it renders here.
      </p>
    </div>
  )
}
