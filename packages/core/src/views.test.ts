import { describe, expect, it } from 'vitest'
import { CheshireAppError, defineApp, resolveApp } from './views.js'

function Welcome() {
  return null
}

const welcome = { id: 'welcome', title: 'Welcome', component: Welcome }

describe('resolveApp', () => {
  it('defaults an app that contributes nothing to no views', () => {
    expect(resolveApp(defineApp({}))).toEqual({ views: [] })
  })

  it('keeps contributed views in declaration order', () => {
    const app = defineApp({ views: [welcome, { ...welcome, id: 'second' }] })
    expect(resolveApp(app).views.map((view) => view.id)).toEqual(['welcome', 'second'])
  })

  it('rejects a non-object default export', () => {
    expect(() => resolveApp(undefined)).toThrow(CheshireAppError)
    expect(() => resolveApp(undefined)).toThrow(/default-export an app definition/)
  })

  it('names the view index and the missing field', () => {
    expect(() => resolveApp({ views: [{ title: 'Welcome', component: Welcome }] })).toThrow(
      /views\[0\] is missing `id`/,
    )
    expect(() => resolveApp({ views: [{ ...welcome, component: undefined }] })).toThrow(
      /views\[0\] \(`welcome`\) is missing `component`/,
    )
  })

  it('rejects duplicate ids', () => {
    expect(() => resolveApp({ views: [welcome, welcome] })).toThrow(
      /two views share the id `welcome`/,
    )
  })
})
