import 'server-only';

/**
 * A small per-instance cache with a time to live and a size cap (oldest entry evicted first). Serverless instances
 * each keep their own: it only saves repeated JSYNQ reads within a short window, it is never a source of truth.
 */
export class TtlCache<T> {
  private readonly entries = new Map<string, { value: T; until: number }>();
  constructor(
    private readonly ttlMs: number,
    private readonly max = 1000
  ) {}

  get(key: string): T | undefined {
    const hit = this.entries.get(key);
    if (!hit) return undefined;
    if (hit.until <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key: string, value: T): void {
    if (this.entries.size >= this.max && !this.entries.has(key)) this.entries.delete(this.entries.keys().next().value as string);
    this.entries.set(key, { value, until: Date.now() + this.ttlMs });
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  /** The cached value, or `load()` stored for next time. A failed load is not cached. */
  async getOrLoad(key: string, load: () => Promise<T>): Promise<T> {
    const hit = this.get(key);
    if (hit !== undefined) return hit;
    const value = await load();
    this.set(key, value);
    return value;
  }
}
