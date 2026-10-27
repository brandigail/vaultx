import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss()],
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts', 'netlify/**/*.test.ts'],
      // Integration tests need the Neon database and JWT secret; they skip themselves when absent.
      env: { DATABASE_URL: env.DATABASE_URL ?? '', JWT_SECRET: env.JWT_SECRET ?? '' },
    },
  }
})
