import { beforeAll, describe, expect, it } from 'vitest'
import type { VaultItemPlain } from '../types'
import { DecryptionError, decryptItem, deriveKey, encryptItem, fromBase64, generateSalt, open, seal, toBase64 } from './index'

// Low iteration count keeps the suite fast; the production default is exercised once below.
const ITERATIONS = 1_000

const item: VaultItemPlain = {
  title: 'GitHub',
  kind: 'LOGIN',
  username: 'brandon',
  secret: 'correct horse battery staple ✓ ünïcödé',
  url: 'https://github.com',
}

function flipByte(base64: string, index = 0): string {
  const bytes = fromBase64(base64)
  bytes[index] = (bytes[index] ?? 0) ^ 0xff
  return toBase64(bytes)
}

describe('key derivation', () => {
  let salt: string
  beforeAll(() => {
    salt = generateSalt()
  })

  it('generates unique 16-byte salts', () => {
    expect(fromBase64(salt)).toHaveLength(16)
    expect(generateSalt()).not.toBe(salt)
  })

  it('derives a non-extractable AES-GCM key', async () => {
    const key = await deriveKey('passphrase', salt, ITERATIONS)
    expect(key.extractable).toBe(false)
    expect(key.algorithm).toMatchObject({ name: 'AES-GCM', length: 256 })
    await expect(crypto.subtle.exportKey('raw', key)).rejects.toThrow()
  })

  it('is deterministic for the same passphrase and salt, and differs otherwise', async () => {
    const a = await deriveKey('passphrase', salt, ITERATIONS)
    const b = await deriveKey('passphrase', salt, ITERATIONS)
    const sealed = await seal(a, 'hello')
    expect(await open(b, sealed)).toBe('hello')

    const otherPassphrase = await deriveKey('Passphrase', salt, ITERATIONS)
    await expect(open(otherPassphrase, sealed)).rejects.toBeInstanceOf(DecryptionError)
    const otherSalt = await deriveKey('passphrase', generateSalt(), ITERATIONS)
    await expect(open(otherSalt, sealed)).rejects.toBeInstanceOf(DecryptionError)
  })

  it('works with the production iteration count', async () => {
    const key = await deriveKey('passphrase', salt)
    expect(await open(key, await seal(key, 'ok'))).toBe('ok')
  }, 30_000)
})

describe('AES-GCM seal/open', () => {
  it('round-trips text including unicode and empty strings', async () => {
    const key = await deriveKey('pw', generateSalt(), ITERATIONS)
    for (const text of ['', 'plain', item.secret, 'x'.repeat(100_000)]) {
      expect(await open(key, await seal(key, text))).toBe(text)
    }
  })

  it('uses a unique random IV and so unique ciphertext each time', async () => {
    const key = await deriveKey('pw', generateSalt(), ITERATIONS)
    const a = await seal(key, 'same')
    const b = await seal(key, 'same')
    expect(fromBase64(a.iv)).toHaveLength(12)
    expect(a.iv).not.toBe(b.iv)
    expect(a.ciphertext).not.toBe(b.ciphertext)
  })

  it('does not contain the plaintext in the output', async () => {
    const key = await deriveKey('pw', generateSalt(), ITERATIONS)
    const sealed = await seal(key, 'super-secret-value')
    expect(atob(sealed.ciphertext)).not.toContain('super-secret')
  })

  it('fails with the wrong key', async () => {
    const salt = generateSalt()
    const key = await deriveKey('right', salt, ITERATIONS)
    const wrong = await deriveKey('wrong', salt, ITERATIONS)
    await expect(open(wrong, await seal(key, 'data'))).rejects.toBeInstanceOf(DecryptionError)
  })

  it('detects tampering with the ciphertext, the tag or the IV', async () => {
    const key = await deriveKey('pw', generateSalt(), ITERATIONS)
    const sealed = await seal(key, 'data to protect')
    const last = fromBase64(sealed.ciphertext).length - 1
    await expect(open(key, { ...sealed, ciphertext: flipByte(sealed.ciphertext) })).rejects.toBeInstanceOf(DecryptionError)
    await expect(open(key, { ...sealed, ciphertext: flipByte(sealed.ciphertext, last) })).rejects.toBeInstanceOf(DecryptionError)
    await expect(open(key, { ...sealed, iv: flipByte(sealed.iv) })).rejects.toBeInstanceOf(DecryptionError)
  })

  it('detects truncated ciphertext', async () => {
    const key = await deriveKey('pw', generateSalt(), ITERATIONS)
    const sealed = await seal(key, 'data')
    const truncated = toBase64(fromBase64(sealed.ciphertext).slice(0, 5))
    await expect(open(key, { ...sealed, ciphertext: truncated })).rejects.toBeInstanceOf(DecryptionError)
  })

  it('rejects a mismatched additional-authenticated-data value', async () => {
    const key = await deriveKey('pw', generateSalt(), ITERATIONS)
    const sealed = await seal(key, 'data', 'item-1')
    expect(await open(key, sealed, 'item-1')).toBe('data')
    await expect(open(key, sealed, 'item-2')).rejects.toBeInstanceOf(DecryptionError)
    await expect(open(key, sealed)).rejects.toBeInstanceOf(DecryptionError)
  })
})

describe('vault items', () => {
  it('round-trips an item', async () => {
    const key = await deriveKey('pw', generateSalt(), ITERATIONS)
    const id = crypto.randomUUID()
    expect(await decryptItem(key, id, await encryptItem(key, id, item))).toEqual(item)
  })

  it('refuses a ciphertext moved to a different item id', async () => {
    const key = await deriveKey('pw', generateSalt(), ITERATIONS)
    const sealed = await encryptItem(key, crypto.randomUUID(), item)
    await expect(decryptItem(key, crypto.randomUUID(), sealed)).rejects.toBeInstanceOf(DecryptionError)
  })

  it('rejects decrypted data that is not a valid item', async () => {
    const key = await deriveKey('pw', generateSalt(), ITERATIONS)
    const id = crypto.randomUUID()
    const bogus = await seal(key, JSON.stringify({ title: 'x', kind: 'NOPE' }), id)
    await expect(decryptItem(key, id, bogus)).rejects.toThrow()
  })
})
