import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';
import { panelRefreshService } from '../services/panelRefreshService';

let vscode: any = null;
try {
  vscode = require('vscode');
} catch (error) {
}

export interface Foreshadow {
  id: string;
  description: string;
  status: 'pending' | 'resolved' | 'abandoned';
  importance: 'high' | 'medium' | 'low';
  plantedChapter: number;
  resolvedChapter?: number;
  relatedCharacters: string[];
  keyword: string;
  notes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Character {
  id: string;
  name: string;
  aliases: string[];
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  description: string;
  personality: string;
  background: string;
  mbtiPrimary?: string; // 主MBTI性格标签
  mbtiSecondary?: string; // 辅助MBTI性格标签
  createdAt: string;
  updatedAt: string;
}

export interface CharacterTimeline {
  id: string;
  characterId: string;
  chapterNumber: number;
  chapterTitle?: string;
  changes: CharacterChange[];
  notes?: string;
  createdAt: string;
}

export interface CharacterChange {
  type: 'title' | 'identity' | 'ability' | 'personality' | 'status' | 'other';
  field: string;
  oldValue: string;
  newValue: string;
  description?: string;
}

export interface CharacterRelationship {
  id: string;
  characterId1: string;
  characterId2: string;
  relationshipType: 'friend' | 'enemy' | 'family' | 'mentor' | 'lover' | 'rival' | 'subordinate' | 'ally' | 'neutral' | 'other';
  relationshipLabel: string;
  strength: number;
  status: 'active' | 'inactive' | 'ended';
  startDate?: string;
  endDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterHistory {
  id: string;
  characterId: string;
  version: number;
  snapshot: Character;
  changeReason: string;
  chapterNumber?: number;
  createdAt: string;
}

export interface CharacterAttribute {
  id: string;
  characterId: string;
  name: string;
  value: string;
  category: 'title' | 'identity' | 'ability' | 'status' | 'custom';
  displayOrder: number;
  visible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChapterSummary {
  id: string;
  chapterNumber: number;
  chapterTitle: string;
  summary: string;
  wordCount: number;
  keyCharacters: string[];
  keyEvents: string[];
  mainConflict?: string;
  emotionalTone?: string;
  paceLevel?: 'slow' | 'moderate' | 'fast';
  createdAt: string;
}

export interface WorldSetting {
  id: string;
  title: string;
  timePeriod: string;
  location: string;
  atmosphere: string;
  rules: string[];
  additionalInfo: string;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  type: 'faction' | 'family' | 'sect' | 'government' | 'other';
  parentOrgId?: string;
  level: number;
  powerLevel: number;
  memberCount: number;
  location: string;
  motto: string;
  description: string;
  members: OrganizationMember[];
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  characterId: string;
  position: string;
  rank: number;
  loyalty: number;
  joinedAt: string;
}

export interface Outline {
  id: string;
  volumeNumber?: number;
  chapterNumber?: number;
  title: string;
  content: string;
  type: 'volume' | 'chapter' | 'scene';
  parentId?: string;
  orderIndex: number;
  status: 'draft' | 'finalized';
  createdAt: string;
}

export interface WritingStyle {
  id: string;
  name: string; // 风格名称，如"金庸风格"
  baseAuthor?: string; // 仿照的作家，如"金庸"
  description: string; // 风格描述
  characteristics: string[]; // 风格特征列表
  writingRules: string[]; // 写作规则
  exampleSentences: string[]; // 示例句子
  isActive: boolean; // 是否启用
  createdAt: string;
  updatedAt: string;
}

export interface ProjectConfig {
  id: string;
  title: string; // 书名
  theme: string; // 主题
  genre: string; // 类型（玄幻、都市、言情等）
  targetWordCount: number; // 目标字数
  narrativePerspective: string; // 叙述视角（第一人称、第三人称等）
  targetAudience: string; // 目标读者
  coreConflict: string; // 核心冲突
  mainPlot: string; // 主要情节
  createdAt: string;
  updatedAt: string;
}

export interface NovelCategory {
  id: string;
  name: string;
  parentId: string | null;
  description?: string;
  createdAt: string;
}

export interface StyleTemplate {
  id: string;
  name: string;
  category: string;
  content: string;
  isBuiltIn: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RefiningTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  prompt: string;
  isBuiltIn: boolean;
  createdAt: string;
  updatedAt: string;
}

class DataStorage {
  private workspaceRoot: string | null = null;
  private dataDir: string | null = null;

  private foreshadowsPath: string | null = null;
  private charactersPath: string | null = null;
  private timelinesPath: string | null = null;
  private relationshipsPath: string | null = null;
  private characterHistoryPath: string | null = null;
  private characterAttributesPath: string | null = null;
  private summariesPath: string | null = null;
  private worldSettingPath: string | null = null;
  private organizationsPath: string | null = null;
  private outlinesPath: string | null = null;
  private writingStylePath: string | null = null;
  private projectConfigPath: string | null = null;

