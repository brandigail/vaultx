import { describe, expect, it } from 'vitest'
import type { VaultItemPlain } from '../types'
import { DecryptionError } from './aes'
import { fromBase64Url, toBase64Url } from './encoding'
import { InvalidShareKeyError, createShareKey, decryptShare, encryptShare, importShareKey } from './share'

const item: VaultItemPlain = { title: 'Wifi', kind: 'LOGIN', username: 'guest', secret: 'correct-horse-battery', notes: 'for visitors' }

describe('base64url', () => {
  it('round-trips every byte value without + / or padding', () => {
    const bytes = Uint8Array.from({ length: 256 }, (_, i) => i)
    const encoded = toBase64Url(bytes)
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/)
    expect([...fromBase64Url(encoded)]).toEqual([...bytes])
  })
})

describe('share keys', () => {
  it('produce a 43-character URL-safe fragment, unique each time', async () => {
    const a = await createShareKey()
    const b = await createShareKey()
    expect(a.fragment).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(a.fragment).not.toBe(b.fragment)
  })

  it('are not extractable once imported', async () => {
    const { key } = await createShareKey()
    expect(key.extractable).toBe(false)
    await expect(crypto.subtle.exportKey('raw', key)).rejects.toThrow()
  })

  it('reject malformed fragments', async () => {
    await expect(importShareKey('')).rejects.toBeInstanceOf(InvalidShareKeyError)
    await expect(importShareKey('too-short')).rejects.toBeInstanceOf(InvalidShareKeyError)
    await expect(importShareKey('!'.repeat(43))).rejects.toBeInstanceOf(InvalidShareKeyError)
    await expect(importShareKey('A'.repeat(60))).rejects.toBeInstanceOf(InvalidShareKeyError)
  })
})

describe('share encryption', () => {
  it('round-trips through the fragment, as a recipient would', async () => {
    const shareId = crypto.randomUUID()
    const { key, fragment } = await createShareKey()
    const sealed = await encryptShare(key, shareId, item)
    expect(await decryptShare(await importShareKey(fragment), shareId, sealed)).toEqual(item)
  })

  it('does not put plaintext in the ciphertext', async () => {
    const { key } = await createShareKey()
    const sealed = await encryptShare(key, crypto.randomUUID(), item)
    expect(JSON.stringify(sealed)).not.toContain('correct-horse')
    expect(atob(sealed.ciphertext)).not.toContain('correct-horse')
  })

  it('fails with a different key', async () => {
    const shareId = crypto.randomUUID()
    const sealed = await encryptShare((await createShareKey()).key, shareId, item)
    await expect(decryptShare((await createShareKey()).key, shareId, sealed)).rejects.toBeInstanceOf(DecryptionError)
  })

  it('fails when the ciphertext is served under a different share id', async () => {
    const { key } = await createShareKey()
    const sealed = await encryptShare(key, crypto.randomUUID(), item)
    await expect(decryptShare(key, crypto.randomUUID(), sealed)).rejects.toBeInstanceOf(DecryptionError)
  })

  it('detects tampering', async () => {
    const shareId = crypto.randomUUID()
    const { key } = await createShareKey()
    const sealed = await encryptShare(key, shareId, item)
    const flipped = String.fromCharCode(atob(sealed.ciphertext).charCodeAt(0) ^ 1) + atob(sealed.ciphertext).slice(1)
    await expect(decryptShare(key, shareId, { ...sealed, ciphertext: btoa(flipped) })).rejects.toBeInstanceOf(DecryptionError)
  })

  it('uses a fresh IV for every share', async () => {
    const { key } = await createShareKey()
    const id = crypto.randomUUID()
    expect((await encryptShare(key, id, item)).iv).not.toBe((await encryptShare(key, id, item)).iv)
  })
})
