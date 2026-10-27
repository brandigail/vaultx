import { AuthScreen } from './features/auth/AuthScreen'
import { UnlockScreen } from './features/auth/UnlockScreen'
import { useSession } from './features/auth/useSession'
import { VaultHome } from './features/vault/VaultHome'

export default function App() {
  const { state } = useSession()

  switch (state.status) {
    case 'loading':
      return <p className="grid min-h-dvh place-items-center text-slate-500">Loading…</p>
    case 'signedOut':
      return <AuthScreen />
    case 'locked':
      return <UnlockScreen email={state.user.email} />
    case 'unlocked':
      return <VaultHome email={state.user.email} vaultKey={state.key} />
  }
}