  private foreshadowCounter = 1;
  private summaryCounter = 1;
  private organizationCounter = 1;
  private outlineCounter = 1;
  private timelineCounter = 1;
  private relationshipCounter = 1;
  private historyCounter = 1;
  private attributeCounter = 1;
  
  // 备份节流机制
  private lastBackupTime = 0;
  private readonly backupInterval = 30000; // 30秒内只允许一次备份

  init(forceReinit: boolean = false): boolean {
    let workspaceRoot: string;
    
    if (vscode) {
      const folders = vscode.workspace.workspaceFolders;
      if (!folders || folders.length === 0) {
        logger.log('⚠️ 未找到工作区文件夹，数据存储功能不可用');
        return false;
      }

      workspaceRoot = folders[0].uri.fsPath;
    } else {
      workspaceRoot = process.cwd();
    }

    if (!workspaceRoot) {
      logger.log('⚠️ 无法确定工作区根目录');
      return false;
    }

    // 确保数据目录始终基于当前工作区根目录
    const dataDir = path.join(workspaceRoot, '.novel-assistant');
    
    // 记录当前数据目录和工作区根目录
    logger.log(`📂 初始化数据存储 - 工作区根目录: ${workspaceRoot}, 数据目录: ${dataDir}`);

    // 如果数据目录或工作区根目录发生变化，重新初始化
    if (forceReinit || this.dataDir !== dataDir || this.workspaceRoot !== workspaceRoot) {
      this.workspaceRoot = workspaceRoot;
      this.dataDir = dataDir;
      
      // 重新设置所有数据文件路径
      this.foreshadowsPath = path.join(this.dataDir, 'foreshadows.json');
      this.charactersPath = path.join(this.dataDir, 'characters.json');
      this.timelinesPath = path.join(this.dataDir, 'timelines.json');
      this.relationshipsPath = path.join(this.dataDir, 'relationships.json');
      this.characterHistoryPath = path.join(this.dataDir, 'character-history.json');
      this.characterAttributesPath = path.join(this.dataDir, 'character-attributes.json');
      this.summariesPath = path.join(this.dataDir, 'summaries.json');
      this.worldSettingPath = path.join(this.dataDir, 'world-setting.json');
      this.organizationsPath = path.join(this.dataDir, 'organizations.json');
      this.outlinesPath = path.join(this.dataDir, 'outlines.json');
      this.writingStylePath = path.join(this.dataDir, 'writing-style.json');
      this.projectConfigPath = path.join(this.dataDir, 'project-config.json');

      logger.log(`🔄 数据存储路径已更新: ${this.dataDir}`);
    }

    // 确保数据目录存在
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
      logger.log(`✅ 创建数据目录: ${this.dataDir}`);
    }

    // 重新加载计数器，确保数据一致性
    this._reloadCounters();

    return true;
  }
  
