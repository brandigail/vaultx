export const CLIPBOARD_CLEAR_MS = 30_000

let timer: number | undefined
let copied: string | null = null

/**
 * Copies `text`, then empties the clipboard after `ms` if it still holds that text.
 * If the browser will not let us read the clipboard to check, we clear it anyway:
 * leaving a secret behind is the worse outcome.
 */
export async function copyWithAutoClear(text: string, ms: number = CLIPBOARD_CLEAR_MS): Promise<void> {
  await navigator.clipboard.writeText(text)
  window.clearTimeout(timer)
  copied = text
  timer = window.setTimeout(() => void clearClipboard(), ms)
}

/** Clears the clipboard now if we put something there. Also called when the vault locks. */
export async function clearClipboard(): Promise<void> {
  window.clearTimeout(timer)
  const mine = copied
  copied = null
  if (mine === null) return
  try {
    if ((await navigator.clipboard.readText()) !== mine) return
  } catch {
    // Reading is not permitted here; fall through and clear.
  }
  try {
    await navigator.clipboard.writeText('')
  } catch {
    // Nothing more we can do if the browser refuses.
  }
}
