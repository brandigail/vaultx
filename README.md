# VaultX

A zero-knowledge secret manager. Everything is encrypted with AES-256-GCM in the browser before it leaves it, so the server and the database only ever hold ciphertext.

**Live demo:** https://vaultx-546.netlify.app

## What to demo to a recruiter
- Click **Try the demo vault**: a seeded, encrypted vault opens with no sign-up. Lock it, then unlock it with the demo passphrase to see the key being derived in the browser.
- Open the browser's Network tab while adding an item: the request body is only `ciphertext` and `iv`. No title, username or password ever leaves the page.
- Share an item with a time-limited link, open it in a private window, then revoke it and reload. The key lives in the URL fragment, so the server never sees it, and revoking wipes the stored ciphertext.

## Features
- Account sign-up and login (password hashed on the server) plus a separate master passphrase that never leaves the browser.
- Vault items of three kinds (login, note, API key) with search, copy-to-clipboard that clears itself, and auto-lock after idle time.
- Password generator and entropy-based strength meter.
- Opt-in breach check using the HaveIBeenPwned k-anonymity range API: only the first 5 characters of the SHA-1 hash are sent.
- Time-limited share links with expiry and revoke.
- Dark and light theme, responsive from 375px up.

### Phase 2
- TOTP two-factor login
- WebAuthn passkey login
- Encrypted JSON import and export

## Stack
React, Vite, TypeScript (strict), Tailwind CSS, Web Crypto API (PBKDF2 + AES-GCM), zod, Netlify Functions, Neon Postgres, Vitest.

## Architecture notes
- `src/crypto/`: key derivation (PBKDF2, non-extractable AES-256-GCM key), encrypt and decrypt with a fresh random IV each time, and share-link keys. Covered by unit tests: round trip, wrong key fails, tampering is detected.
- The derived key is held in memory only (never in localStorage) and is dropped on lock.
- `netlify/functions/`: auth, vault and share endpoints. They validate input with zod and store only ciphertext, IV and salt in Neon.
- A key-check value (a known marker encrypted with the derived key) lets the app reject a wrong passphrase without the server ever seeing it.
- Share links put the key in the URL fragment, which browsers never send to a server. Expired and revoked shares have their ciphertext deleted.
- The only thing stored in localStorage is the theme choice.

## Run locally
```bash
npm install
cp .env.example .env.local   # set DATABASE_URL (Neon) and JWT_SECRET (32+ random characters)
npm run db:migrate
npx netlify dev              # app and functions on http://localhost:8903
```
Checks: `npm run typecheck`, `npm run lint`, `npm test` (90 tests), `npm run build`.

## Screenshots
Placeholders: `docs/screenshots/` (to be added).

## Status
Built and tested locally. Deploy pending.
