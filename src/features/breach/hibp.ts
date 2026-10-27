const RANGE_URL = 'https://api.pwnedpasswords.com/range/'
const PREFIX_LENGTH = 5
const TIMEOUT_MS = 8000

export class BreachCheckError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BreachCheckError'
  }
}

async function sha1Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

/** Finds the suffix in a range response of `SUFFIX:COUNT` lines. Padding rows have a count of 0. */
function countFor(suffix: string, body: string): number {
  for (const line of body.split('\n')) {
    const [candidate, count] = line.trim().split(':')
    if (candidate === suffix) return Number(count) || 0
  }
  return 0
}

/**
 * How many times a password appears in known breaches, via the HaveIBeenPwned range API.
 * Only the first 5 hex characters of the SHA-1 hash leave the browser (k-anonymity); the
 * password and the rest of the hash are never sent. `Add-Padding` hides the response size.
 */
export async function breachCount(password: string, fetchImpl: typeof fetch = fetch): Promise<number> {
  const hash = await sha1Hex(password)
  const prefix = hash.slice(0, PREFIX_LENGTH)
  const suffix = hash.slice(PREFIX_LENGTH)

  let response: Response
  try {
    response = await fetchImpl(`${RANGE_URL}${prefix}`, {
      headers: { 'Add-Padding': 'true' },
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch {
    throw new BreachCheckError('Could not reach the breach database.')
  }
  if (!response.ok) throw new BreachCheckError('The breach database returned an error.')
  return countFor(suffix, await response.text())
}
