/**
 * DataStorage V2 - 基于新仓库架构的数据存储层
 * 保持向后兼容 API，但内部使用新的仓库系统
 */
import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../utils/logger';
import { registerRepositories, createDataAccessLayer, DataAccessLayer } from '../repositories/DataAccessLayer';
import {
  Foreshadow,
  Character,
  ChapterSummary,
  Outline,
  WorldSetting,
  Organization,
  WritingStyle,
  ProjectConfig,
  CharacterTimeline,
  CharacterRelationship,
  CharacterHistory,
  CharacterAttribute
} from './storage';

let vscode: any = null;
try {
  vscode = require('vscode');
} catch (error) {
  // 测试环境下可能没有 vscode 模块
}

/**
 * DataStorage V2
 * 使用新的仓库系统，提供缓存和事件驱动的失效机制
 */
class DataStorageV2 {
  private workspaceRoot: string | null = null;
  private dataDir: string | null = null;
  private dataAccess: DataAccessLayer | null = null;

  // 计数器（保持向后兼容）
  private foreshadowCounter = 1;
  private summaryCounter = 1;
  private organizationCounter = 1;
  private outlineCounter = 1;
  private timelineCounter = 1;
  private relationshipCounter = 1;
  private historyCounter = 1;
  private attributeCounter = 1;

  // 备份节流
  private lastBackupTime = 0;
  private readonly backupInterval = 30000; // 30秒

  /**
   * 初始化数据存储
   */
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

    const dataDir = path.join(workspaceRoot, '.novel-assistant');
    logger.log(`📂 初始化数据存储 V2 - 工作区: ${workspaceRoot}, 数据目录: ${dataDir}`);

    // 如果需要重新初始化
    if (forceReinit || this.dataDir !== dataDir || this.workspaceRoot !== workspaceRoot) {
      this.workspaceRoot = workspaceRoot;
      this.dataDir = dataDir;

      // 确保数据目录存在
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
        logger.log(`✅ 创建数据目录: ${this.dataDir}`);
      }

      // 注册所有仓库到 DI 容器（仅一次）
      if (!this.dataAccess) {
        registerRepositories();
        this.dataAccess = createDataAccessLayer();
      }

      // 初始化所有仓库
      this.dataAccess.initAll(this.dataDir);

      // 重新加载计数器
      this._reloadCounters();

