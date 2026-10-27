import { neon } from '@neondatabase/serverless'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createKeyCheck, createShareKey, decryptShare, deriveKey, encryptItem, encryptShare, generateSalt, importShareKey } from '../../src/crypto'
import type { VaultItemPlain } from '../../src/types'
import { publicShareSchema, shareSummarySchema } from '../../src/types/schemas'
import shareLink from '../functions/share-link'
import shareLinks from '../functions/share-links'
import vaultItem from '../functions/vault-item'
import vaultItems from '../functions/vault-items'
import { signSession } from '../lib/session'
import { createUser } from '../lib/users'

const enabled = Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET)
const plain: VaultItemPlain = { title: 'Router', kind: 'LOGIN', username: 'admin', secret: 'share-marker-secret-91' }

const createdBody = z.object({ share: shareSummarySchema })
const listBody = z.object({ shares: z.array(shareSummarySchema) })
const publicBody = z.object({ share: publicShareSchema })

type Handler = (req: Request) => Promise<Response>

function call(handler: Handler, url: string, method: string, cookie: string | null, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = {}
  if (cookie) headers.cookie = cookie
  if (body !== undefined) headers['content-type'] = 'application/json'
  return handler(new Request(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }))
}

describe.skipIf(!enabled)('share links (Neon integration)', () => {
  const emails = [`share-a-${crypto.randomUUID()}@example.test`, `share-b-${crypto.randomUUID()}@example.test`]
  const db = () => neon(process.env.DATABASE_URL ?? '')
  let cookieA = ''
  let cookieB = ''
  let key: CryptoKey

  const linksUrl = 'http://localhost/api/share-links'
  const linkUrl = (id: string) => `http://localhost/api/share-link/${id}`

  /** Creates a vault item for A and returns its id. */
  async function newItem(): Promise<string> {
    const id = crypto.randomUUID()
    const res = await call(vaultItems, 'http://localhost/api/vault/items', 'POST', cookieA, { id, ...(await encryptItem(key, id, plain)) })
    expect(res.status).toBe(201)
    return id
  }

  /** Encrypts and posts a share the way the browser does. Returns the id and the fragment (the key, never sent). */
  async function newShare(itemId: string, ttlSeconds = 3600, cookie: string | null = cookieA) {
    const shareId = crypto.randomUUID()
    const { key: shareKey, fragment } = await createShareKey()
    const sealed = await encryptShare(shareKey, shareId, plain)
    const res = await call(shareLinks, linksUrl, 'POST', cookie, { id: shareId, itemId, ttlSeconds, ...sealed })
    return { shareId, fragment, res }
  }

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
    await db().query('DELETE FROM users WHERE email = ANY($1)', [emails])
  })

  it('requires a session to create, list and revoke, but not to read a share', async () => {
    const id = crypto.randomUUID()
    expect((await call(shareLinks, linksUrl, 'POST', null, { id, itemId: id, ttlSeconds: 3600, ciphertext: 'abc', iv: 'def' })).status).toBe(401)
    expect((await call(shareLinks, `${linksUrl}?itemId=${id}`, 'GET', null)).status).toBe(401)
    expect((await call(shareLink, linkUrl(id), 'DELETE', null)).status).toBe(401)
    expect((await call(shareLink, linkUrl(id), 'GET', null)).status).toBe(410)
  })

  it('stores only ciphertext, sets expiry from the server clock, and serves it to a link holder who decrypts it', async () => {
    const itemId = await newItem()
    const before = Date.now()
    const { shareId, fragment, res } = await newShare(itemId, 3600)
    expect(res.status).toBe(201)
    const { share } = createdBody.parse(await res.json())
    expect(share.id).toBe(shareId)
    const expiresIn = Date.parse(share.expiresAt) - before
    expect(expiresIn).toBeGreaterThan(3600_000 - 5000)
    expect(expiresIn).toBeLessThan(3600_000 + 15_000)

    const rows = await db().query('SELECT * FROM share_links WHERE id = $1', [shareId])
    expect(JSON.stringify(rows)).not.toContain('share-marker-secret-91')
    expect(JSON.stringify(rows)).not.toContain('Router')
    expect(JSON.stringify(rows)).not.toContain(fragment)

    // No session at all: the link is the credential.
    const fetched = await call(shareLink, linkUrl(shareId), 'GET', null)
    expect(fetched.status).toBe(200)
    expect(fetched.headers.get('cache-control')).toBe('no-store')
    const text = await fetched.text()
    expect(text).not.toContain(fragment)
    const { share: served } = publicBody.parse(JSON.parse(text))
    expect(await decryptShare(await importShareKey(fragment), shareId, served)).toEqual(plain)
  })

  it('ignores a client-supplied expiry timestamp', async () => {
    const itemId = await newItem()
    const shareId = crypto.randomUUID()
    const { key: shareKey } = await createShareKey()
    const sealed = await encryptShare(shareKey, shareId, plain)
    const res = await call(shareLinks, linksUrl, 'POST', cookieA, {
      id: shareId, itemId, ttlSeconds: 60, expiresAt: '2099-01-01T00:00:00Z', ...sealed,
    })
    const { share } = createdBody.parse(await res.json())
    expect(Date.parse(share.expiresAt)).toBeLessThan(Date.now() + 120_000)
  })

  it('rejects bad lifetimes and malformed bodies', async () => {
    const itemId = await newItem()
    for (const ttlSeconds of [0, 59, 31 * 24 * 3600, 1.5, -5]) {
      expect((await newShare(itemId, ttlSeconds)).res.status).toBe(400)
    }
    expect((await call(shareLinks, linksUrl, 'POST', cookieA, { id: crypto.randomUUID(), itemId, ttlSeconds: 60 })).status).toBe(400)
    expect((await call(shareLinks, `${linksUrl}?itemId=nope`, 'GET', cookieA)).status).toBe(400)
    expect((await call(shareLink, linkUrl('not-a-uuid'), 'GET', null)).status).toBe(400)
  })

  it("will not share, list or revoke another user's item or link", async () => {
    const itemId = await newItem()
    expect((await newShare(itemId, 3600, cookieB)).res.status).toBe(404)

    const { shareId } = await newShare(itemId)
    expect(listBody.parse(await (await call(shareLinks, `${linksUrl}?itemId=${itemId}`, 'GET', cookieB)).json()).shares).toEqual([])
    expect((await call(shareLink, linkUrl(shareId), 'DELETE', cookieB)).status).toBe(404)
    expect((await call(shareLink, linkUrl(shareId), 'GET', null)).status).toBe(200)
  })

  it('lists live shares for the owner without any ciphertext or key', async () => {
    const itemId = await newItem()
    const first = await newShare(itemId, 7200)
    const second = await newShare(itemId, 3600)
    const res = await call(shareLinks, `${linksUrl}?itemId=${itemId}`, 'GET', cookieA)
    const text = await res.text()
    expect(text).not.toContain('ciphertext')
    expect(text).not.toContain(first.fragment)
    const { shares } = listBody.parse(JSON.parse(text))
    expect(shares.map((s) => s.id)).toEqual([second.shareId, first.shareId])
  })

  it('revokes: the link stops working, the ciphertext is wiped, and a second revoke is a 404', async () => {
    const itemId = await newItem()
    const { shareId } = await newShare(itemId)
    expect((await call(shareLink, linkUrl(shareId), 'DELETE', cookieA)).status).toBe(200)
    expect((await call(shareLink, linkUrl(shareId), 'GET', null)).status).toBe(410)

    const [row] = await db().query('SELECT ciphertext, iv, revoked_at FROM share_links WHERE id = $1', [shareId])
    expect(row?.ciphertext).toBe('')
    expect(row?.iv).toBe('')
    expect(row?.revoked_at).not.toBeNull()

    expect(listBody.parse(await (await call(shareLinks, `${linksUrl}?itemId=${itemId}`, 'GET', cookieA)).json()).shares).toEqual([])
    expect((await call(shareLink, linkUrl(shareId), 'DELETE', cookieA)).status).toBe(404)
  })

  it('stops serving an expired share, and deletes it on the next create', async () => {
    const itemId = await newItem()
    const { shareId } = await newShare(itemId)
    await db().query("UPDATE share_links SET expires_at = now() - interval '1 second' WHERE id = $1", [shareId])
    expect((await call(shareLink, linkUrl(shareId), 'GET', null)).status).toBe(410)
    expect(listBody.parse(await (await call(shareLinks, `${linksUrl}?itemId=${itemId}`, 'GET', cookieA)).json()).shares).toEqual([])

    await newShare(itemId)
    expect(await db().query('SELECT 1 FROM share_links WHERE id = $1', [shareId])).toHaveLength(0)
  })

  it('removes shares when their item is deleted', async () => {
    const itemId = await newItem()
    const { shareId } = await newShare(itemId)
    expect((await call(vaultItem, `http://localhost/api/vault/items/${itemId}`, 'DELETE', cookieA)).status).toBe(200)
    expect((await call(shareLink, linkUrl(shareId), 'GET', null)).status).toBe(410)
  })

  it('caps the number of live shares per user', async () => {
    const itemId = await newItem()
    await db().query(
      `INSERT INTO share_links (item_id, ciphertext, iv, expires_at)
       SELECT $1, 'abc', 'def', now() + interval '1 hour' FROM generate_series(1, 50)`,
      [itemId],
    )
    const { res } = await newShare(itemId)
    expect(res.status).toBe(429)
  })
})
