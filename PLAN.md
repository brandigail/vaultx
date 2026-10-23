# VaultX: Build Plan

- [ ] 1. Scaffold the project (stack in `CLAUDE.md`), strict `tsconfig`, lint, `netlify.toml`, `.env.example`; first working commit
- [ ] 2. Neon schema (users, vault_items, share_links) and migration
- [ ] 3. `types/` interfaces and zod schemas
- [ ] 4. Crypto module: key derivation, AES-GCM encrypt/decrypt, with unit tests
- [ ] 5. Account auth functions (register, login, logout) with hashed passwords
- [ ] 6. Unlock screen and in-memory key session with auto-lock
- [ ] 7. Vault CRUD functions storing ciphertext only
- [ ] 8. Vault list/detail UI, search, copy with auto-clear
- [ ] 9. Password generator and strength meter
- [ ] 10. HIBP k-anonymity breach indicator
- [ ] 11. Time-limited share links with expiry and revoke
- [ ] 12. Demo account and seeded encrypted sample items
- [ ] 13. Security review: no plaintext in network tab, logs or storage
- [ ] 14. Quality gate: `npm run build`, lint and `tsc --noEmit` all pass; no console errors; core flow tested at 375px and desktop
- [ ] 15. README: pitch, features, stack, architecture notes, screenshot placeholders, run steps, 3-bullet "what to demo to a recruiter", Phase 2 list
- [ ] 16. Deploy to Netlify, set env vars, verify the public URL end to end
- [ ] 17. Push to GitHub and update the live URL in `README.md` and the root `LINKS.md`
