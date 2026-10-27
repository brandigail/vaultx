export type StrengthLevel = 0 | 1 | 2 | 3 | 4

export interface Strength {
  bits: number
  level: StrengthLevel
  label: string
}

const LABELS = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'] as const

/** Bits at which each level starts (level 0 below the first). */
const THRESHOLDS = [28, 40, 60, 80] as const

const COMMON = new Set([
  'password', 'password1', 'passw0rd', '123456', '12345678', '123456789', '1234567890', 'qwerty', 'qwertyuiop',
  'letmein', 'welcome', 'admin', 'iloveyou', 'monkey', 'dragon', 'football', 'abc123', 'login', 'princess', 'sunshine',
])

function poolSize(password: string): number {
  let pool = 0
  if (/[a-z]/.test(password)) pool += 26
  if (/[A-Z]/.test(password)) pool += 26
  if (/[0-9]/.test(password)) pool += 10
  if (/[^a-zA-Z0-9]/.test(password)) pool += 32
  return pool
}

/**
 * Characters that repeat the previous one, or step by one from it (aaa, 123, cba), add
 * little real randomness, so each counts as a quarter of a character.
 */
function effectiveLength(password: string): number {
  let total = 0
  for (let i = 0; i < password.length; i++) {
    const step = i === 0 ? null : password.charCodeAt(i) - password.charCodeAt(i - 1)
    total += step !== null && Math.abs(step) <= 1 ? 0.25 : 1
  }
  return total
}

/**
 * Estimates the entropy of a password in bits, assuming each character is drawn uniformly
 * from the classes it uses. This is an upper bound for human-chosen passwords, so known
 * common passwords are capped. It is a guide, not a guarantee.
 */
export function estimateStrength(password: string): Strength {
  const pool = poolSize(password)
  let bits = pool === 0 ? 0 : effectiveLength(password) * Math.log2(pool)
  if (COMMON.has(password.toLowerCase())) bits = Math.min(bits, 10)
  bits = Math.round(bits)

  const level = THRESHOLDS.filter((threshold) => bits >= threshold).length as StrengthLevel
  return { bits, level, label: LABELS[level] }
}
