import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';
import { aiService } from './aiService';
import { dataStorage } from '../data/storage';
import { foreshadowFilterService } from './foreshadowFilterService';
import { memoryAdapterService } from './memoryAdapterService';

class ContextService {
  /**
   * 构建章节生成上下文
   * Token预算分配:
   * - 角色信息: 800 tokens
   * - 待回收伏笔: 600 tokens
   * - 世界观设定: 400 tokens
   * 总计: 1800 tokens
   * 
   * 注意: 前情回顾由 loadPreviousChaptersContent() 专门处理，不包含在此处
   */
  async buildGenerationContext(chapterNumber: number): Promise<string> {
    logger.log(`📖 构建第${chapterNumber}章生成上下文...`);

    let context = '';
    let tokenCount = 0;

    dataStorage.init(true);
    const characters = dataStorage.loadCharacters();
    logger.log(`🔍 加载角色数量: ${characters.length}`);

    if (characters.length > 0) {
      logger.log(`🔍 第一个角色名称: ${characters[0].name}`);
      logger.log(`🔍 角色数据: ${JSON.stringify(characters[0]).substring(0, 100)}`);

      let characterSection = `## 角色信息\n`;
      for (const char of characters) {
        characterSection += `**${char.name}** (${char.role})\n`;
        if (char.personality) {
          characterSection += `性格: ${this.truncate(char.personality, 100)}\n`;
        }
        if (char.mbtiPrimary) {
          characterSection += `MBTI: ${char.mbtiPrimary}`;
          if (char.mbtiSecondary) {
            characterSection += ` + ${char.mbtiSecondary}`;
          }
          characterSection += `\n`;
        }
        if (char.background) {
          characterSection += `背景: ${this.truncate(char.background, 100)}\n`;
        }
        characterSection += '\n';
      }

      logger.log(`🔍 角色上下文草稿长度: ${characterSection.length}`);
      context += characterSection;
      tokenCount += this.estimateTokens(characterSection);
      logger.log(`✅ 角色信息已添加到上下文`);
    } else {
      logger.log(`⚠️ 没有角色数据`);
    }

    // 2. 待回收伏笔(使用智能过滤) - 直接使用原始伏笔数据，跳过不必要的记忆转换
    const allForeshadows = dataStorage.loadForeshadows();
    const chapterCharacters = characters.map((c) => c.name);
    
    // 直接使用原始伏笔数据，无需转换
    const foreshadows = foreshadowFilterService.filterForeshadows(allForeshadows, {
      currentChapter: chapterNumber,
      chapterCharacters,
      maxForeshadows: 5,
      minImportance: 'medium'
    });

    if (foreshadows.length > 0) {
      let foreshadowSection = `## 需要推进的伏笔\n`;
      for (const fs of foreshadows) {
        const desc = this.truncate(fs.description, 100);
        foreshadowSection += `${fs.id}: ${desc} (第${fs.plantedChapter}章埋下, 重要性: ${fs.importance})\n`;
      }
      foreshadowSection += '\n';

      if (tokenCount + this.estimateTokens(foreshadowSection) <= 1400) {
        context += foreshadowSection;
        tokenCount += this.estimateTokens(foreshadowSection);
        logger.log(`  ✅ 加载${foreshadows.length}个优化过滤后的伏笔`);
      }
    }

    // 3. 世界观设定
    const worldSetting = dataStorage.loadWorldSetting();
    if (worldSetting) {
      let worldSection = `## 世界观设定\n`;
      if (worldSetting.timePeriod) {
        worldSection += `时代: ${worldSetting.timePeriod}\n`;
      }
      if (worldSetting.location) {
        worldSection += `地点: ${worldSetting.location}\n`;
      }
      if (worldSetting.atmosphere) {
        worldSection += `氛围: ${worldSetting.atmosphere}\n`;
      }
      if (worldSetting.rules.length > 0) {
        worldSection += `规则: ${worldSetting.rules.slice(0, 3).join('; ')}\n`;
      }
      worldSection += '\n';

      if (tokenCount + this.estimateTokens(worldSection) <= 1800) {
        context += worldSection;
        tokenCount += this.estimateTokens(worldSection);
        logger.log(`  ✅ 加载世界观设定`);
      }
    }

    logger.log(`✅ 上下文构建完成，约 ${tokenCount} tokens`);
    return context;
  }

