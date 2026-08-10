/** Everything the template's placeholders are filled from. */
export interface AppIdentity {
  /** Directory and package name. */
  name: string
  /** Reverse-DNS application identifier. */
  appId: string
  /** Human-visible name — window title, menu bar, installer. */
  productName: string
}

export class InvalidNameError extends Error {
  override readonly name = 'InvalidNameError'
}

// npm's rules, minus the ones a directory name cannot hit anyway: lowercase,
// starting with a letter or digit, and nothing that needs escaping in a path.
const VALID_NAME = /^[a-z0-9][a-z0-9._-]*$/

/**
 * Derive an application's identity from the one thing the developer typed.
 *
 * `appId` and `productName` are guesses, and are meant to be: they land in
 * `cheshire.config.ts` as ordinary editable values rather than behind a prompt
 * nobody wants to answer before seeing the app run once.
 */
export function deriveIdentity(rawName: string): AppIdentity {
  const name = rawName.trim()

  if (name === '') {
    throw new InvalidNameError('create-cheshire: give the application a name, e.g. `my-app`.')
  }
  if (!VALID_NAME.test(name)) {
    throw new InvalidNameError(
      `create-cheshire: \`${name}\` is not a usable application name.\n` +
        'Use lowercase letters, digits, hyphens, dots and underscores, starting with a letter or digit.',
    )
  }

  return {
    name,
    appId: `com.example.${name}`,
    productName: toProductName(name),
  }
}

function toProductName(name: string): string {
  return name
    .split(/[-._]+/)
    .filter((word) => word !== '')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
