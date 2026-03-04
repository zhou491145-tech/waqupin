import { BaseRepository } from '../../core/BaseRepository';
import { Character } from '../../data/storage';

/**
 * 角色仓库
 */
export class CharacterRepositoryImpl extends BaseRepository<Character> {
  constructor() {
    super('characters.json');
  }

  /**
   * 根据名称查找角色
   */
  findByName(name: string): Character | undefined {
    return this.loadAll().find(c => 
      c.name === name || (c.aliases && c.aliases.includes(name))
    );
  }

  /**
   * 根据角色类型查找
   */
  findByRole(role: 'protagonist' | 'antagonist' | 'supporting' | 'minor'): Character[] {
    return this.loadAll().filter(c => c.role === role);
  }

  /**
   * 根据 MBTI 性格标签查找
   */
  findByMBTI(mbtiType: string): Character[] {
    return this.loadAll().filter(c => 
      c.mbtiPrimary === mbtiType || c.mbtiSecondary === mbtiType
    );
  }

  /**
   * 搜索角色（按名称、别名、描述）
   */
  search(keyword: string): Character[] {
    const lowerKeyword = keyword.toLowerCase();
    return this.loadAll().filter(c => {
      return (
        c.name.toLowerCase().includes(lowerKeyword) ||
        (c.aliases && c.aliases.some(alias => alias.toLowerCase().includes(lowerKeyword))) ||
        c.description.toLowerCase().includes(lowerKeyword)
      );
    });
  }

  /**
   * 获取主角
   */
  getProtagonists(): Character[] {
    return this.findByRole('protagonist');
  }

  /**
   * 获取反派
   */
  getAntagonists(): Character[] {
    return this.findByRole('antagonist');
  }
}
