import { neon } from '@neondatabase/serverless'
import { z } from 'zod'
import type { SessionUser, User } from '../../src/types'
import { databaseUrl } from './env'

const rowSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  password_hash: z.string(),
  kdf_salt: z.string(),
})

type UserAuthRow = Pick<User, 'id' | 'email' | 'passwordHash' | 'kdfSalt'>

function toAuthRow(row: unknown): UserAuthRow {
  const r = rowSchema.parse(row)
  return { id: r.id, email: r.email, passwordHash: r.password_hash, kdfSalt: r.kdf_salt }
}

export function toSessionUser(user: UserAuthRow): SessionUser {
  return { id: user.id, email: user.email, kdfSalt: user.kdfSalt }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Returns null if the email is already registered. */
export async function createUser(email: string, passwordHash: string, kdfSalt: string): Promise<UserAuthRow | null> {
  const sql = neon(databaseUrl())
  const rows = await sql.query(
    `INSERT INTO users (email, password_hash, kdf_salt) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING
     RETURNING id, email, password_hash, kdf_salt`,
    [email, passwordHash, kdfSalt],
  )
  return rows[0] ? toAuthRow(rows[0]) : null
}

export async function findUserByEmail(email: string): Promise<UserAuthRow | null> {
  const sql = neon(databaseUrl())
  const rows = await sql.query('SELECT id, email, password_hash, kdf_salt FROM users WHERE email = $1', [email])
  return rows[0] ? toAuthRow(rows[0]) : null
}

export async function findUserById(id: string): Promise<UserAuthRow | null> {
  const sql = neon(databaseUrl())
  const rows = await sql.query('SELECT id, email, password_hash, kdf_salt FROM users WHERE id = $1', [id])
  return rows[0] ? toAuthRow(rows[0]) : null
}
