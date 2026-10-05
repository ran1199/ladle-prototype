// A small wrapper around the browser's localStorage. If storage is blocked
// (private browsing, strict settings), it quietly keeps data in memory instead,
// so the app still works until the tab is closed.

const memory = new Map<string, string>();
let cached: Storage | null | undefined;

function browserStorage(): Storage | null {
  if (cached !== undefined) return cached;
  try {
    const s = window.localStorage;
    const probe = "__ladle_probe__";
    s.setItem(probe, "1");
    s.removeItem(probe);
    cached = s;
  } catch {
    cached = null;
  }
  return cached;
}

export const storage = {
  get<T>(key: string): T | null {
    let raw: string | null | undefined;
    try {
      raw = browserStorage()?.getItem(key);
    } catch {
      raw = undefined;
    }
    if (raw == null) raw = memory.get(key) ?? null;
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  set(key: string, value: unknown): void {
    const raw = JSON.stringify(value);
    memory.set(key, raw);
    try {
      browserStorage()?.setItem(key, raw);
    } catch {
      // Storage full or blocked: the in-memory copy still works for this visit.
    }
  },

  remove(key: string): void {
    memory.delete(key);
    try {
      browserStorage()?.removeItem(key);
    } catch {
      // Ignore: nothing else to clean up.
    }
  },

  /** True when data only lives in memory (it will be lost when the tab closes). */
  isMemoryOnly(): boolean {
    return browserStorage() === null;
  },
};
