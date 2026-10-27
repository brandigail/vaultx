const SHARE_PATH = /^\/s\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i

/** The share id if the path is a share link (`/s/<id>`), otherwise null. */
export function shareIdFromPath(pathname: string): string | null {
  return SHARE_PATH.exec(pathname)?.[1] ?? null
}
