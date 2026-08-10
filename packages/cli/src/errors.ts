/**
 * An error whose message is already the whole story for the developer reading
 * it. The CLI prints these without a stack trace — a stack through framework
 * internals tells an application author nothing they can act on.
 */
export class CheshireCliError extends Error {
  override readonly name = 'CheshireCliError'
}
