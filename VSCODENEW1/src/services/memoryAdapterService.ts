import { logger } from '../utils/logger';
import { dataStorage, Foreshadow, ChapterSummary, Character, Outline } from '../data/storage';

// 原项目记忆数据类型
export interface OriginalMemory {
  id: string;
  content: string;
  type: string;
  title: string;
  metadata: {
    chapter_id: string;
    chapter_number: number;
    importance_score: number;
    tags: string[];
    is_foreshadow: number;
    keyword?: string;
    text_position: number;
    text_length: number;
    related_characters?: string[];
    related_locations?: string[];
    foreshadow_type?: string;
    strength?: number;
    position_desc?: string;
  };
}

// 适配器配置
export interface MemoryAdapterConfig {
  enableCompatibility: boolean;
  autoMigrate: boolean;
  validationInterval: number;
}

/**
 * 记忆适配器服务 - 处理不同记忆系统之间的兼容性和数据迁移
 */
export class MemoryAdapterService {
  private static instance: MemoryAdapterService;
  private config: MemoryAdapterConfig;
  private migrationInProgress = false;
  private validationTimer: NodeJS.Timeout | null = null;
  private lastValidationTime = 0; // 上次验证时间
  private lastValidationResult = true; // 上次验证结果

  private constructor() {
    this.config = {
      enableCompatibility: true,
      autoMigrate: true,
      validationInterval: 60000 // 1分钟
    };
    logger.log('🧠 记忆适配器服务已初始化');
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): MemoryAdapterService {
    if (!MemoryAdapterService.instance) {
      MemoryAdapterService.instance = new MemoryAdapterService();
    }
    return MemoryAdapterService.instance;
  }

  /**
   * 更新适配器配置
   */
  public updateConfig(config: Partial<MemoryAdapterConfig>): void {
    this.config = { ...this.config, ...config };
    logger.log(`🔧 记忆适配器配置已更新: ${JSON.stringify(this.config)}`);
  }

  /**
   * 从原项目记忆转换为本地记忆格式
   */
  public convertToLocalMemory(original: OriginalMemory): any {
    try {
      const { type, content, metadata } = original;
      
      switch (type) {
        case 'hook':
          // 钩子转换为伏笔或其他类型
          return this._convertHookToLocal(original);
        
        case 'foreshadow':
          // 伏笔转换
          return this._convertForeshadowToLocal(original);
        
        case 'plot_point':
          // 情节点转换
          return this._convertPlotPointToLocal(original);
        
        case 'character_event':
          // 角色事件转换
          return this._convertCharacterEventToLocal(original);
        
        case 'chapter_summary':
          // 章节摘要转换
          return this._convertChapterSummaryToLocal(original);
        
        default:
          logger.warn(`⚠️ 未知的记忆类型: ${type}`);
          return null;
      }
    } catch (error) {
      logger.error(`❌ 转换原项目记忆失败: ${error}`);
      return null;
    }
  }

  /**
   * 从本地记忆转换为原项目记忆格式
   */
  public convertToOriginalMemory(localData: any, type: string): OriginalMemory | null {
    try {
      switch (type) {
        case 'foreshadow':
          return this._convertLocalForeshadowToOriginal(localData);
        
        case 'chapter_summary':
          return this._convertLocalSummaryToOriginal(localData);
        
        case 'character':
          return this._convertLocalCharacterToOriginal(localData);
        
        default:
          logger.warn(`⚠️ 不支持的本地记忆类型转换: ${type}`);
          return null;
      }
    } catch (error) {
      logger.error(`❌ 转换本地记忆失败: ${error}`);
      return null;
    }
  }

