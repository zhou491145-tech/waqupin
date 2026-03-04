import { BaseRepository } from '../../core/BaseRepository';
import { Outline } from '../../data/storage';

/**
 * 大纲仓库
 */
export class OutlineRepositoryImpl extends BaseRepository<Outline> {
  constructor() {
    super('outlines.json');
  }

  /**
   * 根据卷号查找大纲
   */
  findByVolume(volumeNumber: number): Outline[] {
    return this.loadAll()
      .filter(o => o.volumeNumber === volumeNumber)
      .sort((a, b) => (a.chapterNumber || 0) - (b.chapterNumber || 0));
  }

  /**
   * 根据章节号查找大纲
   */
  findByChapterNumber(chapterNumber: number): Outline | undefined {
    return this.loadAll().find(o => o.chapterNumber === chapterNumber);
  }

  /**
   * 搜索大纲（按标题和内容）
   */
  search(keyword: string): Outline[] {
    const lowerKeyword = keyword.toLowerCase();
    return this.loadAll().filter(o => 
      o.title.toLowerCase().includes(lowerKeyword) ||
      o.content.toLowerCase().includes(lowerKeyword)
    );
  }

  /**
   * 获取所有卷
   */
  getAllVolumes(): number[] {
    const volumes = new Set<number>();
    this.loadAll().forEach(o => {
      if (o.volumeNumber !== undefined) {
        volumes.add(o.volumeNumber);
      }
    });
    return Array.from(volumes).sort((a, b) => a - b);
  }

  /**
   * 获取指定卷的章节数量
   */
  getChapterCountByVolume(volumeNumber: number): number {
    return this.findByVolume(volumeNumber).length;
  }
}
