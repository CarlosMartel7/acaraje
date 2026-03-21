/** Normalize folder id to a prefix ending with `/` (empty = bucket root). */
export function normalizeFolderPrefix(folderId: string): string {
  const t = folderId.trim();
  if (!t) return "";
  return t.endsWith("/") ? t : `${t}/`;
}

/** Prevent path injection in object keys; keeps most filename characters. */
export function sanitizeObjectName(name: string): string {
  const s = name.replace(/[/\\]/g, "_").replace(/\0/g, "");
  return s.trim() || "file";
}

export function sanitizeFolderSegment(name: string): string {
  const s = name.replace(/[/\\]/g, "_").replace(/\0/g, "").trim();
  return s || "folder";
}
