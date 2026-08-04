import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { deriveIdentity, InvalidNameError } from './identity.js'
import { scaffold, ScaffoldError } from './scaffold.js'

function template(): string {
  const dir = mkdtempSync(join(tmpdir(), 'dinah-template-'))
  mkdirSync(join(dir, 'src'))
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name: '{{name}}', devDependencies: { dinah: '{{dinahVersion}}' } }, null, 2),
  )
  writeFileSync(join(dir, 'dinah.config.ts'), "appId: '{{appId}}', productName: '{{productName}}'")
  writeFileSync(join(dir, '_gitignore'), 'node_modules\n')
  return dir
}

function generate(name: string): string {
  const target = join(mkdtempSync(join(tmpdir(), 'dinah-app-')), name)
  scaffold(template(), target, deriveIdentity(name), { dinah: '1.2.3', react: '^19.2.7' })
  return target
}

describe('deriveIdentity', () => {
  it('guesses an appId and a product name from the one thing typed', () => {
    expect(deriveIdentity('my-notes-app')).toEqual({
      name: 'my-notes-app',
      appId: 'com.example.my-notes-app',
      productName: 'My Notes App',
    })
  })

  it('names the rule when the name breaks it', () => {
    expect(() => deriveIdentity('My App')).toThrow(InvalidNameError)
    expect(() => deriveIdentity('')).toThrow(/give the application a name/)
  })
})

describe('scaffold', () => {
  it('fills every placeholder', () => {
    const target = generate('demo')
    expect(readFileSync(join(target, 'package.json'), 'utf8')).toContain('"name": "demo"')
    expect(readFileSync(join(target, 'package.json'), 'utf8')).toContain('"dinah": "1.2.3"')
    expect(readFileSync(join(target, 'dinah.config.ts'), 'utf8')).toContain(
      "appId: 'com.example.demo', productName: 'Demo'",
    )
  })

  it('restores the .gitignore npm would have stripped', () => {
    const target = generate('demo')
    expect(existsSync(join(target, '.gitignore'))).toBe(true)
    expect(existsSync(join(target, '_gitignore'))).toBe(false)
  })

  it('refuses to generate over an existing application', () => {
    const target = generate('demo')
    expect(() => scaffold(template(), target, deriveIdentity('demo'), { dinah: '1', react: '1' })).toThrow(
      ScaffoldError,
    )
  })
})
