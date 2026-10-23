# VaultX: Zero-Knowledge Secret Manager

Read the portfolio-root `CLAUDE.md` first for global rules. This file is the brief for this project.

## What it is
A password and secret manager where the server only ever stores ciphertext. A master passphrase derives the key in the browser (Web Crypto), so even the database owner cannot read secrets. Includes a generator, strength meter and time-limited sharing.

## Stack
React, Vite, TypeScript strict, Tailwind CSS, Web Crypto API (PBKDF2/Argon2-wasm + AES-GCM), Netlify Functions, Neon Postgres (ciphertext only), Better Auth or custom JWT for account login. Hosted on Netlify. No Supabase. No Supabase, no Vercel, no Gemini/OpenAI.

## MVP (build first)
1. Account signup/login (hashed password) plus a separate master passphrase; derive an AES-256-GCM key client-side and encrypt/decrypt vault items in the browser; server stores only ciphertext, IV and salt.
2. Vault UI: add/edit/delete items (login, note, API key), search, copy-to-clipboard with auto-clear, auto-lock after idle.
3. Password generator and strength meter (entropy-based) with offline breach hints (k-anonymity check against HaveIBeenPwned range API, sending only the first 5 SHA-1 hex chars).

## Phase 2
Share a secret via a time-limited link (key in URL fragment, expiry + revoke), TOTP 2FA for account login, WebAuthn passkey login, Import/export encrypted JSON.

## Data model (put in `types/`)
```ts
export interface User { id: string; email: string; passwordHash: string; kdfSalt: string; createdAt: string }
export interface VaultItemCipher { id: string; userId: string; ciphertext: string; iv: string; updatedAt: string }
export interface VaultItemPlain { title: string; kind: 'LOGIN' | 'NOTE' | 'API_KEY'; username?: string; secret: string; url?: string; notes?: string }
export interface ShareLink { id: string; itemId: string; ciphertext: string; iv: string; expiresAt: string; revokedAt: string | null }
```

## Rules specific to this project
- Plaintext and the derived key never leave the browser and are never logged or sent to functions.
- Keep the key in memory only (not localStorage); clear it on lock.
- Use a unique random IV per encryption; authenticated mode (AES-GCM) only.
- Write unit tests for the crypto module (round trip, wrong key fails, tamper detection).
- The HIBP check must use the k-anonymity range endpoint only; never send full hashes or passwords.
- Seed realistic demo data so the app looks alive on first load without sign-up.

## Start here
1. Ask me for the Neon `DATABASE_URL` and generate `JWT_SECRET`.
2. Scaffold Vite + Tailwind + Netlify Functions, commit.
3. Build and test `crypto/` module first (step 4 in `PLAN.md`) before any UI.
