import { ThemeToggle } from '../../components/ThemeToggle'
import { useIdleLock } from '../auth/useIdleLock'
import { useSession } from '../auth/useSession'

/** Placeholder shell for the unlocked state; the item list and editor arrive in step 8. */
export function VaultHome({ email }: { email: string }) {
  const { lock, logout } = useSession()
  useIdleLock(lock)

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">VaultX</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">{email}</p>
        </div>
        <div className="flex gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={lock}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Lock
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Sign out
          </button>
        </div>
      </header>
      <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-600 dark:border-slate-700 dark:text-slate-400">
        Vault unlocked. Your items will appear here.
      </p>
    </div>
  )
}
