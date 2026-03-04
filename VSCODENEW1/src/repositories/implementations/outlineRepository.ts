import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../utils/logger';
import { Outline } from '../../data/storage';
import { IOutlineRepository } from '../interfaces/outlineRepository';

class OutlineRepository implements IOutlineRepository {
  private filePath: string | null = null;
  private counter = 1;

  init(dataDir: string): boolean {
    this.filePath = path.join(dataDir, 'outlines.json');
    
    const existing = this.loadAll();
    if (existing.length > 0) {
      const maxId = Math.max(...existing.map((o) => {
        const match = o.id.match(/^OUT(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      }));
      this.counter = maxId + 1;
    }
    
    return true;
  }

  loadAll(): Outline[] {
    if (!this.filePath || !fs.existsSync(this.filePath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      logger.log(`⚠️ 读取大纲数据失败: ${error}`);
      return [];
    }
  }

  saveAll(outlines: Outline[]): boolean {
    if (!this.filePath) {
      logger.log('❌ 大纲存储未初始化');
      return false;
    }

    try {
      fs.writeFileSync(this.filePath, JSON.stringify(outlines, null, 2), 'utf-8');
      logger.log(`💾 保存 ${outlines.length} 个大纲条目到本地`);
      return true;
    } catch (error) {
      logger.log(`❌ 保存大纲数据失败: ${error}`);
      return false;
    }
  }

  add(outline: Outline): boolean {
    const all = this.loadAll();
    all.push(outline);
    all.sort((a, b) => a.orderIndex - b.orderIndex);
    return this.saveAll(all);
  }

  update(id: string, updates: Partial<Outline>): boolean {
    const all = this.loadAll();
    const index = all.findIndex((o) => o.id === id);
    if (index === -1) {
      logger.log(`⚠️ 未找到大纲: ${id}`);
      return false;
    }

    all[index] = { ...all[index], ...updates };
    return this.saveAll(all);
  }

  delete(id: string): boolean {
    const all = this.loadAll();
    const filtered = all.filter((o) => o.id !== id);
    if (filtered.length === all.length) {
      logger.log(`⚠️ 未找到大纲: ${id}`);
      return false;
    }

    return this.saveAll(filtered);
  }

  findById(id: string): Outline | null {
    const all = this.loadAll();
    return all.find((o) => o.id === id) || null;
  }

  findByChapter(chapterNumber: number): Outline[] {
    const all = this.loadAll();
    return all.filter((o) => o.chapterNumber === chapterNumber);
  }

  findByType(type: 'volume' | 'chapter' | 'scene'): Outline[] {
    const all = this.loadAll();
    return all.filter((o) => o.type === type);
  }

  generateId(): string {
    const id = `OUT${String(this.counter).padStart(4, '0')}`;
    this.counter++;
    return id;
  }
}

export const outlineRepository = new OutlineRepository();
