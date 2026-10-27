import { neon } from '@neondatabase/serverless'
import { afterAll, describe, expect, it } from 'vitest'
import { DEMO_EMAIL_DOMAIN, demoEmail } from '../../src/lib/demo'
import register from '../functions/auth-register'

const enabled = Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET)
const db = () => neon(process.env.DATABASE_URL ?? '')

async function signUp(email: string): Promise<number> {
  const res = await register(
    new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'a-long-enough-password',
        kdfSalt: 'AAAAAAAAAAAAAAAAAAAAAA==',
        keyCheck: { ciphertext: 'YWJjZGVm', iv: 'AAAAAAAAAAAAAAAA' },
      }),
    }),
  )
  return res.status
}

const exists = async (email: string): Promise<boolean> =>
  (await db().query('SELECT 1 FROM users WHERE email = $1', [email])).length === 1

const age = (email: string, hours: number) =>
  db().query(`UPDATE users SET created_at = now() - make_interval(hours => $2::int) WHERE email = $1`, [email, hours])

// Each sign-up hashes a password with bcrypt, so give a loaded machine more than the 5s default.
describe.skipIf(!enabled)('demo account expiry (Neon integration)', { timeout: 30_000 }, () => {
  const created: string[] = []
  const track = (email: string): string => {
    created.push(email)
    return email
  }

  afterAll(async () => {
    await db().query('DELETE FROM users WHERE email = ANY($1)', [created])
  })

  it('deletes demo accounts older than 24 hours when a new demo account is created', async () => {
    const stale = track(demoEmail())
    const fresh = track(demoEmail())
    expect(await signUp(stale)).toBe(201)
    expect(await signUp(fresh)).toBe(201)
    await age(stale, 25)
    await age(fresh, 23)

    expect(await signUp(track(demoEmail()))).toBe(201)
    expect(await exists(stale)).toBe(false)
    expect(await exists(fresh)).toBe(true)
  })

  it('never touches non-demo accounts, however old', async () => {
    const real = track(`real-${crypto.randomUUID()}@example.test`)
    expect(await signUp(real)).toBe(201)
    await age(real, 24 * 400)
    expect(await signUp(track(demoEmail()))).toBe(201)
    expect(await exists(real)).toBe(true)
  })

  it('only purges when a demo account is created, not on ordinary sign-ups', async () => {
    const stale = track(demoEmail())
    expect(await signUp(stale)).toBe(201)
    await age(stale, 48)
    expect(await signUp(track(`real-${crypto.randomUUID()}@example.test`))).toBe(201)
    expect(await exists(stale)).toBe(true)
  })

  it('cascades: an expired demo account takes its items with it', async () => {
    const stale = track(demoEmail())
    expect(await signUp(stale)).toBe(201)
    const [user] = await db().query('SELECT id FROM users WHERE email = $1', [stale])
    await db().query(`INSERT INTO vault_items (user_id, ciphertext, iv) VALUES ($1, 'abc', 'def')`, [user?.id])
    await age(stale, 30)
    expect(await signUp(track(demoEmail()))).toBe(201)
    expect(await db().query('SELECT 1 FROM vault_items WHERE user_id = $1', [user?.id])).toHaveLength(0)
  })

  it('uses the reserved .invalid domain, which can never receive mail', () => {
    expect(DEMO_EMAIL_DOMAIN.endsWith('.invalid')).toBe(true)
  })
})
