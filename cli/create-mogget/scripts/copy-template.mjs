import { cpSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// The template lives at the repository root, where it is edited and reviewed as
// its own thing. It ships *inside* this package, because a published
// create-mogget has no repository to read from — so the build copies it in.
const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = resolve(packageDir, '../../templates/workbench')
const destination = join(packageDir, 'dist', 'template')

rmSync(destination, { recursive: true, force: true })
cpSync(source, destination, { recursive: true })

console.log(`create-mogget: template copied to ${destination}`)
