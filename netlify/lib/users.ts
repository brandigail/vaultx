import { neon } from '@neondatabase/serverless'
import { z } from 'zod'
import type { KeyCheck, SessionUser, User } from '../../src/types'
import { databaseUrl } from './env'

const rowSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  password_hash: z.string(),
  kdf_salt: z.string(),
  key_check_ciphertext: z.string(),
  key_check_iv: z.string(),
})

type UserAuthRow = Pick<User, 'id' | 'email' | 'passwordHash' | 'kdfSalt' | 'keyCheck'>

const COLUMNS = 'id, email, password_hash, kdf_salt, key_check_ciphertext, key_check_iv'

function toAuthRow(row: unknown): UserAuthRow {
  const r = rowSchema.parse(row)
  return {
    id: r.id,
    email: r.email,
    passwordHash: r.password_hash,
    kdfSalt: r.kdf_salt,
    keyCheck: { ciphertext: r.key_check_ciphertext, iv: r.key_check_iv },
  }
}

export function toSessionUser(user: UserAuthRow): SessionUser {
  return { id: user.id, email: user.email, kdfSalt: user.kdfSalt, keyCheck: user.keyCheck }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Returns null if the email is already registered. */
export async function createUser(
  email: string,
  passwordHash: string,
  kdfSalt: string,
  keyCheck: KeyCheck,
): Promise<UserAuthRow | null> {
  const sql = neon(databaseUrl())
  const rows = await sql.query(
    `INSERT INTO users (email, password_hash, kdf_salt, key_check_ciphertext, key_check_iv)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO NOTHING
     RETURNING ${COLUMNS}`,
    [email, passwordHash, kdfSalt, keyCheck.ciphertext, keyCheck.iv],
  )
  return rows[0] ? toAuthRow(rows[0]) : null
}

export async function findUserByEmail(email: string): Promise<UserAuthRow | null> {
  const sql = neon(databaseUrl())
  const rows = await sql.query(`SELECT ${COLUMNS} FROM users WHERE email = $1`, [email])
  return rows[0] ? toAuthRow(rows[0]) : null
}

export async function findUserById(id: string): Promise<UserAuthRow | null> {
  const sql = neon(databaseUrl())
  const rows = await sql.query(`SELECT ${COLUMNS} FROM users WHERE id = $1`, [id])
  return rows[0] ? toAuthRow(rows[0]) : null
}
