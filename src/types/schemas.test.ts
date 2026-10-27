import { describe, expect, it } from 'vitest'
import {
  createShareLinkRequestSchema,
  MAX_SHARE_TTL_SECONDS,
  registerRequestSchema,
  createVaultItemRequestSchema,
  vaultItemPlainSchema,
} from './schemas'

describe('schemas', () => {
  it('accepts a valid plain item and rejects unknown kinds', () => {
    expect(vaultItemPlainSchema.safeParse({ title: 'GitHub', kind: 'LOGIN', secret: 'x' }).success).toBe(true)
    expect(vaultItemPlainSchema.safeParse({ title: 'GitHub', kind: 'OTHER', secret: 'x' }).success).toBe(false)
  })

  it('rejects a weak account password and bad email on register', () => {
    const keyCheck = { ciphertext: 'Y2lwaGVy', iv: 'aXY=' }
    const ok = { email: 'a@b.co', password: 'longenough1', kdfSalt: 'c2FsdA==', keyCheck }
    expect(registerRequestSchema.safeParse(ok).success).toBe(true)
    expect(registerRequestSchema.safeParse({ ...ok, password: 'short' }).success).toBe(false)
    expect(registerRequestSchema.safeParse({ ...ok, email: 'nope' }).success).toBe(false)
  })

  it('requires ciphertext and iv, and strips unexpected plaintext fields', () => {
    const id = crypto.randomUUID()
    expect(createVaultItemRequestSchema.safeParse({ id, ciphertext: 'abc' }).success).toBe(false)
    const parsed = createVaultItemRequestSchema.parse({ id, ciphertext: 'abc', iv: 'def', secret: 'hunter2' })
    expect(parsed).toEqual({ id, ciphertext: 'abc', iv: 'def' })
  })

  it('bounds the share link lifetime and ignores a client-supplied expiry timestamp', () => {
    const base = { id: crypto.randomUUID(), itemId: crypto.randomUUID(), ciphertext: 'abc', iv: 'def' }
    expect(createShareLinkRequestSchema.safeParse({ ...base, ttlSeconds: 3600 }).success).toBe(true)
    expect(createShareLinkRequestSchema.safeParse({ ...base, ttlSeconds: 59 }).success).toBe(false)
    expect(createShareLinkRequestSchema.safeParse({ ...base, ttlSeconds: MAX_SHARE_TTL_SECONDS + 1 }).success).toBe(false)
    expect(createShareLinkRequestSchema.safeParse({ ...base, ttlSeconds: 1.5 }).success).toBe(false)
    expect(createShareLinkRequestSchema.safeParse(base).success).toBe(false)
    const parsed = createShareLinkRequestSchema.parse({ ...base, ttlSeconds: 3600, expiresAt: '2099-01-01T00:00:00Z' })
    expect('expiresAt' in parsed).toBe(false)
  })
})
