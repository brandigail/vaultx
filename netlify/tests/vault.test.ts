import { neon } from '@neondatabase/serverless'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createKeyCheck, decryptItem, deriveKey, encryptItem, generateSalt } from '../../src/crypto'
import type { VaultItemPlain } from '../../src/types'
import { vaultItemCipherSchema } from '../../src/types/schemas'
import item from '../functions/vault-item'
import items from '../functions/vault-items'
import { signSession } from '../lib/session'
import { createUser } from '../lib/users'

const enabled = Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET)
const BASE = 'http://localhost/api/vault/items'
const plain: VaultItemPlain = { title: 'GitHub', kind: 'LOGIN', username: 'brandon', secret: 'plaintext-marker-xyz' }

const itemBody = z.object({ item: vaultItemCipherSchema })
const listBody = z.object({ items: z.array(vaultItemCipherSchema) })

function call(
  handler: (req: Request) => Promise<Response>,
  url: string,
  method: string,
  cookie: string | null,
  body?: unknown,
): Promise<Response> {
  const headers: Record<string, string> = {}
  if (cookie) headers.cookie = cookie
  if (body !== undefined) headers['content-type'] = 'application/json'
  return handler(new Request(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }))
}

describe.skipIf(!enabled)('vault functions (Neon integration)', () => {
  const emails = [`vault-a-${crypto.randomUUID()}@example.test`, `vault-b-${crypto.randomUUID()}@example.test`]
  let cookieA = ''
  let cookieB = ''
  let key: CryptoKey

  beforeAll(async () => {
    const salt = generateSalt()
    key = await deriveKey('master passphrase', salt, 1_000)
    const keyCheck = await createKeyCheck(key)
    const [a, b] = await Promise.all(emails.map((email) => createUser(email, 'not-a-real-hash', salt, keyCheck)))
    if (!a || !b) throw new Error('Could not create test users')
    cookieA = `vaultx_session=${await signSession(a.id)}`
    cookieB = `vaultx_session=${await signSession(b.id)}`
  })

  afterAll(async () => {
    await neon(process.env.DATABASE_URL ?? '').query('DELETE FROM users WHERE email = ANY($1)', [emails])
  })

  it('requires a session for every operation', async () => {
    const id = crypto.randomUUID()
    const sealed = { ciphertext: 'abc', iv: 'def' }
    expect((await call(items, BASE, 'GET', null)).status).toBe(401)
    expect((await call(items, BASE, 'POST', null, { id, ...sealed })).status).toBe(401)
    expect((await call(item, `${BASE}/${id}`, 'PUT', null, sealed)).status).toBe(401)
    expect((await call(item, `${BASE}/${id}`, 'DELETE', null)).status).toBe(401)
  })

  it('stores only ciphertext and round-trips through the client crypto', async () => {
    const id = crypto.randomUUID()
    const sealed = await encryptItem(key, id, plain)
    const created = await call(items, BASE, 'POST', cookieA, { id, ...sealed })
    expect(created.status).toBe(201)

    const rows = await neon(process.env.DATABASE_URL ?? '').query('SELECT * FROM vault_items WHERE id = $1', [id])
    expect(JSON.stringify(rows)).not.toContain('plaintext-marker-xyz')
    expect(JSON.stringify(rows)).not.toContain('GitHub')

    const listed = listBody.parse(await (await call(items, BASE, 'GET', cookieA)).json())
    const stored = listed.items.find((i) => i.id === id)
    expect(stored).toBeDefined()
    if (!stored) return
    expect(await decryptItem(key, stored.id, stored)).toEqual(plain)
  })

  it('rejects a duplicate id, even one owned by another user', async () => {
    const id = crypto.randomUUID()
    const sealed = await encryptItem(key, id, plain)
    expect((await call(items, BASE, 'POST', cookieA, { id, ...sealed })).status).toBe(201)
    expect((await call(items, BASE, 'POST', cookieA, { id, ...sealed })).status).toBe(409)
    expect((await call(items, BASE, 'POST', cookieB, { id, ...sealed })).status).toBe(409)
  })

  it('updates ciphertext and bumps updatedAt', async () => {
    const id = crypto.randomUUID()
    const created = itemBody.parse(await (await call(items, BASE, 'POST', cookieA, { id, ...(await encryptItem(key, id, plain)) })).json())
    await new Promise((r) => setTimeout(r, 15))

    const edited = { ...plain, title: 'GitHub (work)' }
    const res = await call(item, `${BASE}/${id}`, 'PUT', cookieA, await encryptItem(key, id, edited))
    expect(res.status).toBe(200)
    const updated = itemBody.parse(await res.json()).item
    expect(updated.ciphertext).not.toBe(created.item.ciphertext)
    expect(Date.parse(updated.updatedAt)).toBeGreaterThan(Date.parse(created.item.updatedAt))
    expect(await decryptItem(key, id, updated)).toEqual(edited)
  })

  it("isolates users: B cannot list, update or delete A's items", async () => {
    const id = crypto.randomUUID()
    const sealed = await encryptItem(key, id, plain)
    await call(items, BASE, 'POST', cookieA, { id, ...sealed })

    const listedByB = listBody.parse(await (await call(items, BASE, 'GET', cookieB)).json())
    expect(listedByB.items.some((i) => i.id === id)).toBe(false)
    expect((await call(item, `${BASE}/${id}`, 'PUT', cookieB, sealed)).status).toBe(404)
    expect((await call(item, `${BASE}/${id}`, 'DELETE', cookieB)).status).toBe(404)

    const stillThere = listBody.parse(await (await call(items, BASE, 'GET', cookieA)).json())
    expect(stillThere.items.some((i) => i.id === id)).toBe(true)
  })

  it('deletes an item, then reports 404', async () => {
    const id = crypto.randomUUID()
    await call(items, BASE, 'POST', cookieA, { id, ...(await encryptItem(key, id, plain)) })
    expect((await call(item, `${BASE}/${id}`, 'DELETE', cookieA)).status).toBe(200)
    expect((await call(item, `${BASE}/${id}`, 'DELETE', cookieA)).status).toBe(404)
    const listed = listBody.parse(await (await call(items, BASE, 'GET', cookieA)).json())
    expect(listed.items.some((i) => i.id === id)).toBe(false)
  })

  it('validates input: bad ids, missing fields and stray plaintext fields', async () => {
    const sealed = { ciphertext: 'abc', iv: 'def' }
    expect((await call(item, `${BASE}/not-a-uuid`, 'PUT', cookieA, sealed)).status).toBe(400)
    expect((await call(items, BASE, 'POST', cookieA, { id: crypto.randomUUID(), ciphertext: 'abc' })).status).toBe(400)
    expect((await call(items, BASE, 'POST', cookieA, { ...sealed, id: 'nope' })).status).toBe(400)

    const id = crypto.randomUUID()
    const res = await call(items, BASE, 'POST', cookieA, { id, ...sealed, secret: 'hunter2', title: 'leak' })
    expect(res.status).toBe(201)
    const rows = await neon(process.env.DATABASE_URL ?? '').query('SELECT * FROM vault_items WHERE id = $1', [id])
    expect(JSON.stringify(rows)).not.toContain('hunter2')
  })

  it('removes all of a user\'s items when the user is deleted', async () => {
    const db = neon(process.env.DATABASE_URL ?? '')
    const itemCount = async (userId: unknown): Promise<number> =>
      Number((await db.query('SELECT count(*)::int AS n FROM vault_items WHERE user_id = $1', [userId]))[0]?.n)

    const [user] = await db.query('SELECT id FROM users WHERE email = $1', [emails[0]])
    expect(await itemCount(user?.id)).toBeGreaterThan(0)
    await db.query('DELETE FROM users WHERE id = $1', [user?.id])
    expect(await itemCount(user?.id)).toBe(0)
  })
})
