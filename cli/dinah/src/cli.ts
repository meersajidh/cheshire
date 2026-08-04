#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { build } from './build.js'
import { dev } from './dev.js'
import { DinahCliError } from './errors.js'

const USAGE = `
  dinah — build desktop applications

  Usage
    dinah <command>

  Commands
    dev      Start the application in development
    build    Typecheck the application and compile it

  Options
    -h, --help       Show this message
    -v, --version    Show the dinah version
`

async function main(argv: string[]): Promise<void> {
  const [command] = argv

  switch (command) {
    case 'dev':
      return dev()
    case 'build':
      return build()
    case '-h':
    case '--help':
    case undefined:
      console.log(USAGE)
      return
    case '-v':
    case '--version':
      console.log(version())
      return
    default:
      throw new DinahCliError(`dinah: unknown command \`${command}\`.\n${USAGE}`)
  }
}

// Read, not imported: the manifest sits outside the compiler's `rootDir`, and
// a JSON import would drag it into the emitted output.
function version(): string {
  const url = new URL('../package.json', import.meta.url)
  return (JSON.parse(readFileSync(url, 'utf8')) as { version: string }).version
}

try {
  await main(process.argv.slice(2))
} catch (error) {
  // An application author gets the message; a stack through framework
  // internals would tell them nothing they can act on.
  if (error instanceof DinahCliError) {
    console.error(`\n${error.message}\n`)
    process.exitCode = 1
  } else {
    throw error
  }
}
