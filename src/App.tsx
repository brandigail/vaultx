import { AuthScreen } from './features/auth/AuthScreen'
import { UnlockScreen } from './features/auth/UnlockScreen'
import { useSession } from './features/auth/useSession'
import { SharedItemPage } from './features/share/SharedItemPage'
import { shareIdFromPath } from './features/share/sharePath'
import { VaultHome } from './features/vault/VaultHome'

function Vault() {
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

export default function App() {
  // A share link is public: it needs no account, only the id in the path and the key in the fragment.
  const shareId = shareIdFromPath(window.location.pathname)
  return shareId ? <SharedItemPage id={shareId} /> : <Vault />
}
