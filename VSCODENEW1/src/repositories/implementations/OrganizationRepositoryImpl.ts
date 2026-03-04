import { BaseRepository } from '../../core/BaseRepository';
import { Organization } from '../../data/storage';

/**
 * 组织/势力仓库
 */
export class OrganizationRepositoryImpl extends BaseRepository<Organization> {
  constructor() {
    super('organizations.json');
  }

  /**
   * 根据类型查找组织
   */
  findByType(type: 'faction' | 'family' | 'sect' | 'government' | 'other'): Organization[] {
    return this.loadAll().filter(o => o.type === type);
  }

  /**
   * 根据名称查找组织
   */
  findByName(name: string): Organization | undefined {
    return this.loadAll().find(o => o.name === name);
  }

  /**
   * 查找子组织
   */
  findChildren(parentOrgId: string): Organization[] {
    return this.loadAll().filter(o => o.parentOrgId === parentOrgId);
  }

  /**
   * 查找顶级组织（无父组织）
   */
  findTopLevel(): Organization[] {
    return this.loadAll().filter(o => !o.parentOrgId);
  }

  /**
   * 根据角色查找所属组织
   */
  findByMember(characterId: string): Organization[] {
    return this.loadAll().filter(o => 
      o.members && o.members.some(m => m.characterId === characterId)
    );
  }

  /**
   * 根据实力等级查找组织
   */
  findByPowerLevel(minLevel: number, maxLevel?: number): Organization[] {
    return this.loadAll().filter(o => {
      if (maxLevel !== undefined) {
        return o.powerLevel >= minLevel && o.powerLevel <= maxLevel;
      }
      return o.powerLevel >= minLevel;
    });
  }

  /**
   * 获取组织树结构
   */
  getTree(): Organization[] {
    const topLevel = this.findTopLevel();
    return topLevel.map(org => this.buildOrgTree(org));
  }

  private buildOrgTree(org: Organization): any {
    const children = this.findChildren(org.id);
    return {
      ...org,
      children: children.map(child => this.buildOrgTree(child))
    };
  }
}
