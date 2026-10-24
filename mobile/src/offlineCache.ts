import * as FileSystem from 'expo-file-system/legacy';

export type ResourceCacheEntry = { data: unknown; savedAt: number };
export type PageCacheEntry = {
  items: unknown[];
  page: number;
  totalPages: number;
  total: number;
  savedAt: number;
};

type CacheSnapshot = {
  version: 1;
  resources: [string, ResourceCacheEntry][];
  pages: [string, PageCacheEntry][];
};

export const MAX_CACHE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

const MAX_CACHE_ENTRIES = 24;
const CACHE_FILE = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}otitech-public-cache-v1.json`
  : null;

let writeQueue: Promise<void> = Promise.resolve();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidSavedAt(value: unknown, now: number): value is number {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value > 0
    && value <= now
    && now - value <= MAX_CACHE_RETENTION_MS;
}

function parseResourceEntry(value: unknown, now: number): ResourceCacheEntry | null {
  if (!isRecord(value) || !('data' in value) || !isValidSavedAt(value.savedAt, now)) return null;
  return { data: value.data, savedAt: value.savedAt };
}

function parsePageEntry(value: unknown, now: number): PageCacheEntry | null {
  if (!isRecord(value)
    || !Array.isArray(value.items)
    || typeof value.page !== 'number'
    || typeof value.totalPages !== 'number'
    || typeof value.total !== 'number'
    || !isValidSavedAt(value.savedAt, now)) return null;
  return {
    items: value.items,
    page: value.page,
    totalPages: value.totalPages,
    total: value.total,
    savedAt: value.savedAt,
  };
}

function parseEntries<T>(
  value: unknown,
  parseEntry: (entry: unknown, now: number) => T | null,
  now: number,
): [string, T & { savedAt: number }][] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is unknown[] => Array.isArray(item) && item.length === 2 && typeof item[0] === 'string')
    .map(([key, entry]) => {
      const parsed = parseEntry(entry, now);
      return parsed ? [key as string, parsed as T & { savedAt: number }] : null;
    })
    .filter((entry): entry is [string, T & { savedAt: number }] => entry !== null)
    .sort((a, b) => a[1].savedAt - b[1].savedAt)
    .slice(-MAX_CACHE_ENTRIES);
}

export async function hydratePublicCache(
  resources: Map<string, ResourceCacheEntry>,
  pages: Map<string, PageCacheEntry>,
) {
  if (!CACHE_FILE) return;
  try {
    const info = await FileSystem.getInfoAsync(CACHE_FILE);
    if (!info.exists) return;
    const snapshot = JSON.parse(await FileSystem.readAsStringAsync(CACHE_FILE)) as unknown;
    if (!isRecord(snapshot) || snapshot.version !== 1) return;
    const now = Date.now();
    for (const [key, entry] of parseEntries(snapshot.resources, parseResourceEntry, now)) resources.set(key, entry);
    for (const [key, entry] of parseEntries(snapshot.pages, parsePageEntry, now)) pages.set(key, entry);
  } catch {
    // A damaged or unavailable local cache must never stop the app from opening.
  }
}

export function persistPublicCache(
  resources: Map<string, ResourceCacheEntry>,
  pages: Map<string, PageCacheEntry>,
) {
  if (!CACHE_FILE) return;
  const snapshot: CacheSnapshot = {
    version: 1,
    resources: [...resources.entries()].slice(-MAX_CACHE_ENTRIES),
    pages: [...pages.entries()].slice(-MAX_CACHE_ENTRIES),
  };
  const contents = JSON.stringify(snapshot);
  const temporaryFile = `${CACHE_FILE}.tmp`;

  writeQueue = writeQueue
    .catch(() => undefined)
    .then(async () => {
      try {
        await FileSystem.writeAsStringAsync(temporaryFile, contents);
        if ((await FileSystem.getInfoAsync(CACHE_FILE)).exists) {
          await FileSystem.deleteAsync(CACHE_FILE, { idempotent: true });
        }
        await FileSystem.moveAsync({ from: temporaryFile, to: CACHE_FILE });
      } catch {
        try {
          await FileSystem.deleteAsync(temporaryFile, { idempotent: true });
        } catch {
          // Persistence is best effort; the in-memory cache remains available.
        }
      }
    });
}