  /**
   * 批量迁移原项目记忆到本地存储
   */
  public async migrateOriginalMemories(originalMemories: OriginalMemory[]): Promise<{ success: number; failed: number }> {
    if (this.migrationInProgress) {
      logger.warn(`⏳ 迁移正在进行中，请勿重复调用`);
      return { success: 0, failed: 0 };
    }

    this.migrationInProgress = true;
    let successCount = 0;
    let failedCount = 0;

    logger.log(`🚚 开始迁移 ${originalMemories.length} 条原项目记忆`);

    try {
      for (const memory of originalMemories) {
        const localMemory = this.convertToLocalMemory(memory);
        if (localMemory) {
          const success = await this._saveLocalMemory(localMemory, memory.type);
          if (success) {
            successCount++;
          } else {
            failedCount++;
          }
        } else {
          failedCount++;
        }
      }

      logger.log(`✅ 记忆迁移完成: 成功 ${successCount} 条，失败 ${failedCount} 条`);
      return { success: successCount, failed: failedCount };
    } catch (error) {
      logger.error(`❌ 记忆迁移失败: ${error}`);
      return { success: successCount, failed: originalMemories.length - successCount };
    } finally {
      this.migrationInProgress = false;
    }
  }

  /**
   * 验证记忆数据一致性
   * 添加频率控制：如果距离上次验证时间小于配置的间隔，则返回上次验证结果
   */
  public validateMemoryConsistency(): boolean {
    const now = Date.now();
    
    // 检查是否在验证间隔内，如果是则返回上次结果
    if (now - this.lastValidationTime < this.config.validationInterval) {
      logger.debug(`🔍 跳过记忆数据一致性验证（上次验证时间: ${new Date(this.lastValidationTime).toISOString()}，间隔: ${this.config.validationInterval}ms）`);
      return this.lastValidationResult;
    }

    try {
      logger.log('🔍 开始验证记忆数据一致性');
      
      // 验证伏笔数据
      const foreshadows = dataStorage.loadForeshadows();
      let foreshadowIssues = 0;
      
      for (const fs of foreshadows) {
        if (!fs.id || !fs.description || !fs.keyword) {
          foreshadowIssues++;
          logger.warn(`⚠️ 伏笔数据不完整: ${fs.id}`);
        }
      }
      
      // 验证摘要数据
      const summaries = dataStorage.loadSummaries();
      let summaryIssues = 0;
      
      for (const sum of summaries) {
        if (!sum.id || !sum.chapterNumber || !sum.summary) {
          summaryIssues++;
          logger.warn(`⚠️ 摘要数据不完整: ${sum.id}`);
        }
      }
      
      // 验证角色数据
      const characters = dataStorage.loadCharacters();
      let characterIssues = 0;
      
      for (const char of characters) {
        if (!char.id || !char.name) {
          characterIssues++;
          logger.warn(`⚠️ 角色数据不完整: ${char.id}`);
        }
      }
      
      const totalIssues = foreshadowIssues + summaryIssues + characterIssues;
      
      let result = false;
      if (totalIssues === 0) {
        logger.log('✅ 记忆数据一致性验证通过，未发现问题');
        result = true;
      } else {
        logger.warn(`⚠️ 记忆数据一致性验证发现 ${totalIssues} 个问题`);
        result = false;
      }
      
      // 更新验证时间和结果
      this.lastValidationTime = now;
      this.lastValidationResult = result;
      
      return result;
    } catch (error) {
      logger.error(`❌ 记忆数据一致性验证失败: ${error}`);
      
      // 更新验证时间，但保留上次成功结果
      this.lastValidationTime = now;
      
      return this.lastValidationResult;
    }
  }

  /**
   * 启动定时验证
   */
  public startPeriodicValidation(): void {
    if (this.validationTimer) {
      clearInterval(this.validationTimer);
    }

    this.validationTimer = setInterval(() => {
      this.validateMemoryConsistency();
    }, this.config.validationInterval);

    logger.log(`⏰ 已启动记忆数据定时验证，间隔 ${this.config.validationInterval / 1000} 秒`);
  }

  /**
   * 停止定时验证
   */
  public stopPeriodicValidation(): void {
    if (this.validationTimer) {
      clearInterval(this.validationTimer);
      this.validationTimer = null;
      logger.log(`⏹️ 已停止记忆数据定时验证`);
    }
  }

  /**
   * 获取兼容性状态
   */
  public getCompatibilityStatus(): {
    enabled: boolean;
    migrationInProgress: boolean;
    validationActive: boolean;
  } {
    return {
      enabled: this.config.enableCompatibility,
      migrationInProgress: this.migrationInProgress,
      validationActive: this.validationTimer !== null
    };
  }

