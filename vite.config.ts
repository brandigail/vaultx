import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Production-only: Vite's dev server injects inline scripts that a strict CSP would block.
const CSP = [
  "default-src 'self'",
  "connect-src 'self' https://api.pwnedpasswords.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
].join('; ')

const productionCsp = (): Plugin => ({
  name: 'production-csp',
  apply: 'build',
  transformIndexHtml: () => [
    { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
  ],
})

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), productionCsp()],
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts', 'netlify/**/*.test.ts'],
      // Integration tests need the Neon database and JWT secret; they skip themselves when absent.
      env: { DATABASE_URL: env.DATABASE_URL ?? '', JWT_SECRET: env.JWT_SECRET ?? '' },
    },
  }
})
