import * as vscode from 'vscode';
import { logger } from '../utils/logger';
import { dataStorage } from '../data/storage';
import { Character, CharacterTimeline, CharacterRelationship, CharacterHistory, CharacterAttribute } from '../types/character';

export class CharacterManagementService {
  private static instance: CharacterManagementService;

  private constructor() {}

  public static getInstance(): CharacterManagementService {
    if (!CharacterManagementService.instance) {
      CharacterManagementService.instance = new CharacterManagementService();
    }
    return CharacterManagementService.instance;
  }

  public async updateCharacter(
    characterId: string,
    updates: Partial<Character>,
    chapterNumber?: number,
    changeReason?: string
  ): Promise<boolean> {
    try {
      const character = dataStorage.loadCharacters().find(c => c.id === characterId);
      if (!character) {
        vscode.window.showErrorMessage('角色不存在');
        return false;
      }

      const oldCharacter = { ...character };
      const newCharacter = { ...character, ...updates, updatedAt: new Date().toISOString() };

      const changes = this.detectChanges(oldCharacter, newCharacter);
      if (changes.length === 0) {
        vscode.window.showInformationMessage('没有检测到变化');
        return false;
      }

      const success = dataStorage.updateCharacter(characterId, updates);
      if (!success) {
        vscode.window.showErrorMessage('更新角色失败');
        return false;
      }

      if (chapterNumber) {
        await this.recordTimeline(characterId, chapterNumber, changes);
      }

      await this.recordHistory(characterId, oldCharacter, changeReason || '手动更新', chapterNumber);

      logger.log(`✅ 角色已更新: ${character.name}`);
      vscode.window.showInformationMessage(`角色 ${character.name} 已更新`);
      return true;
    } catch (error) {
      logger.log(`❌ 更新角色失败: ${error}`);
      vscode.window.showErrorMessage('更新角色失败');
      return false;
    }
  }