  /**
   * 健康检查 - 验证服务核心功能是否正常
   */
  public healthCheck(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // 检查服务是否正常运行
        const status = this.getCompatibilityStatus();
        
        // 检查核心功能是否正常工作
        const testMemory: OriginalMemory = {
          id: 'test-123',
          content: '测试伏笔内容',
          type: 'foreshadow',
          title: '测试伏笔',
          metadata: {
            chapter_id: 'test-chapter-1',
            chapter_number: 1,
            importance_score: 0.7,
            tags: ['测试', '伏笔'],
            is_foreshadow: 1,
            keyword: '测试',
            text_position: 0,
            text_length: 10,
            related_characters: ['测试角色'],
            foreshadow_type: '测试类型',
            strength: 7
          }
        };
        
        // 测试转换功能
        const converted = this.convertToLocalMemory(testMemory);
        
        // 验证服务状态和核心功能
        // 由于我们改为按需验证，不再要求validationActive为true
        const isHealthy = !this.migrationInProgress && !!converted;
        
        if (isHealthy) {
          logger.debug('✅ 记忆适配器服务健康检查通过');
          resolve(true);
        } else {
          logger.warn(`⚠️ 记忆适配器服务健康检查失败: 迁移中=${this.migrationInProgress}, 转换功能=${!!converted}`);
          resolve(false);
        }
      } catch (error) {
        logger.error(`❌ 记忆适配器服务健康检查异常: ${error}`);
        resolve(false);
      }
    });
  }

  // ==================== 私有转换方法 ====================

  private _convertHookToLocal(hook: OriginalMemory): Foreshadow | null {
    if (hook.metadata.is_foreshadow === 1) {
      // 转换为伏笔
      return {
        id: dataStorage.generateForeshadowId(),
        description: hook.content,
        status: 'pending',
        importance: hook.metadata.strength && hook.metadata.strength >= 7 ? 'high' : 
                  hook.metadata.strength && hook.metadata.strength >= 5 ? 'medium' : 'low',
        plantedChapter: hook.metadata.chapter_number,
        relatedCharacters: hook.metadata.related_characters || [],
        keyword: hook.metadata.keyword || '',
        notes: [
          `强度: ${hook.metadata.strength || 5}/10`,
          `位置: ${hook.metadata.position_desc || '未知'}`
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
    return null;
  }

  private _convertForeshadowToLocal(foreshadow: OriginalMemory): Foreshadow {
    return {
      id: dataStorage.generateForeshadowId(),
      description: foreshadow.content,
      status: foreshadow.metadata.is_foreshadow === 2 ? 'resolved' : 'pending',
      importance: foreshadow.metadata.strength && foreshadow.metadata.strength >= 7 ? 'high' : 
                foreshadow.metadata.strength && foreshadow.metadata.strength >= 5 ? 'medium' : 'low',
      plantedChapter: foreshadow.metadata.chapter_number,
      resolvedChapter: foreshadow.metadata.is_foreshadow === 2 ? foreshadow.metadata.chapter_number : undefined,
      relatedCharacters: foreshadow.metadata.related_characters || [],
      keyword: foreshadow.metadata.keyword || '',
      notes: [
        `强度: ${foreshadow.metadata.strength || 5}/10`,
        `类型: ${foreshadow.metadata.foreshadow_type || '未知'}`
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  private _convertPlotPointToLocal(plotPoint: OriginalMemory): ChapterSummary | null {
    // 情节点可用于丰富章节摘要
    const existingSummaries = dataStorage.loadSummaries();
    const existingSummary = existingSummaries.find(
      s => s.chapterNumber === plotPoint.metadata.chapter_number
    );

    if (existingSummary) {
      // 更新现有摘要
      existingSummary.keyEvents.push(plotPoint.content);
      // 去重
      existingSummary.keyEvents = [...new Set(existingSummary.keyEvents)];
      return existingSummary;
    }
    return null;
  }

  private _convertCharacterEventToLocal(characterEvent: OriginalMemory): Character | null {
    const characters = dataStorage.loadCharacters();
    const charName = characterEvent.metadata.related_characters?.[0];
    
    if (!charName) return null;
    
    const existingChar = characters.find(c => c.name === charName);
    if (existingChar) {
      // 更新现有角色的背景或描述
      existingChar.background += `\n${characterEvent.content}`;
      return existingChar;
    }
    return null;
  }

  private _convertChapterSummaryToLocal(chapterSummary: OriginalMemory): ChapterSummary {
    return {
      id: dataStorage.generateSummaryId(),
      chapterNumber: chapterSummary.metadata.chapter_number,
      chapterTitle: chapterSummary.title || `第${chapterSummary.metadata.chapter_number}章`,
      summary: chapterSummary.content,
      wordCount: chapterSummary.metadata.text_length || 0,
      keyCharacters: chapterSummary.metadata.related_characters || [],
      keyEvents: [],
      mainConflict: '',
      emotionalTone: '',
      paceLevel: 'moderate',
      createdAt: new Date().toISOString()
    };
  }

  private _convertLocalForeshadowToOriginal(foreshadow: Foreshadow): OriginalMemory {
    return {
      id: foreshadow.id,
      content: foreshadow.description,
      type: 'foreshadow',
      title: foreshadow.status === 'resolved' ? '回收伏笔' : '埋下伏笔',
      metadata: {
        chapter_id: foreshadow.id,
        chapter_number: foreshadow.plantedChapter,
        importance_score: foreshadow.importance === 'high' ? 0.8 : 
                         foreshadow.importance === 'medium' ? 0.6 : 0.4,
        tags: ['伏笔', foreshadow.status],
        is_foreshadow: foreshadow.status === 'resolved' ? 2 : 1,
        keyword: foreshadow.keyword,
        text_position: -1,
        text_length: foreshadow.description.length,
        related_characters: foreshadow.relatedCharacters,
        foreshadow_type: foreshadow.status,
        strength: foreshadow.importance === 'high' ? 8 : 
                 foreshadow.importance === 'medium' ? 6 : 4
      }
    };
  }

  private _convertLocalSummaryToOriginal(summary: ChapterSummary): OriginalMemory {
    return {
      id: summary.id,
      content: summary.summary,
      type: 'chapter_summary',
      title: summary.chapterTitle,
      metadata: {
        chapter_id: summary.id,
        chapter_number: summary.chapterNumber,
        importance_score: 0.6,
        tags: ['摘要', '章节概览', summary.chapterTitle],
        is_foreshadow: 0,
        text_position: 0,
        text_length: summary.summary.length,
        related_characters: summary.keyCharacters
      }
    };
  }

  private _convertLocalCharacterToOriginal(character: Character): OriginalMemory {
    return {
      id: character.id,
      content: `${character.name}: ${character.description}\n性格: ${character.personality}\n背景: ${character.background}`,
      type: 'character_event',
      title: `${character.name}的角色信息`,
      metadata: {
        chapter_id: '',
        chapter_number: 0,
        importance_score: 0.7,
        tags: ['角色', character.name, character.role],
        is_foreshadow: 0,
        text_position: -1,
        text_length: character.description.length,
        related_characters: [character.name]
      }
    };
  }

  // ==================== 私有辅助方法 ====================

  private async _saveLocalMemory(localMemory: any, originalType: string): Promise<boolean> {
    try {
      switch (originalType) {
        case 'hook':
        case 'foreshadow':
          return dataStorage.addForeshadow(localMemory as Foreshadow);
        
        case 'chapter_summary':
          return dataStorage.addSummary(localMemory as ChapterSummary);
        
        case 'character_event':
          if (localMemory.id) {
            // 更新现有角色
            const characters = dataStorage.loadCharacters();
            const index = characters.findIndex(c => c.id === localMemory.id);
            if (index !== -1) {
              characters[index] = localMemory as Character;
              return dataStorage.saveCharacters(characters);
            }
          }
          return dataStorage.addCharacter(localMemory as Character);
        
        case 'plot_point':
          // 情节点用于更新章节摘要
          if (localMemory.id) {
            return dataStorage.addSummary(localMemory as ChapterSummary);
          }
          return true;
        
        default:
          logger.warn(`⚠️ 无法保存未知类型的本地记忆: ${originalType}`);
          return false;
      }
    } catch (error) {
      logger.error(`❌ 保存本地记忆失败: ${error}`);
      return false;
    }
  }
}

// 导出单例实例
export const memoryAdapterService = MemoryAdapterService.getInstance();
