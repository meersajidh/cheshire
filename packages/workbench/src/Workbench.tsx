import { useState } from 'react'
import type { ViewContribution } from '@dinah/core/views'

export interface WorkbenchProps {
  /** Shown in the title strip and the empty state. Comes from `dinah.config.ts`. */
  productName: string
  /** What the application contributed from `src/index.ts`. May be empty. */
  views: ViewContribution[]
}

/**
 * The application shell: activity bar, sidebar, editor area, status bar.
 *
 * The sidebar lists the application's views and the editor area renders the
 * active one. *Which* view is active is the workbench's state, not the
 * application's — an application declares what exists, never what is on screen.
 * Commands and layout persistence fill in the rest in later stages.
 */
export function Workbench({ productName, views }: WorkbenchProps) {
  const [activeId, setActiveId] = useState<string | undefined>(() => views[0]?.id)
  const active = views.find((view) => view.id === activeId)

  return (
    <div className="dinah-workbench">
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
 * The application's component, under the workbench's own chrome. Keyed by id, so
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
      <p className="dinah-empty-title">The workbench is running.</p>
      <p className="dinah-empty-body">
        Contribute a view from your app&apos;s <code>src/</code> and it renders here.
      </p>
    </div>
  )
}
