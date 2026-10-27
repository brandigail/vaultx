import { fromBase64, toBase64 } from './encoding'

/** OWASP 2023 guidance for PBKDF2-HMAC-SHA256. */
export const PBKDF2_ITERATIONS = 600_000
const SALT_BYTES = 16

export function generateSalt(): string {
  return toBase64(crypto.getRandomValues(new Uint8Array(SALT_BYTES)))
}

/**
 * Derives a non-extractable AES-256-GCM key from the master passphrase.
 * The key never leaves the browser's crypto engine, so it cannot be read back or serialised.
 */
export async function deriveKey(
  passphrase: string,
  saltBase64: string,
  iterations: number = PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, [
    'deriveKey',
  ])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromBase64(saltBase64), iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}
