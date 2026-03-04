import * as path from 'path';
import { IRepository } from './IRepository';
import { JsonFileLoader } from './JsonFileLoader';
import { globalCache } from './DataCache';
import { logger } from '../utils/logger';

/**
 * 基础仓库抽象类
 * 实现 IRepository 接口的通用逻辑
 */
export abstract class BaseRepository<T extends { id: string }> implements IRepository<T> {
  protected filePath: string = '';
  protected loader: JsonFileLoader<T[]>;
  protected fileName: string;
  protected cacheKey: string;

  constructor(fileName: string) {
    this.fileName = fileName;
    this.cacheKey = `repo:${fileName}`;
    this.loader = new JsonFileLoader<T[]>();
  }

  init(dataDir: string): void {
    this.filePath = path.join(dataDir, this.fileName);
    logger.debug(`初始化仓库: ${this.fileName} -> ${this.filePath}`);
  }

  getFilePath(): string {
    return this.filePath;
  }

  loadAll(): T[] {
    return globalCache.get(this.cacheKey, () => {
      return this.loader.load(this.filePath, []);
    });
  }

  saveAll(items: T[]): boolean {
    const success = this.loader.save(this.filePath, items);
    if (success) {
      // 保存成功后失效缓存
      globalCache.invalidate(this.cacheKey);
    }
    return success;
  }

  findById(id: string): T | undefined {
    const items = this.loadAll();
    return items.find(item => item.id === id);
  }

  add(item: T): boolean {
    const items = this.loadAll();
    
    // 检查 ID 是否已存在
    if (items.some(existing => existing.id === item.id)) {
      logger.warn(`添加失败: ID 已存在 (${item.id})`);
      return false;
    }

    items.push(item);
    return this.saveAll(items);
  }

  update(id: string, updates: Partial<T>): boolean {
    const items = this.loadAll();
    const index = items.findIndex(item => item.id === id);

    if (index === -1) {
      logger.warn(`更新失败: ID 不存在 (${id})`);
      return false;
    }

    items[index] = { ...items[index], ...updates };
    return this.saveAll(items);
  }

  delete(id: string): boolean {
    const items = this.loadAll();
    const filtered = items.filter(item => item.id !== id);

    if (filtered.length === items.length) {
      logger.warn(`删除失败: ID 不存在 (${id})`);
      return false;
    }

    return this.saveAll(filtered);
  }

  /**
   * 批量添加
   * @param newItems 要添加的数据数组
   * @returns 成功添加的数量
   */
  addMultiple(newItems: T[]): number {
    const items = this.loadAll();
    const existingIds = new Set(items.map(item => item.id));
    
    const toAdd = newItems.filter(item => !existingIds.has(item.id));
    
    if (toAdd.length === 0) {
      return 0;
    }

    items.push(...toAdd);
    return this.saveAll(items) ? toAdd.length : 0;
  }

  /**
   * 批量删除
   * @param ids 要删除的 ID 数组
   * @returns 成功删除的数量
   */
  deleteMultiple(ids: string[]): number {
    const items = this.loadAll();
    const idsSet = new Set(ids);
    const originalCount = items.length;
    
    const filtered = items.filter(item => !idsSet.has(item.id));
    const deletedCount = originalCount - filtered.length;

    if (deletedCount === 0) {
      return 0;
    }

    return this.saveAll(filtered) ? deletedCount : 0;
  }

  /**
   * 清空所有数据
   * @returns 是否成功
   */
  clear(): boolean {
    return this.saveAll([]);
  }

  /**
   * 获取数据数量
   * @returns 数据数量
   */
  count(): number {
    return this.loadAll().length;
  }
}
