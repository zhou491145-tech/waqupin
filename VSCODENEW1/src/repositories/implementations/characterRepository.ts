import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../utils/logger';
import { Character } from '../../data/storage';
import { ICharacterRepository } from '../interfaces/characterRepository';

class CharacterRepository implements ICharacterRepository {
  private filePath: string | null = null;

  init(dataDir: string): boolean {
    this.filePath = path.join(dataDir, 'characters.json');
    return true;
  }

  loadAll(): Character[] {
    if (!this.filePath || !fs.existsSync(this.filePath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      logger.log(`⚠️ 读取角色数据失败: ${error}`);
      return [];
    }
  }

  saveAll(characters: Character[]): boolean {
    if (!this.filePath) {
      logger.log('❌ 角色存储未初始化');
      return false;
    }

    try {
      fs.writeFileSync(this.filePath, JSON.stringify(characters, null, 2), 'utf-8');
      logger.log(`💾 保存 ${characters.length} 个角色到本地`);
      return true;
    } catch (error) {
      logger.log(`❌ 保存角色数据失败: ${error}`);
      return false;
    }
  }

  add(character: Character): boolean {
    if (!character.id || character.id.trim() === '') {
      logger.log('⚠️ 角色ID不能为空');
      return false;
    }

    if (!character.name || character.name.trim() === '') {
      logger.log('⚠️ 角色名称不能为空');
      return false;
    }

    const all = this.loadAll();
    all.push(character);
    return this.saveAll(all);
  }

  update(id: string, updates: Partial<Character>): boolean {
    const all = this.loadAll();
    const index = all.findIndex((c) => c.id === id);
    if (index === -1) {
      logger.log(`⚠️ 未找到角色: ${id}`);
      return false;
    }

    all[index] = { ...all[index], ...updates, updatedAt: new Date().toISOString() };
    return this.saveAll(all);
  }

  delete(id: string): boolean {
    const all = this.loadAll();
    const filtered = all.filter((c) => c.id !== id);
    if (filtered.length === all.length) {
      logger.log(`⚠️ 未找到角色: ${id}`);
      return false;
    }

    return this.saveAll(filtered);
  }

  findById(id: string): Character | null {
    const all = this.loadAll();
    return all.find((c) => c.id === id) || null;
  }

  findByName(name: string): Character | null {
    const all = this.loadAll();
    return all.find((c) => c.name === name) || null;
  }

  findByRole(role: 'protagonist' | 'antagonist' | 'supporting' | 'minor'): Character[] {
    const all = this.loadAll();
    return all.filter((c) => c.role === role);
  }
}

export const characterRepository = new CharacterRepository();
