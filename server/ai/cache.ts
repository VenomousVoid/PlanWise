import crypto from 'crypto';
import { CONFIG } from '../config.ts';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class AiRequestCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private maxEntries: number;
  private defaultTtlMs: number;

  constructor(maxEntries = CONFIG.CACHE_MAX_ENTRIES, defaultTtlMs = CONFIG.CACHE_TTL_MS) {
    this.maxEntries = maxEntries;
    this.defaultTtlMs = defaultTtlMs;
  }

  generateKey(prefix: string, payload: unknown): string {
    const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const hash = crypto.createHash('sha256').update(raw).digest('hex').substring(0, 16);
    return `${prefix}:${hash}`;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Refresh access (LRU order)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set<T>(key: string, value: T, ttlMs = this.defaultTtlMs): void {
    if (this.cache.size >= this.maxEntries) {
      // Evict oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

export const aiCache = new AiRequestCache();
