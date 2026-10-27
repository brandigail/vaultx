import type { ReactNode } from 'react'
import { SessionProvider } from './features/auth/SessionProvider'

export function Providers({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