  public async addRelationship(
    characterId1: string,
    characterId2: string,
    relationshipType: CharacterRelationship['relationshipType'],
    relationshipLabel: string,
    strength: number = 50,
    notes?: string
  ): Promise<boolean> {
    try {
      const characters = dataStorage.loadCharacters();
      const char1 = characters.find(c => c.id === characterId1);
      const char2 = characters.find(c => c.id === characterId2);

      if (!char1 || !char2) {
        vscode.window.showErrorMessage('角色不存在');
        return false;
      }

      if (characterId1 === characterId2) {
        vscode.window.showErrorMessage('不能添加与自己的关系');
        return false;
      }

      const relationship: CharacterRelationship = {
        id: dataStorage.generateRelationshipId(),
        characterId1,
        characterId2,
        relationshipType,
        relationshipLabel,
        strength: Math.max(0, Math.min(100, strength)),
        status: 'active',
        startDate: new Date().toISOString(),
        notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const success = dataStorage.addRelationship(relationship);
      if (success) {
        logger.log(`✅ 关系已添加: ${char1.name} - ${relationshipLabel} - ${char2.name}`);
        vscode.window.showInformationMessage(`关系已添加: ${char1.name} - ${relationshipLabel} - ${char2.name}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.log(`❌ 添加关系失败: ${error}`);
      vscode.window.showErrorMessage('添加关系失败');
      return false;
    }
  }

  public async updateRelationship(
    relationshipId: string,
    updates: Partial<CharacterRelationship>
  ): Promise<boolean> {
    try {
      const success = dataStorage.updateRelationship(relationshipId, updates);
      if (success) {
        logger.log(`✅ 关系已更新: ${relationshipId}`);
        vscode.window.showInformationMessage('关系已更新');
        return true;
      }
      vscode.window.showErrorMessage('关系不存在');
      return false;
    } catch (error) {
      logger.log(`❌ 更新关系失败: ${error}`);
      vscode.window.showErrorMessage('更新关系失败');
      return false;
    }
  }

  public getRelationships(characterId: string): CharacterRelationship[] {
    return dataStorage.loadRelationshipsByCharacter(characterId);
  }

  public getTimeline(characterId: string): CharacterTimeline[] {
    return dataStorage.loadTimelinesByCharacter(characterId);
  }

  public getHistory(characterId: string): CharacterHistory[] {
    return dataStorage.loadHistoryByCharacter(characterId);
  }

  public getCharacterHistory(characterId: string): CharacterHistory[] {
    return this.getHistory(characterId);
  }

  public async addAttribute(
    characterId: string,
    name: string,
    value: string,
    category: CharacterAttribute['category'] = 'custom',
    chapterNumber?: number,
    changeReason?: string
  ): Promise<boolean> {
    try {
      const character = dataStorage.loadCharacters().find(c => c.id === characterId);
      if (!character) {
        vscode.window.showErrorMessage('角色不存在');
        return false;
      }

      const existingAttributes = dataStorage.loadAttributesByCharacter(characterId);
      const displayOrder = existingAttributes.length + 1;

      const attribute: CharacterAttribute = {
        id: dataStorage.generateAttributeId(),
        characterId,
        name,
        value,
        category,
        displayOrder,
        visible: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const success = dataStorage.addAttribute(attribute);
      if (!success) {
        vscode.window.showErrorMessage('添加属性失败');
        return false;
      }

      if (chapterNumber) {
        await this.recordTimeline(characterId, chapterNumber, [{
          type: category,
          field: name,
          oldValue: '',
          newValue: value,
          description: changeReason
        }]);
      }

      await this.recordHistory(characterId, character, changeReason || `添加属性: ${name}`, chapterNumber);

      logger.log(`✅ 属性已添加: ${name} = ${value}`);
      vscode.window.showInformationMessage(`属性已添加: ${name} = ${value}`);
      return true;
    } catch (error) {
      logger.log(`❌ 添加属性失败: ${error}`);
      vscode.window.showErrorMessage('添加属性失败');
      return false;
    }
  }

  public async deleteAttribute(attributeId: string): Promise<boolean> {
    try {
      const success = dataStorage.deleteAttribute(attributeId);
      if (success) {
        logger.log(`✅ 属性已删除: ${attributeId}`);
        vscode.window.showInformationMessage('属性已删除');
        return true;
      }
      vscode.window.showErrorMessage('属性不存在');
      return false;
    } catch (error) {
      logger.log(`❌ 删除属性失败: ${error}`);
      vscode.window.showErrorMessage('删除属性失败');
      return false;
    }
  }

  public getAttributes(characterId: string): CharacterAttribute[] {
    return dataStorage.loadAttributesByCharacter(characterId);
  }

  public async rollbackToVersion(characterId: string, version: number): Promise<boolean> {
    try {
      const histories = dataStorage.loadHistoryByCharacter(characterId);
      if (histories.length === 0) {
        vscode.window.showErrorMessage('没有历史记录');
        return false;
      }

      const targetHistory = histories.find(h => h.version === version);
      if (!targetHistory) {
        vscode.window.showErrorMessage('版本不存在');
        return false;
      }

      const success = dataStorage.updateCharacter(characterId, targetHistory.snapshot);
      if (success) {
        logger.log(`✅ 已回滚到版本 ${version}`);
        vscode.window.showInformationMessage(`已回滚到版本 ${version}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.log(`❌ 回滚失败: ${error}`);
      vscode.window.showErrorMessage('回滚失败');
      return false;
    }
  }

  private detectChanges(oldChar: Character, newChar: Character): any[] {
    const changes: any[] = [];
    const fields: (keyof Character)[] = ['name', 'role', 'description', 'personality', 'background', 'mbtiPrimary', 'mbtiSecondary'];

    for (const field of fields) {
      if (oldChar[field] !== newChar[field]) {
        changes.push({
          type: this.getChangeType(field),
          field,
          oldValue: oldChar[field],
          newValue: newChar[field]
        });
      }
    }

    return changes;
  }

  private getChangeType(field: string): string {
    if (field === 'role' || field === 'description') return 'identity';
    if (field === 'personality' || field === 'mbtiPrimary' || field === 'mbtiSecondary') return 'personality';
    if (field === 'background') return 'status';
    return 'other';
  }

  private async recordTimeline(
    characterId: string,
    chapterNumber: number,
    changes: any[]
  ): Promise<void> {
    const timeline: CharacterTimeline = {
      id: dataStorage.generateTimelineId(),
      characterId,
      chapterNumber,
      changes,
      createdAt: new Date().toISOString()
    };

    dataStorage.addTimeline(timeline);
  }

  private async recordHistory(
    characterId: string,
    snapshot: Character,
    changeReason: string,
    chapterNumber?: number
  ): Promise<void> {
    const histories = dataStorage.loadHistoryByCharacter(characterId);
    const version = histories.length + 1;

    const history: CharacterHistory = {
      id: dataStorage.generateHistoryId(),
      characterId,
      version,
      snapshot,
      changeReason,
      chapterNumber,
      createdAt: new Date().toISOString()
    };

    dataStorage.addHistoryRecord(history);
  }
}

export const characterManagementService = CharacterManagementService.getInstance();