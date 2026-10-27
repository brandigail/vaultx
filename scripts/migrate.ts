import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { neon } from '@neondatabase/serverless'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set (add it to .env.local)')

const sql = neon(url)
const dir = join(import.meta.dirname, '..', 'db', 'migrations')

await sql.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())')
const applied = new Set((await sql.query('SELECT name FROM schema_migrations')).map((r) => String(r.name)))

for (const file of (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()) {
  if (applied.has(file)) continue
  const statements = (await readFile(join(dir, file), 'utf8'))
    .split(';')
    .map((s) => s.replace(/^\s*--.*$/gm, '').trim())
    .filter(Boolean)
  await sql.transaction([
    ...statements.map((s) => sql.query(s)),
    sql.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]),
  ])
  console.log(`applied ${file}`)
}
console.log('migrations up to date')
