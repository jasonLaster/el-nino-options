/**
 * Tiny HTTP wrapper: rate-limited fetch with SQLite caching, retries on 429/5xx.
 */

import { getCached, putCached } from "./cache.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

let nextAvailable = 0;
const MIN_INTERVAL_MS = 250;

async function rateLimit(): Promise<void> {
  const now = Date.now();
  if (now < nextAvailable) {
    await Bun.sleep(nextAvailable - now);
  }
  nextAvailable = Date.now() + MIN_INTERVAL_MS;
}

export interface FetchOptions {
  ttlMs?: number;
  noCache?: boolean;
  attempts?: number;
}

export async function fetchJson<T = unknown>(
  url: string,
  opts: FetchOptions = {}
): Promise<T> {
  const ttl = opts.ttlMs ?? DAY_MS;
  const attempts = opts.attempts ?? 5;

  if (!opts.noCache) {
    const cached = getCached(url);
    if (cached) return JSON.parse(cached.body) as T;
  }

  let lastErr: unknown;
  for (let i = 1; i <= attempts; i++) {
    await rateLimit();
    try {
      const res = await fetch(url);
      const text = await res.text();
      if (res.ok) {
        putCached(url, text, res.status, ttl);
        return JSON.parse(text) as T;
      }
      if (res.status === 429 || res.status >= 500) {
        const delay = Math.min(8000, 500 * 2 ** (i - 1)) + Math.random() * 300;
        console.warn(`  retry ${i}/${attempts} on ${res.status} for ${url.slice(0, 80)}…`);
        await Bun.sleep(delay);
        continue;
      }
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    } catch (err) {
      lastErr = err;
      if (i === attempts) throw err;
      await Bun.sleep(500 * i);
    }
  }
  throw lastErr;
}