  /**
   * 重新加载计数器，确保数据一致性
   */
  private _reloadCounters(): void {
    // 重新加载伏笔计数器
    const existing = this.loadForeshadows();
    if (existing.length > 0) {
      const maxId = Math.max(...existing.map((f) => {
        const match = f.id.match(/^F(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      }));
      this.foreshadowCounter = maxId + 1;
    } else {
      this.foreshadowCounter = 1;
    }

    // 重新加载摘要计数器
    const existingSummaries = this.loadSummaries();
    if (existingSummaries.length > 0) {
      const maxSumId = Math.max(...existingSummaries.map((s) => {
        const match = s.id.match(/^SUM(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      }));
      this.summaryCounter = maxSumId + 1;
    } else {
      this.summaryCounter = 1;
    }

    // 重新加载组织计数器
    const existingOrgs = this.loadOrganizations();
    if (existingOrgs.length > 0) {
      const maxOrgId = Math.max(...existingOrgs.map((o) => {
        const match = o.id.match(/^ORG(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      }));
      this.organizationCounter = maxOrgId + 1;
    } else {
      this.organizationCounter = 1;
    }

    // 重新加载大纲计数器
    const existingOutlines = this.loadOutlines();
    if (existingOutlines.length > 0) {
      const maxOutId = Math.max(...existingOutlines.map((o) => {
        const match = o.id.match(/^OUT(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      }));
      this.outlineCounter = maxOutId + 1;
    } else {
      this.outlineCounter = 1;
    }
    
    logger.log(`🔢 计数器已重新加载 - 伏笔: ${this.foreshadowCounter}, 摘要: ${this.summaryCounter}, 组织: ${this.organizationCounter}, 大纲: ${this.outlineCounter}`);
  }
  
  /**
   * 确保数据存储已初始化
   */
  private _ensureInitialized(): boolean {
    if (!this.dataDir || !this.workspaceRoot) {
      logger.log('🔄 数据存储未初始化，尝试自动初始化...');
      return this.init();
    }
    
    // 检查数据目录是否存在
    if (!fs.existsSync(this.dataDir)) {
      logger.log('📁 数据目录不存在，尝试重新初始化...');
      return this.init(true);
    }
    
    return true;
  }
  
  /**
   * 创建数据备份
   */
  private _createBackup(): boolean {
    if (!this._ensureInitialized() || !this.dataDir) {
      return false;
    }
    
    // 备份节流：30秒内只允许一次备份
    const now = Date.now();
    if (now - this.lastBackupTime < this.backupInterval) {
      logger.log(`⏱️  跳过备份：距离上次备份时间不足${this.backupInterval / 1000}秒`);
      return false;
    }
    
    try {
      // 备份目录路径
      const backupDir = path.join(this.dataDir, 'backups');
      
      // 确保备份目录存在
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      // 备份文件名使用时间戳
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // 简单备份实现：复制所有JSON文件到备份目录，使用统一的时间戳
      const dataFiles = [
        this.foreshadowsPath,
        this.charactersPath,
        this.summariesPath,
        this.worldSettingPath,
        this.organizationsPath,
        this.outlinesPath,
        this.writingStylePath,
        this.projectConfigPath
      ];
      
      let backupCount = 0;
      for (const filePath of dataFiles) {
        if (filePath && fs.existsSync(filePath)) {
          const backupFilePath = path.join(backupDir, `${path.basename(filePath)}.${timestamp}`);
          fs.copyFileSync(filePath, backupFilePath);
          backupCount++;
        }
      }
      
      // 清理旧备份（按时间分组，每组保留最新的一个）
      this._cleanupOldBackups(backupDir);
      
      // 更新上次备份时间
      this.lastBackupTime = now;
      
      logger.log(`💾 数据备份完成，共备份 ${backupCount} 个文件: ${backupDir}`);
      return true;
    } catch (error) {
      logger.log(`❌ 创建数据备份失败: ${error}`);
      return false;
    }
  }
  
  /**
   * 清理旧备份
   */
  private _cleanupOldBackups(backupDir: string): void {
    try {
      const files = fs.readdirSync(backupDir)
        .filter(file => file.includes('.json.')) // 匹配 *.json.timestamp 格式的备份文件
        .map(file => ({
          name: file,
          mtime: fs.statSync(path.join(backupDir, file)).mtime.getTime()
        }))
        .sort((a, b) => b.mtime - a.mtime);
      
      // 保留最近5次备份（按时间分组，每组保留最新的一个）
      const backupsByGroup = new Map<string, Array<{name: string, mtime: number}>>();
      
      // 按时间分组，每分钟一个组
      files.forEach(file => {
        const timestamp = file.name.split('.').pop() as string;
        const groupKey = timestamp.slice(0, 16); // 取时间戳的前16位（到分钟）
        if (!backupsByGroup.has(groupKey)) {
          backupsByGroup.set(groupKey, []);
        }
        backupsByGroup.get(groupKey)?.push(file);
      });
      
      // 每组保留最新的一个备份
      const backupsToKeep: string[] = [];
      backupsByGroup.forEach(files => {
        if (files.length > 0) {
          const latest = files.sort((a, b) => b.mtime - a.mtime)[0];
          backupsToKeep.push(latest.name);
        }
      });
      
      // 删除其他旧备份
      const allBackups = fs.readdirSync(backupDir);
      const backupsToDelete = allBackups.filter(backup => !backupsToKeep.includes(backup));
      
      backupsToDelete.forEach(backup => {
        fs.unlinkSync(path.join(backupDir, backup));
      });
      
      if (backupsToDelete.length > 0) {
        logger.log(`🗑️ 清理了 ${backupsToDelete.length} 个旧备份`);
      }
    } catch (error) {
      logger.log(`⚠️ 清理旧备份失败: ${error}`);
    }
  }

  // ==================== 伏笔管理 ====================

  loadForeshadows(): Foreshadow[] {
    if (!this._ensureInitialized()) {
      return [];
    }
    
    if (!this.foreshadowsPath || !fs.existsSync(this.foreshadowsPath)) {
      logger.log('📄 伏笔数据文件不存在，返回空数组');
      return [];
    }

    try {
      const content = fs.readFileSync(this.foreshadowsPath, 'utf-8');
      const data = JSON.parse(content);
      logger.log(`📖 读取伏笔数据成功，共 ${data.length} 个伏笔`);
      return data;
    } catch (error) {
      logger.log(`⚠️ 读取伏笔数据失败: ${error}`);
      return [];
    }
  }

  saveForeshadows(foreshadows: Foreshadow[]): boolean {
    if (!this._ensureInitialized()) {
      logger.log('❌ 数据存储未初始化，无法保存伏笔数据');
      return false;
    }

    if (!this.foreshadowsPath) {
      logger.log('❌ 伏笔数据路径未设置');
      return false;
    }

    try {
      // 创建备份
      this._createBackup();
      
      fs.writeFileSync(this.foreshadowsPath, JSON.stringify(foreshadows, null, 2), 'utf-8');
      logger.log(`💾 保存 ${foreshadows.length} 个伏笔到本地: ${this.foreshadowsPath}`);
      return true;
    } catch (error) {
      logger.log(`❌ 保存伏笔数据失败: ${error}`);
      return false;
    }
  }

  addForeshadow(foreshadow: Foreshadow): boolean {
    const all = this.loadForeshadows();
    all.push(foreshadow);
    const success = this.saveForeshadows(all);
    if (success) {
      panelRefreshService.notifyForeshadowsChanged();
    }
    return success;
  }

  generateForeshadowId(): string {
    const id = `F${String(this.foreshadowCounter).padStart(4, '0')}`;
    this.foreshadowCounter++;
    return id;
  }

  deleteForeshadow(id: string): boolean {
    const all = this.loadForeshadows();
    const filtered = all.filter((f) => f.id !== id);
    if (filtered.length === all.length) {
      logger.log(`⚠️ 未找到伏笔: ${id}`);
      return false;
    }
    const success = this.saveForeshadows(filtered);
    if (success) {
      panelRefreshService.notifyForeshadowsChanged();
    }
    return success;
  }

  // ==================== 角色管理 ====================

  loadCharacters(): Character[] {
    if (!this._ensureInitialized()) {
      return [];
    }
    
    if (!this.charactersPath || !fs.existsSync(this.charactersPath)) {
      logger.log('📄 角色数据文件不存在，返回空数组');
      return [];
    }

    try {
      const content = fs.readFileSync(this.charactersPath, 'utf-8');
      const data = JSON.parse(content);
      logger.log(`📖 读取角色数据成功，共 ${data.length} 个角色`);
      return data;
    } catch (error) {
      logger.log(`⚠️ 读取角色数据失败: ${error}`);
      return [];
    }
  }

  saveCharacters(characters: Character[]): boolean {
    if (!this._ensureInitialized()) {
      logger.log('❌ 数据存储未初始化，无法保存角色数据');
      return false;
    }

    if (!this.charactersPath) {
      logger.log('❌ 角色数据路径未设置');
      return false;
    }

    try {
      // 创建备份
      this._createBackup();
      
      fs.writeFileSync(this.charactersPath, JSON.stringify(characters, null, 2), 'utf-8');
      logger.log(`💾 保存 ${characters.length} 个角色到本地: ${this.charactersPath}`);
      return true;
    } catch (error) {
      logger.log(`❌ 保存角色数据失败: ${error}`);
      return false;
    }
  }

  addCharacter(character: Character): boolean {
    const all = this.loadCharacters();
    
    const existingIndex = all.findIndex(c => c.name === character.name);
    if (existingIndex !== -1) {
      logger.log(`🔄 角色已存在，更新: ${character.name}`);
      all[existingIndex] = { ...all[existingIndex], ...character, updatedAt: new Date().toISOString() };
    } else {
      all.push(character);
      logger.log(`➕ 添加新角色: ${character.name}`);
    }
    
    const success = this.saveCharacters(all);
    if (success) {
      try {
        panelRefreshService.notifyCharactersChanged();
      } catch (error) {
        logger.log(`⚠️ 通知角色变更失败，但角色已成功保存: ${error}`);
      }
    }
    return success;
  }

  updateCharacter(characterId: string, updates: Partial<Character>): boolean {
    const all = this.loadCharacters();
    const index = all.findIndex(c => c.id === characterId);
    if (index === -1) {
      logger.log(`⚠️ 角色不存在: ${characterId}`);
      return false;
    }
    all[index] = { ...all[index], ...updates, updatedAt: new Date().toISOString() };
    const success = this.saveCharacters(all);
    if (success) {
      try {
        panelRefreshService.notifyCharactersChanged();
      } catch (error) {
        logger.log(`⚠️ 通知角色变更失败，但角色已成功保存: ${error}`);
      }
    }
    return success;
  }

  deleteCharacter(characterId: string): boolean {
    const all = this.loadCharacters();
    const filtered = all.filter(c => c.id !== characterId);
    if (filtered.length === all.length) {
      logger.log(`⚠️ 角色不存在: ${characterId}`);
      return false;
    }
    const success = this.saveCharacters(filtered);
    if (success) {
      try {
        panelRefreshService.notifyCharactersChanged();
      } catch (error) {
        logger.log(`⚠️ 通知角色变更失败，但角色已成功保存: ${error}`);
      }
    }
    return success;
  }

  // ==================== 角色时间线管理 ====================

  loadTimelines(): CharacterTimeline[] {
    if (!this._ensureInitialized()) {
      return [];
    }
    
    if (!this.timelinesPath || !fs.existsSync(this.timelinesPath)) {
      logger.log('📄 时间线数据文件不存在，返回空数组');
      return [];
    }

    try {
      const content = fs.readFileSync(this.timelinesPath, 'utf-8');
      const data = JSON.parse(content);
      logger.log(`📖 读取时间线数据成功，共 ${data.length} 条记录`);
      return data;
    } catch (error) {
      logger.log(`⚠️ 读取时间线数据失败: ${error}`);
      return [];
    }
  }

  saveTimelines(timelines: CharacterTimeline[]): boolean {
    if (!this._ensureInitialized()) {
      logger.log('❌ 数据存储未初始化，无法保存时间线数据');
      return false;
    }

    if (!this.timelinesPath) {
      logger.log('❌ 时间线数据路径未设置');
      return false;
    }

    try {
      this._createBackup();
      fs.writeFileSync(this.timelinesPath, JSON.stringify(timelines, null, 2), 'utf-8');
      logger.log(`💾 保存 ${timelines.length} 条时间线记录到本地: ${this.timelinesPath}`);
      return true;
    } catch (error) {
      logger.log(`❌ 保存时间线数据失败: ${error}`);
      return false;
    }
  }

  addTimeline(timeline: CharacterTimeline): boolean {
    const all = this.loadTimelines();
    all.push(timeline);
    all.sort((a, b) => a.chapterNumber - b.chapterNumber);
    return this.saveTimelines(all);
  }

  loadTimelinesByCharacter(characterId: string): CharacterTimeline[] {
    const all = this.loadTimelines();
    return all.filter(t => t.characterId === characterId);
  }

  generateTimelineId(): string {
    const id = `TL${String(this.timelineCounter).padStart(4, '0')}`;
    this.timelineCounter++;
    return id;
  }

  // ==================== 角色关系管理 ====================

  loadRelationships(): CharacterRelationship[] {
    if (!this._ensureInitialized()) {
      return [];
    }
    
    if (!this.relationshipsPath || !fs.existsSync(this.relationshipsPath)) {
      logger.log('📄 关系数据文件不存在，返回空数组');
      return [];
    }

    try {
      const content = fs.readFileSync(this.relationshipsPath, 'utf-8');
      const data = JSON.parse(content);
      logger.log(`📖 读取关系数据成功，共 ${data.length} 条关系`);
      return data;
    } catch (error) {
      logger.log(`⚠️ 读取关系数据失败: ${error}`);
      return [];
    }
  }

  saveRelationships(relationships: CharacterRelationship[]): boolean {
    if (!this._ensureInitialized()) {
      logger.log('❌ 数据存储未初始化，无法保存关系数据');
      return false;
    }

    if (!this.relationshipsPath) {
      logger.log('❌ 关系数据路径未设置');
      return false;
    }

    try {
      this._createBackup();
      fs.writeFileSync(this.relationshipsPath, JSON.stringify(relationships, null, 2), 'utf-8');
      logger.log(`💾 保存 ${relationships.length} 条关系到本地: ${this.relationshipsPath}`);
      return true;
    } catch (error) {
      logger.log(`❌ 保存关系数据失败: ${error}`);
      return false;
    }
  }

  addRelationship(relationship: CharacterRelationship): boolean {
    const all = this.loadRelationships();
    all.push(relationship);
    return this.saveRelationships(all);
  }

  updateRelationship(relationshipId: string, updates: Partial<CharacterRelationship>): boolean {
    const all = this.loadRelationships();
    const index = all.findIndex(r => r.id === relationshipId);
    if (index === -1) {
      logger.log(`⚠️ 关系不存在: ${relationshipId}`);
      return false;
    }
    all[index] = { ...all[index], ...updates, updatedAt: new Date().toISOString() };
    return this.saveRelationships(all);
  }

  deleteRelationship(relationshipId: string): boolean {
    const all = this.loadRelationships();
    const filtered = all.filter(r => r.id !== relationshipId);
    if (filtered.length === all.length) {
      logger.log(`⚠️ 关系不存在: ${relationshipId}`);
      return false;
    }
    return this.saveRelationships(filtered);
  }

  loadRelationshipsByCharacter(characterId: string): CharacterRelationship[] {
    const all = this.loadRelationships();
    return all.filter(r => r.characterId1 === characterId || r.characterId2 === characterId);
  }

  generateRelationshipId(): string {
    const id = `REL${String(this.relationshipCounter).padStart(4, '0')}`;
    this.relationshipCounter++;
    return id;
  }

  // ==================== 角色历史管理 ====================

  loadCharacterHistory(): CharacterHistory[] {
    if (!this._ensureInitialized()) {
      return [];
    }
    
    if (!this.characterHistoryPath || !fs.existsSync(this.characterHistoryPath)) {
      logger.log('📄 历史数据文件不存在，返回空数组');
      return [];
    }

    try {
      const content = fs.readFileSync(this.characterHistoryPath, 'utf-8');
      const data = JSON.parse(content);
      logger.log(`📖 读取历史数据成功，共 ${data.length} 条记录`);
      return data;
    } catch (error) {
      logger.log(`⚠️ 读取历史数据失败: ${error}`);
      return [];
    }
  }

  saveCharacterHistory(history: CharacterHistory[]): boolean {
    if (!this._ensureInitialized()) {
      logger.log('❌ 数据存储未初始化，无法保存历史数据');
      return false;
    }

    if (!this.characterHistoryPath) {
      logger.log('❌ 历史数据路径未设置');
      return false;
    }

    try {
      this._createBackup();
      fs.writeFileSync(this.characterHistoryPath, JSON.stringify(history, null, 2), 'utf-8');
      logger.log(`💾 保存 ${history.length} 条历史记录到本地: ${this.characterHistoryPath}`);
      return true;
    } catch (error) {
      logger.log(`❌ 保存历史数据失败: ${error}`);
      return false;
    }
  }

  addHistoryRecord(history: CharacterHistory): boolean {
    const all = this.loadCharacterHistory();
    all.push(history);
    all.sort((a, b) => b.version - a.version);
    return this.saveCharacterHistory(all);
  }

  loadHistoryByCharacter(characterId: string): CharacterHistory[] {
    const all = this.loadCharacterHistory();
    return all.filter(h => h.characterId === characterId).sort((a, b) => b.version - a.version);
  }

  generateHistoryId(): string {
    const id = `HIST${String(this.historyCounter).padStart(4, '0')}`;
    this.historyCounter++;
    return id;
  }

  // ==================== 角色属性管理 ====================

  loadCharacterAttributes(): CharacterAttribute[] {
    if (!this._ensureInitialized()) {
      return [];
    }
    
    if (!this.characterAttributesPath || !fs.existsSync(this.characterAttributesPath)) {
      logger.log('📄 属性数据文件不存在，返回空数组');
      return [];
    }

    try {
      const content = fs.readFileSync(this.characterAttributesPath, 'utf-8');
      const data = JSON.parse(content);
      logger.log(`📖 读取属性数据成功，共 ${data.length} 条属性`);
      return data;
    } catch (error) {
      logger.log(`⚠️ 读取属性数据失败: ${error}`);
      return [];
    }
  }

  saveCharacterAttributes(attributes: CharacterAttribute[]): boolean {
    if (!this._ensureInitialized()) {
      logger.log('❌ 数据存储未初始化，无法保存属性数据');
      return false;
    }

    if (!this.characterAttributesPath) {
      logger.log('❌ 属性数据路径未设置');
      return false;
    }

    try {
      this._createBackup();
      fs.writeFileSync(this.characterAttributesPath, JSON.stringify(attributes, null, 2), 'utf-8');
      logger.log(`💾 保存 ${attributes.length} 条属性到本地: ${this.characterAttributesPath}`);
      return true;
    } catch (error) {
      logger.log(`❌ 保存属性数据失败: ${error}`);
      return false;
    }
  }

  addAttribute(attribute: CharacterAttribute): boolean {
    const all = this.loadCharacterAttributes();
    all.push(attribute);
    return this.saveCharacterAttributes(all);
  }

  updateAttribute(attributeId: string, updates: Partial<CharacterAttribute>): boolean {
    const all = this.loadCharacterAttributes();
    const index = all.findIndex(a => a.id === attributeId);
    if (index === -1) {
      logger.log(`⚠️ 属性不存在: ${attributeId}`);
      return false;
    }
    all[index] = { ...all[index], ...updates, updatedAt: new Date().toISOString() };
    return this.saveCharacterAttributes(all);
  }

  deleteAttribute(attributeId: string): boolean {
    const all = this.loadCharacterAttributes();
    const filtered = all.filter(a => a.id !== attributeId);
    if (filtered.length === all.length) {
      logger.log(`⚠️ 属性不存在: ${attributeId}`);
      return false;
    }
    return this.saveCharacterAttributes(filtered);
  }

  loadAttributesByCharacter(characterId: string): CharacterAttribute[] {
    const all = this.loadCharacterAttributes();
    return all.filter(a => a.characterId === characterId);
  }

  generateAttributeId(): string {
    const id = `ATTR${String(this.attributeCounter).padStart(4, '0')}`;
    this.attributeCounter++;
    return id;
  }

  // ==================== 章节摘要管理 ====================

  loadSummaries(): ChapterSummary[] {
    if (!this._ensureInitialized()) {
      return [];
    }
    
    if (!this.summariesPath || !fs.existsSync(this.summariesPath)) {
      logger.log('📄 摘要数据文件不存在，返回空数组');
      return [];
    }

    try {
      const content = fs.readFileSync(this.summariesPath, 'utf-8');
      const data = JSON.parse(content);
      logger.log(`📖 读取章节摘要成功，共 ${data.length} 个摘要`);
      return data;
    } catch (error) {
      logger.log(`⚠️ 读取章节摘要失败: ${error}`);
      return [];
    }
  }

  saveSummaries(summaries: ChapterSummary[]): boolean {
    if (!this._ensureInitialized()) {
      logger.log('❌ 数据存储未初始化，无法保存章节摘要');
      return false;
    }

    if (!this.summariesPath) {
      logger.log('❌ 摘要数据路径未设置');
      return false;
    }

    try {
      // 创建备份
      this._createBackup();
      
      fs.writeFileSync(this.summariesPath, JSON.stringify(summaries, null, 2), 'utf-8');
      logger.log(`💾 保存 ${summaries.length} 个章节摘要到本地: ${this.summariesPath}`);
      return true;
    } catch (error) {
      logger.log(`❌ 保存章节摘要失败: ${error}`);
      return false;
    }
  }

  addSummary(summary: ChapterSummary): boolean {
    const all = this.loadSummaries();
    const existing = all.findIndex((s) => s.chapterNumber === summary.chapterNumber);
    if (existing !== -1) {
      all[existing] = summary;
      logger.log(`🔄 更新第 ${summary.chapterNumber} 章摘要`);
    } else {
      all.push(summary);
      logger.log(`➕ 添加第 ${summary.chapterNumber} 章摘要`);
    }
    all.sort((a, b) => a.chapterNumber - b.chapterNumber);
    const success = this.saveSummaries(all);
    if (success) {
      panelRefreshService.notifySummariesChanged();
    }
    return success;
  }

  generateSummaryId(): string {
    const id = `SUM${String(this.summaryCounter).padStart(4, '0')}`;
    this.summaryCounter++;
    return id;
  }

  // ==================== 大纲管理 ====================

  loadOutlines(): Outline[] {
    if (!this._ensureInitialized()) {
      return [];
    }
    
    if (!this.outlinesPath || !fs.existsSync(this.outlinesPath)) {
      logger.log('📄 大纲数据文件不存在，返回空数组');
      return [];
    }

    try {
      const content = fs.readFileSync(this.outlinesPath, 'utf-8');
      const data = JSON.parse(content);
      logger.log(`📖 读取大纲数据成功，共 ${data.length} 个大纲条目`);
      return data;
    } catch (error) {
      logger.log(`⚠️ 读取大纲数据失败: ${error}`);
      return [];
    }
  }

  saveOutlines(outlines: Outline[]): boolean {
    if (!this._ensureInitialized()) {
      logger.log('❌ 数据存储未初始化，无法保存大纲数据');
      return false;
    }
    
    if (!this.outlinesPath) {
      logger.log('❌ 大纲数据路径未设置');
      return false;
    }

    try {
      // 创建备份
      this._createBackup();
      
      fs.writeFileSync(this.outlinesPath, JSON.stringify(outlines, null, 2), 'utf-8');
      logger.log(`💾 保存 ${outlines.length} 个大纲条目到本地: ${this.outlinesPath}`);
      return true;
    } catch (error) {
      logger.log(`❌ 保存大纲数据失败: ${error}`);
      return false;
    }
  }

  addOutline(outline: Outline): boolean {
    const all = this.loadOutlines();
    all.push(outline);
    all.sort((a, b) => a.orderIndex - b.orderIndex);
    return this.saveOutlines(all);
  }

  generateOutlineId(): string {
    const id = `OUT${String(this.outlineCounter).padStart(4, '0')}`;
    this.outlineCounter++;
    return id;
  }

  // ==================== 世界观管理 ====================

  loadWorldSetting(): WorldSetting | null {
    if (!this._ensureInitialized()) {
      return null;
    }
    
    if (!this.worldSettingPath || !fs.existsSync(this.worldSettingPath)) {
      logger.log('📄 世界观数据文件不存在，返回null');
      return null;
    }

    try {
      const content = fs.readFileSync(this.worldSettingPath, 'utf-8');
      const data = JSON.parse(content);
      logger.log(`📖 读取世界观数据成功`);
      return data;
    } catch (error) {
      logger.log(`⚠️ 读取世界观数据失败: ${error}`);
      return null;
    }
  }

  saveWorldSetting(setting: WorldSetting): boolean {
    if (!this._ensureInitialized()) {
      logger.log('❌ 数据存储未初始化，无法保存世界观数据');
      return false;
    }
    
    if (!this.worldSettingPath) {
      logger.log('❌ 世界观数据路径未设置');
      return false;
    }

    try {
      // 创建备份
      this._createBackup();
      
      fs.writeFileSync(this.worldSettingPath, JSON.stringify(setting, null, 2), 'utf-8');
      logger.log(`💾 世界观设定已保存: ${this.worldSettingPath}`);
      return true;
    } catch (error) {
      logger.log(`❌ 保存世界观数据失败: ${error}`);
      return false;
    }
  }

  // ==================== 组织管理 ====================

  loadOrganizations(): Organization[] {
    if (!this._ensureInitialized()) {
      return [];
    }
    
    if (!this.organizationsPath || !fs.existsSync(this.organizationsPath)) {
      logger.log('📄 组织数据文件不存在，返回空数组');
      return [];
    }

    try {
      const content = fs.readFileSync(this.organizationsPath, 'utf-8');
      const data = JSON.parse(content);
      logger.log(`📖 读取组织数据成功，共 ${data.length} 个组织`);
      return data;
    } catch (error) {
      logger.log(`⚠️ 读取组织数据失败: ${error}`);
      return [];
    }
  }

  saveOrganizations(organizations: Organization[]): boolean {
    if (!this._ensureInitialized()) {
      logger.log('❌ 数据存储未初始化，无法保存组织数据');
      return false;
    }
    
    if (!this.organizationsPath) {
      logger.log('❌ 组织数据路径未设置');
      return false;
    }

    try {
      // 创建备份
      this._createBackup();
      
      fs.writeFileSync(this.organizationsPath, JSON.stringify(organizations, null, 2), 'utf-8');
      logger.log(`💾 保存 ${organizations.length} 个组织到本地: ${this.organizationsPath}`);
      return true;
    } catch (error) {
      logger.log(`❌ 保存组织数据失败: ${error}`);
      return false;
    }
  }

  addOrganization(org: Organization): boolean {
    const all = this.loadOrganizations();
    all.push(org);
    return this.saveOrganizations(all);
  }

  generateOrganizationId(): string {
    const id = `ORG${String(this.organizationCounter).padStart(4, '0')}`;
    this.organizationCounter++;
    return id;
  }

  // ==================== 写作风格管理 ====================

  loadWritingStyle(): WritingStyle | null {
    if (!this._ensureInitialized()) {
      return null;
    }
    
    if (!this.writingStylePath || !fs.existsSync(this.writingStylePath)) {
      logger.log('📄 写作风格数据文件不存在，返回null');
      return null;
    }

    try {
      const content = fs.readFileSync(this.writingStylePath, 'utf-8');
      const data = JSON.parse(content);
      logger.log(`📖 读取写作风格数据成功: ${data.name}`);
      return data;
    } catch (error) {
      logger.log(`⚠️ 读取写作风格失败: ${error}`);
      return null;
    }
  }

  saveWritingStyle(style: WritingStyle): boolean {
    if (!this._ensureInitialized()) {
      logger.log('❌ 数据存储未初始化，无法保存写作风格数据');
      return false;
    }
    
    if (!this.writingStylePath) {
      logger.log('❌ 写作风格数据路径未设置');
      return false;
    }

    try {
      // 创建备份
      this._createBackup();
      
      fs.writeFileSync(this.writingStylePath, JSON.stringify(style, null, 2), 'utf-8');
      logger.log(`💾 写作风格已保存: ${style.name}`);
      return true;
    } catch (error) {
      logger.log(`❌ 保存写作风格失败: ${error}`);
      return false;
    }
  }

  // ==================== 项目配置管理 ====================

  loadProjectConfig(): ProjectConfig | null {
    if (!this._ensureInitialized()) {
      return null;
    }
    
    if (!this.projectConfigPath || !fs.existsSync(this.projectConfigPath)) {
      logger.log('📄 项目配置数据文件不存在，返回null');
      return null;
    }

    try {
      const content = fs.readFileSync(this.projectConfigPath, 'utf-8');
      const data = JSON.parse(content);
      logger.log(`📖 读取项目配置数据成功: ${data.title}`);
      return data;
    } catch (error) {
      logger.log(`⚠️ 读取项目配置失败: ${error}`);
      return null;
    }
  }

  saveProjectConfig(config: ProjectConfig): boolean {
    if (!this._ensureInitialized()) {
      logger.log('❌ 数据存储未初始化，无法保存项目配置数据');
      return false;
    }
    
    if (!this.projectConfigPath) {
      logger.log('❌ 项目配置数据路径未设置');
      return false;
    }

    try {
      // 创建备份
      this._createBackup();
      
      fs.writeFileSync(this.projectConfigPath, JSON.stringify(config, null, 2), 'utf-8');
      logger.log(`💾 项目配置已保存: ${config.title}`);
      return true;
    } catch (error) {
      logger.log(`❌ 保存项目配置失败: ${error}`);
      return false;
    }
  }
}

export const dataStorage = new DataStorage();