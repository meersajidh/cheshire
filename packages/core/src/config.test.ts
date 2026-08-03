import { describe, expect, it } from 'vitest'
import { DinahConfigError, defineConfig, resolveConfig } from './config.js'

const minimal = defineConfig({ appId: 'com.example.demo', productName: 'Demo' })

describe('resolveConfig', () => {
  it('fills window defaults', () => {
    expect(resolveConfig(minimal).window).toEqual({ width: 1200, height: 800 })
  })

  it('keeps an explicit window field and defaults the rest', () => {
    const resolved = resolveConfig({ ...minimal, window: { width: 640 } })
    expect(resolved.window).toEqual({ width: 640, height: 800 })
  })

  it('names the missing field and the fix', () => {
    expect(() => resolveConfig({ ...minimal, appId: '' })).toThrow(DinahConfigError)
    expect(() => resolveConfig({ ...minimal, appId: '' })).toThrow(/missing `appId`/)
  })

  it('rejects a non-object default export', () => {
    expect(() => resolveConfig(null as never)).toThrow(/default-export a config object/)
  })
})
