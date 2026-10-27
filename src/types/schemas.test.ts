import { describe, expect, it } from 'vitest'
import {
  createShareLinkRequestSchema,
  registerRequestSchema,
  upsertVaultItemRequestSchema,
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
    expect(upsertVaultItemRequestSchema.safeParse({ ciphertext: 'abc' }).success).toBe(false)
    const parsed = upsertVaultItemRequestSchema.parse({ ciphertext: 'abc', iv: 'def', secret: 'hunter2' })
    expect(parsed).toEqual({ ciphertext: 'abc', iv: 'def' })
  })

  it('requires an ISO expiry on share links', () => {
    const base = { itemId: crypto.randomUUID(), ciphertext: 'abc', iv: 'def' }
    expect(createShareLinkRequestSchema.safeParse({ ...base, expiresAt: '2026-12-01T00:00:00Z' }).success).toBe(true)
    expect(createShareLinkRequestSchema.safeParse({ ...base, expiresAt: 'tomorrow' }).success).toBe(false)
  })
})
