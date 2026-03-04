import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../utils/logger';
import { Foreshadow } from '../../data/storage';
import { IForeshadowRepository } from '../interfaces/foreshadowRepository';

class ForeshadowRepository implements IForeshadowRepository {
  private filePath: string | null = null;
  private counter = 1;

  init(dataDir: string): boolean {
    this.filePath = path.join(dataDir, 'foreshadows.json');
    
    const existing = this.loadAll();
    if (existing.length > 0) {
      const maxId = Math.max(...existing.map((f) => {
        const match = f.id.match(/^F(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      }));
      this.counter = maxId + 1;
    }
    
    return true;
  }

  loadAll(): Foreshadow[] {
    if (!this.filePath || !fs.existsSync(this.filePath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      logger.log(`⚠️ 读取伏笔数据失败: ${error}`);
      return [];
    }
  }

  saveAll(foreshadows: Foreshadow[]): boolean {
    if (!this.filePath) {
      logger.log('❌ 伏笔存储未初始化');
      return false;
    }

    try {
      fs.writeFileSync(this.filePath, JSON.stringify(foreshadows, null, 2), 'utf-8');
      logger.log(`💾 保存 ${foreshadows.length} 个伏笔到本地`);
      return true;
    } catch (error) {
      logger.log(`❌ 保存伏笔数据失败: ${error}`);
      return false;
    }
  }

  add(foreshadow: Foreshadow): boolean {
    const all = this.loadAll();
    all.push(foreshadow);
    return this.saveAll(all);
  }

  update(id: string, updates: Partial<Foreshadow>): boolean {
    const all = this.loadAll();
    const index = all.findIndex((f) => f.id === id);
    if (index === -1) {
      logger.log(`⚠️ 未找到伏笔: ${id}`);
      return false;
    }

    all[index] = { ...all[index], ...updates, updatedAt: new Date().toISOString() };
    return this.saveAll(all);
  }

  delete(id: string): boolean {
    const all = this.loadAll();
    const filtered = all.filter((f) => f.id !== id);
    if (filtered.length === all.length) {
      logger.log(`⚠️ 未找到伏笔: ${id}`);
      return false;
    }

    return this.saveAll(filtered);
  }

  findById(id: string): Foreshadow | null {
    const all = this.loadAll();
    return all.find((f) => f.id === id) || null;
  }

  findByStatus(status: 'pending' | 'resolved' | 'abandoned'): Foreshadow[] {
    const all = this.loadAll();
    return all.filter((f) => f.status === status);
  }

  findByChapter(chapterNumber: number): Foreshadow[] {
    const all = this.loadAll();
    return all.filter((f) => f.plantedChapter === chapterNumber);
  }

  generateId(): string {
    const id = `F${String(this.counter).padStart(4, '0')}`;
    this.counter++;
    return id;
  }
}

export const foreshadowRepository = new ForeshadowRepository();
