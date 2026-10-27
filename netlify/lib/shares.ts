import { neon } from '@neondatabase/serverless'
import { publicShareSchema, shareSummarySchema } from '../../src/types/schemas'
import type { PublicShare, ShareSummary } from '../../src/types'
import { databaseUrl } from './env'

export const MAX_ACTIVE_SHARES_PER_USER = 50

const ISO = `'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'`
const ACTIVE = 'revoked_at IS NULL AND expires_at > now()'

const sql = () => neon(databaseUrl())

export async function countActiveShares(userId: string): Promise<number> {
  const rows = await sql().query(
    `SELECT count(*)::int AS n FROM share_links s JOIN vault_items i ON i.id = s.item_id
     WHERE i.user_id = $1 AND s.revoked_at IS NULL AND s.expires_at > now()`,
    [userId],
  )
  return Number(rows[0]?.n ?? 0)
}

/** Expired and revoked shares are no use to anyone, so their ciphertext is deleted rather than kept. */
async function purgeDead(): Promise<void> {
  await sql().query('DELETE FROM share_links WHERE revoked_at IS NOT NULL OR expires_at <= now()')
}

/**
 * Stores a share for an item the user owns. Returns null if the item is not theirs or the id is taken.
 * The expiry is computed here from the database clock, never taken from the client.
 */
export async function createShare(
  userId: string,
  input: { id: string; itemId: string; ciphertext: string; iv: string; ttlSeconds: number },
): Promise<ShareSummary | null> {
  await purgeDead()
  const rows = await sql().query(
    `INSERT INTO share_links (id, item_id, ciphertext, iv, expires_at)
     SELECT $1::uuid, i.id, $3::text, $4::text, now() + make_interval(secs => $5::double precision)
     FROM vault_items i WHERE i.id = $2::uuid AND i.user_id = $6::uuid
     ON CONFLICT (id) DO NOTHING
     RETURNING id, item_id AS "itemId", to_char(expires_at AT TIME ZONE 'UTC', ${ISO}) AS "expiresAt"`,
    [input.id, input.itemId, input.ciphertext, input.iv, input.ttlSeconds, userId],
  )
  return rows[0] ? shareSummarySchema.parse(rows[0]) : null
}

/** The owner's live shares for one of their items, soonest-expiring first. */
export async function listShares(userId: string, itemId: string): Promise<ShareSummary[]> {
  const rows = await sql().query(
    `SELECT s.id, s.item_id AS "itemId", to_char(s.expires_at AT TIME ZONE 'UTC', ${ISO}) AS "expiresAt"
     FROM share_links s JOIN vault_items i ON i.id = s.item_id
     WHERE s.item_id = $1 AND i.user_id = $2 AND s.revoked_at IS NULL AND s.expires_at > now()
     ORDER BY s.expires_at`,
    [itemId, userId],
  )
  return rows.map((row) => shareSummarySchema.parse(row))
}

/** Revokes a share the user owns and wipes its ciphertext. Returns false if it is not theirs or already gone. */
export async function revokeShare(userId: string, id: string): Promise<boolean> {
  const rows = await sql().query(
    `UPDATE share_links s SET revoked_at = now(), ciphertext = '', iv = ''
     FROM vault_items i
     WHERE s.id = $1 AND s.item_id = i.id AND i.user_id = $2 AND s.revoked_at IS NULL
     RETURNING s.id`,
    [id, userId],
  )
  return rows.length > 0
}

/** What a link holder may fetch: only while the share is neither expired nor revoked. */
export async function findPublicShare(id: string): Promise<PublicShare | null> {
  const rows = await sql().query(
    `SELECT ciphertext, iv, to_char(expires_at AT TIME ZONE 'UTC', ${ISO}) AS "expiresAt"
     FROM share_links WHERE id = $1 AND ${ACTIVE}`,
    [id],
  )
  return rows[0] ? publicShareSchema.parse(rows[0]) : null
}
