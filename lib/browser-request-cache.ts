type CacheEntry<T> = {
  expiresAt: number;
  promise: Promise<T>;
};

const browserRequestCache = new Map<string, CacheEntry<unknown>>();

export async function cachedBrowserRequest<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
  force = false,
): Promise<T> {
  if (typeof window === "undefined" || force) {
    return loader();
  }

  const cached = browserRequestCache.get(key) as CacheEntry<T> | undefined;
  if (cached && cached.expiresAt > Date.now()) {
    return cached.promise;
  }

  const promise = loader().catch((error) => {
    browserRequestCache.delete(key);
    throw error;
  });

  browserRequestCache.set(key, {
    expiresAt: Date.now() + ttlMs,
    promise,
  });

  return promise;
}

export function clearBrowserRequestCache(prefix?: string) {
  if (!prefix) {
    browserRequestCache.clear();
    return;
  }

  for (const key of browserRequestCache.keys()) {
    if (key.startsWith(prefix)) {
      browserRequestCache.delete(key);
    }
  }
}
