import { BaseRepository } from '../../core/BaseRepository';
import { 
  CharacterTimeline, 
  CharacterRelationship, 
  CharacterHistory, 
  CharacterAttribute 
} from '../../data/storage';

/**
 * 角色时间线仓库
 */
export class CharacterTimelineRepositoryImpl extends BaseRepository<CharacterTimeline> {
  constructor() {
    super('characterTimelines.json');
  }

  findByCharacter(characterId: string): CharacterTimeline[] {
    return this.loadAll()
      .filter(t => t.characterId === characterId)
      .sort((a, b) => a.chapterNumber - b.chapterNumber);
  }

  findByChapter(chapterNumber: number): CharacterTimeline[] {
    return this.loadAll().filter(t => t.chapterNumber === chapterNumber);
  }
}

/**
 * 角色关系仓库
 */
export class CharacterRelationshipRepositoryImpl extends BaseRepository<CharacterRelationship> {
  constructor() {
    super('characterRelationships.json');
  }

  findByCharacter(characterId: string): CharacterRelationship[] {
    return this.loadAll().filter(r => 
      r.characterId1 === characterId || r.characterId2 === characterId
    );
  }

  findBetween(characterId1: string, characterId2: string): CharacterRelationship | undefined {
    return this.loadAll().find(r => 
      (r.characterId1 === characterId1 && r.characterId2 === characterId2) ||
      (r.characterId1 === characterId2 && r.characterId2 === characterId1)
    );
  }

  findByType(type: string): CharacterRelationship[] {
    return this.loadAll().filter(r => r.relationshipType === type);
  }

  getActive(): CharacterRelationship[] {
    return this.loadAll().filter(r => r.status === 'active');
  }
}

/**
 * 角色历史仓库
 */
export class CharacterHistoryRepositoryImpl extends BaseRepository<CharacterHistory> {
  constructor() {
    super('characterHistories.json');
  }

  findByCharacter(characterId: string): CharacterHistory[] {
    return this.loadAll()
      .filter(h => h.characterId === characterId)
      .sort((a, b) => a.version - b.version);
  }

  getLatestVersion(characterId: string): CharacterHistory | undefined {
    const histories = this.findByCharacter(characterId);
    return histories.length > 0 ? histories[histories.length - 1] : undefined;
  }

  findByChapter(chapterNumber: number): CharacterHistory[] {
    return this.loadAll().filter(h => h.chapterNumber === chapterNumber);
  }
}

/**
 * 角色属性仓库
 */
export class CharacterAttributeRepositoryImpl extends BaseRepository<CharacterAttribute> {
  constructor() {
    super('characterAttributes.json');
  }

  findByCharacter(characterId: string): CharacterAttribute[] {
    return this.loadAll()
      .filter(a => a.characterId === characterId)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  findByCategory(characterId: string, category: string): CharacterAttribute[] {
    return this.findByCharacter(characterId).filter(a => a.category === category);
  }

  getVisible(characterId: string): CharacterAttribute[] {
    return this.findByCharacter(characterId).filter(a => a.visible);
  }
}
