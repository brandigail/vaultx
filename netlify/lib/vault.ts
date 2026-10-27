import { neon } from '@neondatabase/serverless'
import { vaultItemCipherSchema } from '../../src/types/schemas'
import type { VaultItemCipher } from '../../src/types'
import { databaseUrl } from './env'

export const MAX_ITEMS_PER_USER = 1000

// Format timestamps as ISO-8601 UTC strings in SQL so they match the shared schema.
const COLUMNS = `id, user_id AS "userId", ciphertext, iv,
  to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "updatedAt"`

const sql = () => neon(databaseUrl())

export async function listItems(userId: string): Promise<VaultItemCipher[]> {
  const rows = await sql().query(`SELECT ${COLUMNS} FROM vault_items WHERE user_id = $1 ORDER BY updated_at DESC`, [userId])
  return rows.map((row) => vaultItemCipherSchema.parse(row))
}

export async function countItems(userId: string): Promise<number> {
  const rows = await sql().query('SELECT count(*)::int AS n FROM vault_items WHERE user_id = $1', [userId])
  return Number(rows[0]?.n ?? 0)
}

/** Returns null if the id is already taken (by anyone). */
export async function createItem(userId: string, id: string, ciphertext: string, iv: string): Promise<VaultItemCipher | null> {
  const rows = await sql().query(
    `INSERT INTO vault_items (id, user_id, ciphertext, iv) VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO NOTHING
     RETURNING ${COLUMNS}`,
    [id, userId, ciphertext, iv],
  )
  return rows[0] ? vaultItemCipherSchema.parse(rows[0]) : null
}

/** Returns null if the item does not exist or belongs to someone else. */
export async function updateItem(userId: string, id: string, ciphertext: string, iv: string): Promise<VaultItemCipher | null> {
  const rows = await sql().query(
    `UPDATE vault_items SET ciphertext = $3, iv = $4, updated_at = now()
     WHERE id = $1 AND user_id = $2
     RETURNING ${COLUMNS}`,
    [id, userId, ciphertext, iv],
  )
  return rows[0] ? vaultItemCipherSchema.parse(rows[0]) : null
}

/** Returns false if the item does not exist or belongs to someone else. */
export async function deleteItem(userId: string, id: string): Promise<boolean> {
  const rows = await sql().query('DELETE FROM vault_items WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId])
  return rows.length > 0
}
