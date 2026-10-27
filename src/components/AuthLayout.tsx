import type { ReactNode } from 'react'
import { ThemeToggle } from './ThemeToggle'

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        <header className="space-y-1 text-center">
          <p className="text-sm font-semibold tracking-wide text-sky-600 dark:text-sky-400">VaultX</p>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>
        </header>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
          {children}
        </div>
      </div>
      <ThemeToggle />
    </main>
  )
}
