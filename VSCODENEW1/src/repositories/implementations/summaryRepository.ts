import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../utils/logger';
import { ChapterSummary } from '../../data/storage';
import { ISummaryRepository } from '../interfaces/summaryRepository';

class SummaryRepository implements ISummaryRepository {
  private filePath: string | null = null;
  private counter = 1;

  init(dataDir: string): boolean {
    this.filePath = path.join(dataDir, 'summaries.json');
    
    const existing = this.loadAll();
    if (existing.length > 0) {
      const maxId = Math.max(...existing.map((s) => {
        const match = s.id.match(/^SUM(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      }));
      this.counter = maxId + 1;
    }
    
    return true;
  }

  loadAll(): ChapterSummary[] {
    if (!this.filePath || !fs.existsSync(this.filePath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      logger.log(`⚠️ 读取章节摘要失败: ${error}`);
      return [];
    }
  }

  saveAll(summaries: ChapterSummary[]): boolean {
    if (!this.filePath) {
      logger.log('❌ 章节摘要存储未初始化');
      return false;
    }

    try {
      fs.writeFileSync(this.filePath, JSON.stringify(summaries, null, 2), 'utf-8');
      logger.log(`💾 保存 ${summaries.length} 个章节摘要到本地`);
      return true;
    } catch (error) {
      logger.log(`❌ 保存章节摘要失败: ${error}`);
      return false;
    }
  }

  add(summary: ChapterSummary): boolean {
    const all = this.loadAll();
    const existing = all.findIndex((s) => s.chapterNumber === summary.chapterNumber);
    if (existing !== -1) {
      all[existing] = summary;
      logger.log(`🔄 更新第 ${summary.chapterNumber} 章摘要`);
    } else {
      all.push(summary);
      logger.log(`➕ 添加第 ${summary.chapterNumber} 章摘要`);
    }

    all.sort((a, b) => a.chapterNumber - b.chapterNumber);
    return this.saveAll(all);
  }

  update(id: string, updates: Partial<ChapterSummary>): boolean {
    const all = this.loadAll();
    const index = all.findIndex((s) => s.id === id);
    if (index === -1) {
      logger.log(`⚠️ 未找到章节摘要: ${id}`);
      return false;
    }

    all[index] = { ...all[index], ...updates };
    return this.saveAll(all);
  }

  delete(id: string): boolean {
    const all = this.loadAll();
    const filtered = all.filter((s) => s.id !== id);
    if (filtered.length === all.length) {
      logger.log(`⚠️ 未找到章节摘要: ${id}`);
      return false;
    }

    return this.saveAll(filtered);
  }

  findById(id: string): ChapterSummary | null {
    const all = this.loadAll();
    return all.find((s) => s.id === id) || null;
  }

  findByChapter(chapterNumber: number): ChapterSummary | null {
    const all = this.loadAll();
    return all.find((s) => s.chapterNumber === chapterNumber) || null;
  }

  generateId(): string {
    const id = `SUM${String(this.counter).padStart(4, '0')}`;
    this.counter++;
    return id;
  }
}

export const summaryRepository = new SummaryRepository();
