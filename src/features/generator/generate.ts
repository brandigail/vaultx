export interface GeneratorOptions {
  length: number
  lower: boolean
  upper: boolean
  digits: boolean
  symbols: boolean
  avoidAmbiguous: boolean
}

export const MIN_LENGTH = 8
export const MAX_LENGTH = 64

export const DEFAULT_OPTIONS: GeneratorOptions = {
  length: 20,
  lower: true,
  upper: true,
  digits: true,
  symbols: true,
  avoidAmbiguous: false,
}

const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const DIGITS = '0123456789'
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.?/~'
const AMBIGUOUS = /[O0oIl1|]/g

/** Uniform integer in [0, max) from the CSPRNG. Rejection sampling avoids modulo bias. */
export function randomInt(max: number): number {
  if (!Number.isInteger(max) || max < 1 || max > 2 ** 32) throw new RangeError('max must be an integer in 1..2^32')
  const limit = 2 ** 32 - (2 ** 32 % max)
  const buffer = new Uint32Array(1)
  do {
    crypto.getRandomValues(buffer)
  } while ((buffer[0] ?? limit) >= limit)
  return (buffer[0] ?? 0) % max
}

function pick(chars: string): string {
  return chars.charAt(randomInt(chars.length))
}

/** The character classes the options select, with ambiguous look-alikes removed on request. */
export function characterClasses(options: GeneratorOptions): string[] {
  const selected = [
    options.lower && LOWER,
    options.upper && UPPER,
    options.digits && DIGITS,
    options.symbols && SYMBOLS,
  ].filter((chars): chars is string => chars !== false)
  return options.avoidAmbiguous ? selected.map((chars) => chars.replace(AMBIGUOUS, '')) : selected
}

/** A random password containing at least one character from every selected class. */
export function generatePassword(options: GeneratorOptions): string {
  const classes = characterClasses(options)
  if (classes.length === 0) throw new RangeError('Select at least one character type')
  if (options.length < classes.length || options.length > MAX_LENGTH) throw new RangeError('Invalid length')

  const pool = classes.join('')
  const chars = [...classes.map(pick)]
  while (chars.length < options.length) chars.push(pick(pool))

  // Fisher-Yates, so the guaranteed characters do not sit at the front.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    const a = chars[i] ?? ''
    chars[i] = chars[j] ?? ''
    chars[j] = a
  }
  return chars.join('')
}