      logger.log('✅ 数据存储 V2 初始化完成');
    }

    return true;
  }

  /**
   * 确保已初始化
   */
  private _ensureInitialized(): boolean {
    if (!this.dataAccess || !this.dataDir) {
      logger.warn('数据存储未初始化，尝试自动初始化');
      return this.init();
    }
    return true;
  }

  /**
   * 重新加载计数器
   */
  private _reloadCounters(): void {
    if (!this._ensureInitialized()) return;

    // 伏笔计数器
    const foreshadows = this.dataAccess!.foreshadows.loadAll();
    if (foreshadows.length > 0) {
      const maxId = Math.max(...foreshadows.map(f => {
        const match = f.id.match(/^F(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      }));
      this.foreshadowCounter = maxId + 1;
    }

    // 摘要计数器
    const summaries = this.dataAccess!.summaries.loadAll();
    if (summaries.length > 0) {
      const maxId = Math.max(...summaries.map(s => {
        const match = s.id.match(/^SUM(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      }));
      this.summaryCounter = maxId + 1;
    }

    // 组织计数器
    const orgs = this.dataAccess!.organizations.loadAll();
    if (orgs.length > 0) {
      const maxId = Math.max(...orgs.map(o => {
        const match = o.id.match(/^ORG(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      }));
      this.organizationCounter = maxId + 1;
    }

    // 其他计数器类似处理...
  }

  // ==================== 伏笔管理 ====================
  
  loadForeshadows(): Foreshadow[] {
    if (!this._ensureInitialized()) return [];
    return this.dataAccess!.foreshadows.loadAll();
  }

  saveForeshadows(foreshadows: Foreshadow[]): boolean {
    if (!this._ensureInitialized()) return false;
    return this.dataAccess!.foreshadows.saveAll(foreshadows);
  }

  addForeshadow(foreshadow: Foreshadow): boolean {
    if (!this._ensureInitialized()) return false;
    return this.dataAccess!.foreshadows.add(foreshadow);
  }

  updateForeshadow(id: string, updates: Partial<Foreshadow>): boolean {
    if (!this._ensureInitialized()) return false;
    return this.dataAccess!.foreshadows.update(id, updates);
  }

  deleteForeshadow(id: string): boolean {
    if (!this._ensureInitialized()) return false;
    return this.dataAccess!.foreshadows.delete(id);
  }

  // ==================== 角色管理 ====================
  
  loadCharacters(): Character[] {
    if (!this._ensureInitialized()) return [];
    return this.dataAccess!.characters.loadAll();
  }

  saveCharacters(characters: Character[]): boolean {
    if (!this._ensureInitialized()) return false;
    return this.dataAccess!.characters.saveAll(characters);
  }

  addCharacter(character: Character): boolean {
    if (!this._ensureInitialized()) return false;
    return this.dataAccess!.characters.add(character);
  }

  updateCharacter(id: string, updates: Partial<Character>): boolean {
    if (!this._ensureInitialized()) return false;
    return this.dataAccess!.characters.update(id, updates);
  }

  deleteCharacter(id: string): boolean {
    if (!this._ensureInitialized()) return false;
    return this.dataAccess!.characters.delete(id);
  }

  // ==================== 章节摘要管理 ====================
  
  loadSummaries(): ChapterSummary[] {
    if (!this._ensureInitialized()) return [];
    return this.dataAccess!.summaries.loadAll();
  }

  saveSummaries(summaries: ChapterSummary[]): boolean {
    if (!this._ensureInitialized()) return false;
    return this.dataAccess!.summaries.saveAll(summaries);
  }

  addSummary(summary: ChapterSummary): boolean {
    if (!this._ensureInitialized()) return false;
    return this.dataAccess!.summaries.add(summary);
  }

  // ==================== 大纲管理 ====================
  
  loadOutlines(): Outline[] {
    if (!this._ensureInitialized()) return [];
    return this.dataAccess!.outlines.loadAll();
  }

  saveOutlines(outlines: Outline[]): boolean {
    if (!this._ensureInitialized()) return false;
    return this.dataAccess!.outlines.saveAll(outlines);
  }

  // ==================== 世界观设定 ====================
  
  loadWorldSetting(): WorldSetting | null {
    if (!this._ensureInitialized()) return null;
    return this.dataAccess!.worldSettings.getMain() || null;
  }

  saveWorldSetting(setting: WorldSetting): boolean {
    if (!this._ensureInitialized()) return false;
    return this.dataAccess!.worldSettings.saveMain(setting);
  }

  // ==================== 组织/势力管理 ====================
  
  loadOrganizations(): Organization[] {
    if (!this._ensureInitialized()) return [];
    return this.dataAccess!.organizations.loadAll();
  }

  saveOrganizations(orgs: Organization[]): boolean {
    if (!this._ensureInitialized()) return false;
    return this.dataAccess!.organizations.saveAll(orgs);
  }

  // ==================== 写作风格管理 ====================
  
  loadWritingStyle(): WritingStyle | null {
    if (!this._ensureInitialized()) return null;
    const active = this.dataAccess!.writingStyles.getActive();
    return active || null;
  }

  saveWritingStyle(style: WritingStyle): boolean {
    if (!this._ensureInitialized()) return false;
    const existing = this.dataAccess!.writingStyles.findById(style.id);
    if (existing) {
      return this.dataAccess!.writingStyles.update(style.id, style);
    } else {
      return this.dataAccess!.writingStyles.add(style);
    }
  }

  // ==================== 项目配置管理 ====================
  
  loadProjectConfig(): ProjectConfig | null {
    if (!this._ensureInitialized()) return null;
    return this.dataAccess!.projectConfigs.getMain() || null;
  }

  saveProjectConfig(config: ProjectConfig): boolean {
    if (!this._ensureInitialized()) return false;
    return this.dataAccess!.projectConfigs.saveMain(config);
  }

  // ==================== 角色时间线 ====================
  
  loadCharacterTimelines(): CharacterTimeline[] {
    if (!this._ensureInitialized()) return [];
    return this.dataAccess!.characterTimelines.loadAll();
  }

  saveCharacterTimelines(timelines: CharacterTimeline[]): boolean {
    if (!this._ensureInitialized()) return false;
    return this.dataAccess!.characterTimelines.saveAll(timelines);
  }

  // ==================== 角色关系 ====================
  
  loadCharacterRelationships(): CharacterRelationship[] {
    if (!this._ensureInitialized()) return [];
    return this.dataAccess!.characterRelationships.loadAll();
  }

  saveCharacterRelationships(relationships: CharacterRelationship[]): boolean {
    if (!this._ensureInitialized()) return false;
    return this.dataAccess!.characterRelationships.saveAll(relationships);
  }

  // ==================== 角色历史 ====================
  
  loadCharacterHistory(): CharacterHistory[] {
    if (!this._ensureInitialized()) return [];
    return this.dataAccess!.characterHistories.loadAll();
  }

  saveCharacterHistory(histories: CharacterHistory[]): boolean {
    if (!this._ensureInitialized()) return false;
    return this.dataAccess!.characterHistories.saveAll(histories);
  }

  // ==================== 角色属性 ====================
  
  loadCharacterAttributes(): CharacterAttribute[] {
    if (!this._ensureInitialized()) return [];
    return this.dataAccess!.characterAttributes.loadAll();
  }

  saveCharacterAttributes(attributes: CharacterAttribute[]): boolean {
    if (!this._ensureInitialized()) return false;
    return this.dataAccess!.characterAttributes.saveAll(attributes);
  }

  // ==================== 计数器生成 ====================
  
  generateForeshadowId(): string {
    return `F${this.foreshadowCounter++}`;
  }

  generateSummaryId(): string {
    return `SUM${this.summaryCounter++}`;
  }

  generateOrganizationId(): string {
    return `ORG${this.organizationCounter++}`;
  }

  generateOutlineId(): string {
    return `OUT${this.outlineCounter++}`;
  }

  generateTimelineId(): string {
    return `TL${this.timelineCounter++}`;
  }

  generateRelationshipId(): string {
    return `REL${this.relationshipCounter++}`;
  }

  generateHistoryId(): string {
    return `HIST${this.historyCounter++}`;
  }

  generateAttributeId(): string {
    return `ATTR${this.attributeCounter++}`;
  }

  // ==================== 缓存失效（事件驱动）====================
  
  invalidateCacheByFile(fileName: string): void {
    if (!this._ensureInitialized()) return;
    this.dataAccess!.invalidateCacheByFile(fileName);
  }

  clearAllCaches(): void {
    if (!this._ensureInitialized()) return;
    this.dataAccess!.clearAllCaches();
  }

  // ==================== 备份 ====================
  
  backupData(): boolean {
    const now = Date.now();
    if (now - this.lastBackupTime < this.backupInterval) {
      logger.debug('备份操作过于频繁，跳过');
      return false;
    }

    if (!this.dataDir) {
      logger.warn('数据目录未初始化，无法备份');
      return false;
    }

    try {
      const backupDir = path.join(this.dataDir, 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupDir, `backup-${timestamp}.json`);

      const data = {
        foreshadows: this.loadForeshadows(),
        characters: this.loadCharacters(),
        summaries: this.loadSummaries(),
        outlines: this.loadOutlines(),
        worldSetting: this.loadWorldSetting(),
        organizations: this.loadOrganizations(),
        writingStyle: this.loadWritingStyle(),
        projectConfig: this.loadProjectConfig()
      };

      fs.writeFileSync(backupFile, JSON.stringify(data, null, 2), 'utf-8');
      this.lastBackupTime = now;
      logger.log(`✅ 数据已备份: ${backupFile}`);
      return true;
    } catch (error) {
      logger.error(`备份数据失败: ${error}`);
      return false;
    }
  }
}

/**
 * 全局单例实例（保持向后兼容）
 */
export const dataStorageV2 = new DataStorageV2();
