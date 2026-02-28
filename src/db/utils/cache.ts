/**
 * 缓存工具
 * 提供查询结果缓存功能
 */

import { CacheEntry } from '../../types/database';

/**
 * 查询缓存类
 */
export class QueryCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly ttl: number; // 毫秒

  constructor(ttlMinutes: number = 5) {
    this.ttl = ttlMinutes * 60 * 1000;
  }

  /**
   * 设置缓存
   */
  set(key: string, value: any): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  /**
   * 获取缓存
   */
  get(key: string): any | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // 检查是否过期
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * 检查缓存是否存在
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // 检查是否过期
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 删除缓存
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 清理过期缓存
   */
  cleanup(): number {
    let cleanedCount = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }
}

/**
 * 全局查询缓存实例
 */
export const queryCache = new QueryCache(5); // 5 分钟 TTL

/**
 * 生成缓存键
 */
export function generateCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${JSON.stringify(params[key])}`)
    .join('&');

  return `${prefix}:${sortedParams}`;
}

/**
 * 获取或设置缓存
 */
export async function getOrSetCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMinutes?: number
): Promise<T> {
  const cache = ttlMinutes ? new QueryCache(ttlMinutes) : queryCache;

  // 检查缓存
  if (cache.has(key)) {
    return cache.get(key);
  }

  // 获取数据
  const data = await fetcher();

  // 设置缓存
  cache.set(key, data);

  return data;
}

/**
 * 清理所有过期缓存
 */
export function cleanupAllCaches(): number {
  return queryCache.cleanup();
}
