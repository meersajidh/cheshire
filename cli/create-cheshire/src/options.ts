import { ScaffoldError } from './scaffold.js'

export const USAGE = `
  create-cheshire — generate a desktop application

  Usage
    pnpm create cheshire <name>

  Requires pnpm — a generated application declares \`nodeLinker: hoisted\`,
  which npm and yarn have no equivalent for and electron-builder needs.

  Options
    --registry <url>        Install from this registry instead of the default
    --from-tarballs <dir>   Install the framework from packed tarballs (proof gate)
    --no-install            Skip installing dependencies
    --no-git                Skip \`git init\`
    -h, --help              Show this message
`

export interface Options {
  name?: string
  fromTarballs?: string
  registry?: string
  install: boolean
  git: boolean
}

/**
 * Separated from `cli.ts` so it can be tested: that module runs `main()` at
 * import time, which is right for an entry point and impossible to unit test.
 */
export function parse(argv: string[]): Options {
  const options: Options = { install: true, git: true }

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index] as string

    if (argument === '--from-tarballs') {
      const value = argv[index + 1]
      if (!value) throw new ScaffoldError('create-cheshire: --from-tarballs needs a directory.')
      options.fromTarballs = value
      index += 1
    } else if (argument === '--registry') {
      const value = argv[index + 1]
      if (!value) throw new ScaffoldError('create-cheshire: --registry needs a URL.')
      options.registry = value
      index += 1
    } else if (argument === '--no-install') {
      options.install = false
    } else if (argument === '--no-git') {
      options.git = false
    } else if (argument.startsWith('-')) {
      throw new ScaffoldError(`create-cheshire: unknown option \`${argument}\`.\n${USAGE}`)
    } else {
      options.name ??= argument
    }
  }

  return options
}
