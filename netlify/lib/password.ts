import { createHash } from 'node:crypto'
import bcrypt from 'bcryptjs'

const COST = 12

// bcrypt silently truncates input at 72 bytes, so pre-hash to a fixed-length string first.
function prehash(password: string): string {
  return createHash('sha256').update(password, 'utf8').digest('base64')
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(prehash(password), COST)
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(prehash(password), hash)
}

// Compared against when the email is unknown so login timing does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', COST)

export function verifyAgainstDummy(password: string): Promise<boolean> {
  return bcrypt.compare(prehash(password), DUMMY_HASH)
}
