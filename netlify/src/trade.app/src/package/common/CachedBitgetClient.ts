import { RestClientV2 } from "bitget-api";

// Définir d'abord l'interface CacheEntry
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class CachedBitgetClient {
  private client: RestClientV2;
  private cache: Map<string, CacheEntry<unknown>>;
  private cacheDuration: number;

  constructor(client: RestClientV2, cacheDurationMs: number = 5000) {
    this.client = client;
    this.cache = new Map();
    this.cacheDuration = cacheDurationMs;
  }

  private getCacheKey(method: string, params: Record<string, unknown>): string {
    return `${method}-${JSON.stringify(params)}`;
  }

  private isCacheValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < this.cacheDuration;
  }

  async request<T>(method: keyof RestClientV2, params: Record<string, unknown> = {}): Promise<T> {
    const cacheKey = this.getCacheKey(method as string, params);
    const cachedData = this.cache.get(cacheKey) as CacheEntry<T> | undefined;

    if (cachedData && this.isCacheValid(cachedData)) {
      console.log(`Cache hit for ${cacheKey}`);
      return cachedData.data;
    }

    const methodFn = this.client[method] as (params: Record<string, unknown>) => Promise<T>;
    const response = await methodFn.call(this.client, params);

    this.cache.set(cacheKey, {
      data: response,
      timestamp: Date.now(),
    });

    return response;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
