import { code } from "ts-poet";

// String.raw keeps the regex escapes ("\\", "\0", "\/") byte-for-byte instead of requiring them
// to be hand-doubled to survive this file's own template literal.
const raw = String.raw`
/** Normalize folder id to a prefix ending with "/" (empty = bucket root). */
export function normalizeFolderPrefix(folderId: string): string {
  const t = folderId.trim();
  if (!t) return "";
  return t.endsWith("/") ? t : t + "/";
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

/** Prefix of the parent folder for a given folder id, or undefined at the root. */
export function parentPrefixOf(folderId: string): string | undefined {
  const trimmed = folderId.replace(/\/$/, "");
  const idx = trimmed.lastIndexOf("/");
  if (idx === -1) return undefined;
  return trimmed.slice(0, idx + 1);
}

/** Derives the set of folder prefixes implied by a flat list of object keys. */
export function collectFolderPrefixesFromKeys(keys: string[]): Set<string> {
  const folderSet = new Set<string>();
  for (const key of keys) {
    const parts = key.split("/").filter(Boolean);
    if (parts.length === 0) continue;
    for (let i = 0; i < parts.length - 1; i++) {
      folderSet.add(parts.slice(0, i + 1).join("/") + "/");
    }
  }
  return folderSet;
}

export function folderRecordsFromPrefixes(prefixes: Set<string>): Storage.FolderRecord[] {
  return Array.from(prefixes).map((id) => {
    const nameWithoutSlash = id.replace(/\/$/, "");
    const name = nameWithoutSlash.includes("/") ? nameWithoutSlash.split("/").pop()! : nameWithoutSlash;
    const p = parentPrefixOf(id);
    return { id, name, parents: p ? [p] : [] };
  });
}
`;

export const writeStoragePaths = () => code`${raw}`;

export default writeStoragePaths;
