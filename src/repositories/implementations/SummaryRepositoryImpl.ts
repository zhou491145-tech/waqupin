import { BaseRepository } from '../../core/BaseRepository';
import { ChapterSummary } from '../../data/storage';

/**
 * 章节摘要仓库
 */
export class SummaryRepositoryImpl extends BaseRepository<ChapterSummary> {
  constructor() {
    super('summaries.json');
  }

  /**
   * 根据章节号查找摘要
   */
  findByChapterNumber(chapterNumber: number): ChapterSummary | undefined {
    return this.loadAll().find(s => s.chapterNumber === chapterNumber);
  }

  /**
   * 根据章节号范围查找摘要
   */
  findByChapterRange(start: number, end: number): ChapterSummary[] {
    return this.loadAll()
      .filter(s => s.chapterNumber >= start && s.chapterNumber <= end)
      .sort((a, b) => a.chapterNumber - b.chapterNumber);
  }

  /**
   * 根据角色查找相关章节
   */
  findByCharacter(characterName: string): ChapterSummary[] {
    return this.loadAll().filter(s => 
      s.keyCharacters && s.keyCharacters.includes(characterName)
    );
  }

  /**
   * 根据情感基调查找章节
   */
  findByEmotionalTone(tone: string): ChapterSummary[] {
    return this.loadAll().filter(s => s.emotionalTone === tone);
  }

  /**
   * 根据节奏查找章节
   */
  findByPaceLevel(pace: 'slow' | 'moderate' | 'fast'): ChapterSummary[] {
    return this.loadAll().filter(s => s.paceLevel === pace);
  }

  /**
   * 获取最新的章节摘要
   */
  getLatest(count: number = 5): ChapterSummary[] {
    return this.loadAll()
      .sort((a, b) => b.chapterNumber - a.chapterNumber)
      .slice(0, count);
  }

  /**
   * 获取总字数
   */
  getTotalWordCount(): number {
    return this.loadAll().reduce((sum, s) => sum + (s.wordCount || 0), 0);
  }
}
