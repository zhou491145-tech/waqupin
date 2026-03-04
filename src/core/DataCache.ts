import { logger } from '../utils/logger';

/**
 * 缓存条目接口
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * 数据缓存类
 * 支持事件驱动失效和 TTL 过期
 */
export class DataCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL: number;

  /**
   * @param defaultTTL 默认缓存有效期（毫秒），默认 60 秒
   */
  constructor(defaultTTL: number = 60000) {
    this.defaultTTL = defaultTTL;
  }

  /**
   * 获取缓存数据
   * @param key 缓存键
   * @param loader 数据加载函数（缓存未命中时调用）
   * @param ttl 自定义 TTL（可选）
   * @returns 缓存的数据
   */
  get<T>(key: string, loader: () => T, ttl?: number): T {
    const cached = this.cache.get(key);
    const now = Date.now();

    // 检查缓存是否存在且未过期
    if (cached && (now - cached.timestamp) < cached.ttl) {
      logger.debug(`缓存命中: ${key}`);
      return cached.data as T;
    }

    // 缓存未命中或已过期，重新加载
    logger.debug(`缓存未命中: ${key}，重新加载数据`);
    const data = loader();
    
    this.cache.set(key, {
      data,
      timestamp: now,
      ttl: ttl ?? this.defaultTTL
    });

    return data;
  }

  /**
   * 异步获取缓存数据
   * @param key 缓存键
   * @param loader 异步数据加载函数
   * @param ttl 自定义 TTL（可选）
   * @returns Promise<T>
   */
  async getAsync<T>(key: string, loader: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < cached.ttl) {
      logger.debug(`缓存命中: ${key}`);
      return cached.data as T;
    }

    logger.debug(`缓存未命中: ${key}，重新加载数据`);
    const data = await loader();
    
    this.cache.set(key, {
      data,
      timestamp: now,
      ttl: ttl ?? this.defaultTTL
    });

    return data;
  }

  /**
   * 使指定键的缓存失效（事件驱动）
   * @param key 缓存键
   */
  invalidate(key: string): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
      logger.debug(`缓存已失效: ${key}`);
    }
  }

  /**
   * 使多个键的缓存失效
   * @param keys 缓存键数组
   */
  invalidateMultiple(keys: string[]): void {
    keys.forEach(key => this.invalidate(key));
  }

  /**
   * 使所有匹配模式的缓存失效
   * @param pattern 正则表达式模式
   */
  invalidatePattern(pattern: RegExp): void {
    const keysToInvalidate: string[] = [];
    
    this.cache.forEach((_, key) => {
      if (pattern.test(key)) {
        keysToInvalidate.push(key);
      }
    });

    this.invalidateMultiple(keysToInvalidate);
    logger.debug(`已失效 ${keysToInvalidate.length} 个匹配模式的缓存`);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    const count = this.cache.size;
    this.cache.clear();
    logger.debug(`已清空所有缓存（${count} 项）`);
  }

  /**
   * 清理过期缓存
   */
  cleanExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if ((now - entry.timestamp) >= entry.ttl) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      logger.debug(`已清理 ${keysToDelete.length} 个过期缓存`);
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): { total: number; expired: number } {
    const now = Date.now();
    let expired = 0;

    this.cache.forEach(entry => {
      if ((now - entry.timestamp) >= entry.ttl) {
        expired++;
      }
    });

    return {
      total: this.cache.size,
      expired
    };
  }
}

/**
 * 全局单例缓存实例
 */
export const globalCache = new DataCache(60000); // 默认 60 秒 TTL
