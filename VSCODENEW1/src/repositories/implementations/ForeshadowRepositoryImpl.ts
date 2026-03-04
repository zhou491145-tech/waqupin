import { BaseRepository } from '../../core/BaseRepository';
import { Foreshadow } from '../../data/storage';

/**
 * 伏笔仓库
 */
export class ForeshadowRepositoryImpl extends BaseRepository<Foreshadow> {
  constructor() {
    super('foreshadows.json');
  }

  /**
   * 根据状态查找伏笔
   */
  findByStatus(status: 'pending' | 'resolved' | 'abandoned'): Foreshadow[] {
    return this.loadAll().filter(f => f.status === status);
  }

  /**
   * 根据重要性查找伏笔
   */
  findByImportance(importance: 'high' | 'medium' | 'low'): Foreshadow[] {
    return this.loadAll().filter(f => f.importance === importance);
  }

  /**
   * 根据章节号查找埋下的伏笔
   */
  findByPlantedChapter(chapterNumber: number): Foreshadow[] {
    return this.loadAll().filter(f => f.plantedChapter === chapterNumber);
  }

  /**
   * 根据角色 ID 查找相关伏笔
   */
  findByCharacter(characterId: string): Foreshadow[] {
    return this.loadAll().filter(f => 
      f.relatedCharacters && f.relatedCharacters.includes(characterId)
    );
  }

  /**
   * 获取待处理的伏笔
   */
  getPending(): Foreshadow[] {
    return this.findByStatus('pending');
  }

  /**
   * 获取高优先级伏笔
   */
  getHighPriority(): Foreshadow[] {
    return this.findByImportance('high').filter(f => f.status === 'pending');
  }
}
