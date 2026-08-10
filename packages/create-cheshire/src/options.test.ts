import { describe, expect, it } from 'vitest'
import { parse } from './options.js'
import { ScaffoldError } from './scaffold.js'

describe('parse', () => {
  it('defaults to installing and initialising git', () => {
    expect(parse(['demo'])).toEqual({ name: 'demo', install: true, git: true })
  })

  it('takes a registry URL', () => {
    expect(parse(['demo', '--registry', 'http://localhost:4873'])).toEqual({
      name: 'demo',
      registry: 'http://localhost:4873',
      install: true,
      git: true,
    })
  })

  it('names the missing value rather than swallowing the next argument', () => {
    expect(() => parse(['demo', '--registry'])).toThrow(ScaffoldError)
    expect(() => parse(['demo', '--registry'])).toThrow(/--registry needs a URL/)
  })

  it('does not mistake an option value for the application name', () => {
    expect(parse(['--registry', 'http://localhost:4873', 'demo']).name).toBe('demo')
  })

  it('rejects an unknown option instead of treating it as a name', () => {
    expect(() => parse(['demo', '--registy', 'http://x'])).toThrow(/unknown option/)
  })

  // `--from-tarballs` was the pre-registry install path. It is gone, and a stale
  // invocation must say so rather than generate an application that quietly
  // installs from npm instead.
  it('rejects the retired --from-tarballs flag', () => {
    expect(() => parse(['demo', '--from-tarballs', '/tmp/tarballs'])).toThrow(/unknown option/)
  })

  it('turns the skip flags off', () => {
    expect(parse(['demo', '--no-install', '--no-git'])).toEqual({
      name: 'demo',
      install: false,
      git: false,
    })
  })
})
