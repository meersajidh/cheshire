import { useState } from 'react'
import type { ViewContribution } from '@dinah/core/views'

export interface ShellProps {
  /** Shown in the title strip and the empty state. Comes from `dinah.config.ts`. */
  productName: string
  /** What the application contributed from `src/index.ts`. May be empty. */
  views: ViewContribution[]
}

/**
 * The shell — the root of the renderer, and the shell system's whole job.
 *
 * Its anatomy is three vertical zones: a **title bar** (stage 2a), the **body**,
 * and a **status bar**. The body holds the regions — activity bar, sidebars,
 * editor area, panel — and which of those exist is the layout service's call,
 * not a fixed set: a template may have no activity bar at all.
 *
 * Today the body is one sidebar and one editor area. The sidebar lists the
 * application's views, the editor area renders the active one, and *which* view
 * is active is the shell's state, not the application's — an application
 * declares what exists, never what is on screen.
 */
export function Shell({ productName, views }: ShellProps) {
  const [activeId, setActiveId] = useState<string | undefined>(() => views[0]?.id)
  const active = views.find((view) => view.id === activeId)

  return (
    <div className="dinah-shell">
      <nav className="dinah-activity-bar" aria-label="Activity">
        <span className="dinah-activity-mark" aria-hidden="true">
          {productName.slice(0, 1).toUpperCase()}
        </span>
      </nav>

      <aside className="dinah-sidebar" aria-label="Sidebar">
        <h1 className="dinah-sidebar-title">{productName}</h1>
        {views.length === 0 ? (
          <p className="dinah-sidebar-hint">No views contributed yet.</p>
        ) : (
          <ul className="dinah-view-list">
            {views.map((view) => (
              <li key={view.id}>
                <button
                  type="button"
                  className="dinah-view-tab"
                  aria-current={view.id === activeId}
                  onClick={() => setActiveId(view.id)}
                >
                  {view.title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <main className="dinah-editor-area">{active ? <ActiveView view={active} /> : <EmptyState />}</main>

      <footer className="dinah-status-bar">
        <span>dinah</span>
        <span className="dinah-status-spacer" />
        <span>ready</span>
      </footer>
    </div>
  )
}

/**
 * The application's component, under the shell's own chrome. Keyed by id, so
 * switching views remounts rather than handing one view the other's state.
 */
function ActiveView({ view }: { view: ViewContribution }) {
  const Component = view.component
  return (
    <section className="dinah-view" key={view.id}>
      <header className="dinah-view-header">{view.title}</header>
      <div className="dinah-view-body">
        <Component />
      </div>
    </section>
  )
}

function EmptyState() {
  return (
    <div className="dinah-empty-state">
      <p className="dinah-empty-title">The shell is running.</p>
      <p className="dinah-empty-body">
        Contribute a view from your app&apos;s <code>src/</code> and it renders here.
      </p>
    </div>
  )
}