  /**
   * 加载前置章节的摘要
   * 用于CHAPTER_GENERATION_WITH_CONTEXT模板的previous_content参数
   * 必须使用摘要而非实际内容，确保大模型不跑偏
   */
  async loadPreviousChaptersContent(chapterNumber: number, maxChapters: number = 2): Promise<string> {
    logger.log(`📖 加载前置章节摘要(最多${maxChapters}章)...`);

    const summaries = dataStorage.loadSummaries();
    const outlines = dataStorage.loadOutlines();
    
    // 获取前N章的章节号列表
    const previousChapterNumbers = Array.from({ length: chapterNumber - 1 }, (_, i) => i + 1)
      .sort((a, b) => b - a)
      .slice(0, maxChapters)
      .sort((a, b) => a - b);

    let content = '';
    let loadedCount = 0;

    for (const chapNum of previousChapterNumbers) {
      // 查找现有摘要
      let summary = summaries.find((s) => s.chapterNumber === chapNum);
      
      // 如果没有摘要，尝试基于大纲生成
      if (!summary) {
        logger.log(`⚠️ 未找到第${chapNum}章摘要，尝试基于大纲生成`);
        summary = await this._generateSummaryFromOutline(chapNum, outlines);
        
        // 如果生成成功，保存摘要
        if (summary) {
          dataStorage.addSummary(summary);
          logger.log(`✅ 成功生成第${chapNum}章摘要`);
        } else {
          logger.log(`❌ 无法生成第${chapNum}章摘要`);
          continue;
        }
      }
      
      // 生成摘要内容
      content += `\n【第${summary.chapterNumber}章：${summary.chapterTitle}】\n`;
      content += `摘要：${summary.summary}\n`;
      if (summary.mainConflict) {
        content += `主要冲突：${summary.mainConflict}\n`;
      }
      if (summary.emotionalTone) {
        content += `情感基调：${summary.emotionalTone}\n`;
      }
      content += `字数：${summary.wordCount || 0}\n`;
      logger.log(`  ✅ 加载第${summary.chapterNumber}章摘要`);
      loadedCount++;
    }

    if (loadedCount === 0) {
      logger.log('⚠️ 没有找到前置章节或无法生成摘要');
      return '';
    }

    logger.log(`✅ 前置章节摘要加载完成，共${loadedCount}章，长度: ${content.length} 字符`);
    return content;
  }

  /**
   * 基于大纲生成章节摘要
   */
  private async _generateSummaryFromOutline(chapterNumber: number, outlines: any[]): Promise<any> {
    const outline = outlines.find(o => o.chapterNumber === chapterNumber);
    if (!outline) {
      logger.log(`⚠️ 未找到第${chapterNumber}章大纲`);
      return null;
    }

    // 基于大纲内容生成简单摘要
    const summaryContent = outline.content.substring(0, 200) + (outline.content.length > 200 ? '...' : '');
    
    return {
      id: `SUM${Date.now()}`,
      chapterNumber,
      chapterTitle: outline.title,
      summary: summaryContent,
      wordCount: 0,
      keyCharacters: [],
      keyEvents: [],
      createdAt: new Date().toISOString()
    };
  }

  /**
   * 估算token数量
   * 中文约1.5字符/token, 英文约4字符/token
   */
  private estimateTokens(text: string): number {
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const otherChars = text.length - chineseChars;
    return Math.ceil(chineseChars / 1.5 + otherChars / 4);
  }

  /**
   * 截断文本
   */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.slice(0, maxLength) + '...';
  }
}

export const contextService = new ContextService();
