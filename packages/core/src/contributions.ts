/**
 * The contribution contract: what an application declares from `src/index.ts`,
 * and what the shell renders.
 *
 * Implementation only. It reaches consumers through two entries that divide it
 * by audience: `./views` carries what an application declares, `./views/internal`
 * carries the validation the shell runs over that declaration.
 *
 * Both are separate from the barrel for one reason: this module names React's
 * `ComponentType`, and `@cheshire/runtime-electron` imports the barrel from the
 * main process. Keeping them apart means the node side of the framework never
 * pulls React into its type graph, and `skipLibCheck` never gets a chance to
 * degrade an unresolved `react` into `any` in silence.
 *
 * The React reference is type-only and erased at build: importing this module
 * from node loads nothing.
 */
import type { ComponentType } from 'react'

/** A view an application contributes to the shell. */
export interface ViewContribution {
  /** Stable identity, unique within the application. Used to address the view. */
  id: string
  /** Human-visible label — sidebar entry, and the view's heading. */
  title: string
  /** Rendered in the editor area when the view is active. */
  component: ComponentType
}

/** What `src/index.ts` default-exports. */
export interface AppDefinition {
  views?: ViewContribution[]
}

/** An app definition with every default filled in. What the shell consumes. */
export interface ResolvedApp {
  views: ViewContribution[]
}

/** Thrown when `src/index.ts` is not a usable app definition. */
export class CheshireAppError extends Error {
  override readonly name = 'CheshireAppError'
}

/**
 * Identity at runtime; the point is the type. The counterpart to `defineConfig`:
 * `cheshire.config.ts` says what the application *is*, `src/index.ts` says what it
 * *contributes*.
 */
export function defineApp(app: AppDefinition): AppDefinition {
  return app
}

/**
 * Validate and apply defaults. Runs in the renderer, against whatever the
 * application's entry actually exported — so every branch here is reachable by a
 * developer, and every message names `src/index.ts` and the fix.
 */
export function resolveApp(app: unknown): ResolvedApp {
  if (app === null || typeof app !== 'object') {
    throw new CheshireAppError(
      'src/index.ts must default-export an app definition. Use `export default defineApp({ ... })`.',
    )
  }

  const views = (app as AppDefinition).views ?? []
  if (!Array.isArray(views)) {
    throw new CheshireAppError('src/index.ts: `views` must be an array of views.')
  }

  const seen = new Set<string>()
  views.forEach((view, index) => {
    const id = validateView(view, index)
    if (seen.has(id)) {
      throw new CheshireAppError(
        `src/index.ts: two views share the id \`${id}\`. View ids must be unique.`,
      )
    }
    seen.add(id)
  })

  return { views }
}

/** Checks one view and returns its id, so the caller can test uniqueness. */
function validateView(view: unknown, index: number): string {
  const where = `src/index.ts: views[${index}]`

  if (view === null || typeof view !== 'object') {
    throw new CheshireAppError(`${where} is not a view. Expected \`{ id, title, component }\`.`)
  }

  const { id, title, component } = view as Partial<ViewContribution>

  if (typeof id !== 'string' || id.trim() === '') {
    throw new CheshireAppError(`${where} is missing \`id\`. Add one, e.g. \`id: 'welcome'\`.`)
  }
  if (typeof title !== 'string' || title.trim() === '') {
    throw new CheshireAppError(`${where} (\`${id}\`) is missing \`title\`. Add one, e.g. \`title: 'Welcome'\`.`)
  }
  if (typeof component !== 'function') {
    throw new CheshireAppError(
      `${where} (\`${id}\`) is missing \`component\`. Point it at a React component, e.g. \`component: Welcome\`.`,
    )
  }

  return id
}
