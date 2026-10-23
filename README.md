# VaultX

Zero-knowledge secret manager: everything is AES-256 encrypted in the browser before it ever leaves it.

## Planned features
- Account signup/login (hashed password) plus a separate master passphrase; derive an AES-256-GCM key client-side and encrypt/decrypt vault items in the browser; server stores only ciphertext, IV and salt.
- Vault UI: add/edit/delete items (login, note, API key), search, copy-to-clipboard with auto-clear, auto-lock after idle.
- Password generator and strength meter (entropy-based) with offline breach hints (k-anonymity check against HaveIBeenPwned range API, sending only the first 5 SHA-1 hex chars).

### Phase 2
- Share a secret via a time-limited link (key in URL fragment, expiry + revoke)
- TOTP 2FA for account login
- WebAuthn passkey login
- Import/export encrypted JSON

## Stack
React, Vite, TypeScript strict, Tailwind CSS, Web Crypto API (PBKDF2/Argon2-wasm + AES-GCM), Netlify Functions, Neon Postgres (ciphertext only), Better Auth or custom JWT for account login, Netlify

## Live demo
Live demo: TBD

## Run locally
Run locally: TBD

## Status
Not started
