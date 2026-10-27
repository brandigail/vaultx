import { afterEach, describe, expect, it, vi } from 'vitest'
import { decryptItem, deriveKey, generateSalt } from '../../crypto'
import { DEMO_PASSPHRASE, demoEmail, isDemoEmail } from '../../lib/demo'
import { registerRequestSchema, vaultItemPlainSchema } from '../../types/schemas'
import { SAMPLE_ITEMS, WELCOME_NOTE } from './items'
import { seedDemoVault } from './seed'

const EVERYTHING = [...SAMPLE_ITEMS, WELCOME_NOTE]

afterEach(() => vi.unstubAllGlobals())

describe('demo identity', () => {
  it('uses a fresh, valid demo email each time', () => {
    const a = demoEmail()
    expect(a).not.toBe(demoEmail())
    expect(isDemoEmail(a)).toBe(true)
    const body = { email: a, password: 'x'.repeat(32), kdfSalt: 'AAAA', keyCheck: { ciphertext: 'abc', iv: 'def' } }
    expect(registerRequestSchema.safeParse(body).success).toBe(true)
  })

  it('only matches the exact demo domain', () => {
    expect(isDemoEmail('USER@DEMO.VAULTX.INVALID')).toBe(true)
    expect(isDemoEmail('user@example.com')).toBe(false)
    expect(isDemoEmail('user@evil.demo.vaultx.invalid')).toBe(false)
    expect(isDemoEmail('demo.vaultx.invalid@example.com')).toBe(false)
  })

  it('has a passphrase long enough to register with', () => {
    expect(DEMO_PASSPHRASE.length).toBeGreaterThanOrEqual(12)
  })
})

describe('sample data', () => {
  it('is valid, with unique titles and a mix of kinds', () => {
    for (const item of EVERYTHING) expect(vaultItemPlainSchema.safeParse(item).success).toBe(true)
    expect(new Set(EVERYTHING.map((i) => i.title)).size).toBe(EVERYTHING.length)
    expect(new Set(EVERYTHING.map((i) => i.kind))).toEqual(new Set(['LOGIN', 'NOTE', 'API_KEY']))
  })

  it('contains nothing that looks like a live credential', () => {
    expect(JSON.stringify(EVERYTHING)).not.toMatch(/sk_live|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20}|-----BEGIN/)
  })

  it('includes the items the welcome note points at', () => {
    expect(SAMPLE_ITEMS.some((i) => i.title === 'Old forum login' && i.secret === 'password123')).toBe(true)
  })
})

describe('seedDemoVault', () => {
  it('uploads every item encrypted, welcome note last, with no plaintext on the wire', async () => {
    const bodies: { id: string; ciphertext: string; iv: string }[] = []
    vi.stubGlobal('fetch', (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as { id: string; ciphertext: string; iv: string }
      bodies.push(body)
      const item = { ...body, userId: crypto.randomUUID(), updatedAt: new Date().toISOString() }
      return Promise.resolve(Response.json({ item }, { status: 201 }))
    })

    const key = await deriveKey(DEMO_PASSPHRASE, generateSalt(), 1_000)
    await seedDemoVault(key)

    expect(bodies).toHaveLength(SAMPLE_ITEMS.length + 1)
    const wire = JSON.stringify(bodies)
    for (const item of EVERYTHING) {
      expect(wire).not.toContain(item.secret)
      expect(wire).not.toContain(item.title)
    }

    const last = bodies.at(-1)
    expect(last).toBeDefined()
    if (!last) return
    expect(await decryptItem(key, last.id, last)).toEqual(WELCOME_NOTE)

    const decrypted = await Promise.all(bodies.map((b) => decryptItem(key, b.id, b)))
    expect(decrypted.map((d) => d.title).sort()).toEqual(EVERYTHING.map((i) => i.title).sort())
  })
})

