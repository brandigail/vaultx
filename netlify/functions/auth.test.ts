import { neon } from '@neondatabase/serverless'
import { afterAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createKeyCheck, deriveKey, generateSalt } from '../../src/crypto'
import { sessionUserSchema } from '../../src/types/schemas'
import login from './auth-login'
import logout from './auth-logout'
import me from './auth-me'
import register from './auth-register'

const enabled = Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET)
const email = `Test-${crypto.randomUUID()}@Example.test`
const password = 'a-long-enough-password'
const kdfSalt = generateSalt()
const keyCheck = await createKeyCheck(await deriveKey('master passphrase', kdfSalt, 1_000))

function post(path: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

const userBody = z.object({ user: sessionUserSchema })

function cookieFrom(res: Response): string {
  return (res.headers.get('set-cookie') ?? '').split(';')[0] ?? ''
}

describe.skipIf(!enabled)('auth functions (Neon integration)', () => {
  afterAll(async () => {
    await neon(process.env.DATABASE_URL ?? '').query('DELETE FROM users WHERE email = $1', [email.toLowerCase()])
  })

  it('registers, sets an HttpOnly session cookie and returns no password hash', async () => {
    const res = await register(post('/api/auth/register', { email, password, kdfSalt, keyCheck }))
    expect(res.status).toBe(201)
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('SameSite=Strict')
    const body = userBody.parse(await res.json())
    expect(body.user).toEqual({ id: expect.any(String), email: email.toLowerCase(), kdfSalt, keyCheck })
    expect(JSON.stringify(body)).not.toMatch(/hash|\$2[aby]\$/i)
  })

  it('stores a bcrypt hash, not the password', async () => {
    const rows = await neon(process.env.DATABASE_URL ?? '').query('SELECT password_hash FROM users WHERE email = $1', [
      email.toLowerCase(),
    ])
    const hash = String(rows[0]?.password_hash)
    expect(hash).toMatch(/^\$2[aby]\$12\$/)
    expect(hash).not.toContain(password)
  })

  it('rejects a duplicate email regardless of case', async () => {
    const res = await register(post('/api/auth/register', { email: email.toUpperCase(), password, kdfSalt, keyCheck }))
    expect(res.status).toBe(409)
  })

  it('rejects weak passwords, bad bodies and non-JSON content', async () => {
    expect((await register(post('/api/auth/register', { email: 'x@y.test', password: 'short', kdfSalt, keyCheck }))).status).toBe(400)
    expect((await register(post('/api/auth/register', { nope: true }))).status).toBe(400)
    const form = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'email=a',
    })
    expect((await register(form)).status).toBe(415)
  })

  it('logs in with the right password and rejects wrong password and unknown email identically', async () => {
    const ok = await login(post('/api/auth/login', { email, password }))
    expect(ok.status).toBe(200)
    expect(cookieFrom(ok)).toMatch(/^vaultx_session=.+/)

    const wrong = await login(post('/api/auth/login', { email, password: 'wrong-password-123' }))
    const unknown = await login(post('/api/auth/login', { email: 'nobody@example.test', password }))
    expect(wrong.status).toBe(401)
    expect(unknown.status).toBe(401)
    expect(await wrong.json()).toEqual(await unknown.json())
  })

  it('/me needs a valid session and rejects a forged token', async () => {
    const session = cookieFrom(await login(post('/api/auth/login', { email, password })))
    const authed = await me(new Request('http://localhost/api/auth/me', { headers: { cookie: session } }))
    expect(authed.status).toBe(200)
    expect(userBody.parse(await authed.json()).user.email).toBe(email.toLowerCase())

    expect((await me(new Request('http://localhost/api/auth/me'))).status).toBe(401)
    const forged = `${session.slice(0, -3)}abc`
    expect((await me(new Request('http://localhost/api/auth/me', { headers: { cookie: forged } }))).status).toBe(401)
  })

  it('logout clears the cookie', async () => {
    const res = await logout(post('/api/auth/logout', {}))
    expect(res.headers.get('set-cookie')).toContain('Max-Age=0')
  })
})
