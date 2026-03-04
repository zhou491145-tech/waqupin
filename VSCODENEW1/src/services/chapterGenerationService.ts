import * as path from 'path';
import { logger } from '../utils/logger';
import { aiService } from './aiService';
import { contextService } from './contextService';
import { dataStorage } from '../data/storage';
import { promptTemplateService } from './promptTemplateService';
import { writingStylesService } from './writingStylesService';
import { fileManagementService } from './fileManagementService';

let vscode: any = null;
try {
  vscode = require('vscode');
} catch (error) {
}

export interface ChapterGenerationOptions {
  chapterNumber: number;
  chapterGoal: string;
  paceLevel: number;
  selectedForeshadows: string[];
}

export interface ChapterGenerationResult {
  success: boolean;
  chapterNumber: number;
  fileName?: string;
  wordCount?: number;
  error?: string;
}

class ChapterGenerationService {
  private readonly SYSTEM_PROMPT = `你是一位专业的小说作家，擅长根据上下文和大纲创作章节。

核心创作原则：
1. **剧情连贯性（最重要）**：
   - 必须承接前面章节的剧情发展
   - 注意角色状态、情节进展、时间线的连续性
   - 不能出现与前文矛盾的内容
   - 自然过渡，避免突兀的跳跃

2. **防止内容重复（关键）**：
   - 仔细阅读提供的上下文内容，绝对不要重复叙述已经发生的事件
   - 本章必须从新的情节点开始，不要重新描述上一章的场景或对话
   - 如果上一章以某个动作或对话结束，本章应该从紧接着的下一个动作或反应开始
   - 角色状态应该延续而非重置，不要让角色重新经历上一章已经经历的心理过程
   - 场景转换要明确，如果是同一场景的延续，要从不同的视角或新的细节切入

3. **情节推进**：
   - 严格按照本章大纲展开情节
   - 推动故事向前发展，不要原地踏步
   - 保持与全书大纲的一致性
   - 确保本章有独特的叙事价值，而非前章内容的重复

4. **角色一致性**：
   - 符合角色性格设定
   - 延续角色在前文中的成长和变化
   - 保持角色关系的连贯性

5. **写作风格**：
   - 使用指定的叙事视角
   - 符合要求的字数
   - 语言自然流畅，避免AI痕迹
   - 体现世界观特色

6. **承上启下**：
   - 开头自然衔接上一章结尾（但不重复上一章内容）
   - 结尾为下一章做好铺垫

7. **记忆系统使用指南**：
   - **角色信息**：确保角色行为符合其性格设定和发展轨迹
   - **伏笔推进**：适当时机可以推进或回收伏笔，制造呼应效果
   - **世界观设定**：遵循世界规则和氛围基调
   - **重要情节点**：与关键剧情保持一致`;

  async generateChapter(options: ChapterGenerationOptions): Promise<ChapterGenerationResult> {
    logger.info(`📝 开始生成第${options.chapterNumber}章`);

    try {
      const apiConfigured = aiService.loadConfig();
      if (!apiConfigured) {
        return {
          success: false,
          chapterNumber: options.chapterNumber,
          error: '请先配置 API 并执行"测试 API 连接"命令'
        };
      }

      logger.info(
        `🎯 生成参数 | 目标: ${options.chapterGoal || '延续剧情发展'} | 节奏: ${options.paceLevel}/5 | 伏笔: ${options.selectedForeshadows.length} 个`
      );

      const context = await contextService.buildGenerationContext(options.chapterNumber);
      logger.info(`✅ 上下文构建完成，长度: ${context.length} 字符`);

      const chapterOutlineContent = await this._buildChapterOutline(options.chapterNumber);
      const foreshadowContext = this._buildForeshadowContext(options.selectedForeshadows);
      const previousContent = await contextService.loadPreviousChaptersContent(options.chapterNumber, 2);
      
      logger.info(`📖 前置章节摘要长度: ${previousContent.length} 字符`);

      const projectConfig = dataStorage.loadProjectConfig();
      const worldSetting = dataStorage.loadWorldSetting();
      const currentOutline = dataStorage.loadOutlines().find((o) => o.chapterNumber === options.chapterNumber);
      const chapterTitle = currentOutline ? currentOutline.title : `第${options.chapterNumber}章`;

      const templateParams = {
        title: projectConfig?.title || '未知书名',
        theme: projectConfig?.theme || '未知主题',
        genre: projectConfig?.genre || '未知类型',
        narrative_perspective: projectConfig?.narrativePerspective || '第三人称',
        time_period: worldSetting?.timePeriod || '现代',
        location: worldSetting?.location || '未知',
        atmosphere: worldSetting?.atmosphere || '未知',
        rules: worldSetting?.rules?.join('; ') || '未知',
        characters_info: context || '暂无角色信息',
        previous_content: previousContent || '暂无前置章节内容',
        chapter_number: options.chapterNumber,
        chapter_title: chapterTitle,
        chapter_outline: chapterOutlineContent,
        chapter_goal: options.chapterGoal || '延续剧情发展',
        target_word_count: projectConfig?.targetWordCount?.toString() || '2500'
      };

      const basePrompt = promptTemplateService.format('CHAPTER_GENERATION_WITH_CONTEXT', templateParams) || '';
      const finalPrompt = writingStylesService.applyStyleToPrompt(basePrompt, templateParams);

      logger.info('📄 使用提示词模板: CHAPTER_GENERATION_WITH_CONTEXT');
      logger.info(`📏 系统提示词长度: ${this.SYSTEM_PROMPT.length} 字符（内容已省略）`);

      // 1. 先创建文件并写入标题
      const initResult = await this._saveChapter(options.chapterNumber, chapterTitle, '');
      if (!initResult.success || !initResult.fileName || !initResult.filePath) {
        return {
          success: false,
          chapterNumber: options.chapterNumber,
          error: initResult.error || '初始化文件失败'
        };
      }

      // 2. 打开文件
      let editor: any = null;
      if (vscode) {
        try {
          const doc = await vscode.workspace.openTextDocument(initResult.filePath);
          editor = await vscode.window.showTextDocument(doc);
        } catch (e) {
          logger.error(`无法打开文件: ${initResult.filePath}, 错误: ${e}`);
        }
      }

      // 3. 流式调用并写入
      let editPromise = Promise.resolve();
      
      const result = await aiService.streamChat(this.SYSTEM_PROMPT, finalPrompt, (chunk) => {
        if (editor) {
          // 确保编辑操作串行执行
          editPromise = editPromise.then(async () => {
            try {
              await editor.edit((editBuilder: any) => {
                const lastLine = editor.document.lineAt(editor.document.lineCount - 1);
                const position = lastLine.range.end;
                editBuilder.insert(position, chunk);
              });
              
              // 自动滚动到底部
              const lastLine = editor.document.lineAt(editor.document.lineCount - 1);
              editor.revealRange(lastLine.range);
            } catch (e) {
              logger.error(`写入编辑器失败: ${e}`);
            }
          });
        }
      });

      if (!result) {
        return {
          success: false,
          chapterNumber: options.chapterNumber,
          error: 'AI生成失败，请查看输出面板'
        };
      }

      // 等待所有编辑完成
      await editPromise;

      logger.log(`✅ 第${options.chapterNumber}章生成完成，文件: ${initResult.fileName}`);
      return {
        success: true,
        chapterNumber: options.chapterNumber,
        fileName: initResult.fileName,
        wordCount: result.length
      };

    } catch (error: any) {
      logger.log(`❌ 章节生成失败: ${error?.message ?? String(error)}`);
      return {
        success: false,
        chapterNumber: options.chapterNumber,
        error: error?.message ?? '未知错误'
      };
    }
  }

  private async _buildChapterOutline(chapterNumber: number): Promise<string> {
    const outlines = dataStorage.loadOutlines();
    const currentOutline = outlines.find((o) => o.chapterNumber === chapterNumber);

    if (!currentOutline) {
      logger.log('⚠️ 未找到当前章节大纲');
      return '暂无大纲';
    }

    let content = `【当前章节】第${chapterNumber}章：${currentOutline.title}\n${currentOutline.content}\n\n`;

    const futureOutlines = outlines
      .filter((o) => o.chapterNumber && o.chapterNumber > chapterNumber && o.chapterNumber <= chapterNumber + 3)
      .sort((a, b) => (a.chapterNumber || 0) - (b.chapterNumber || 0));

    if (futureOutlines.length > 0) {
      content += '【后续章节大纲参考】\n';
      for (const outline of futureOutlines) {
        content += `第${outline.chapterNumber}章：${outline.title}\n${outline.content}\n\n`;
      }
      logger.log(`✅ 加载当前章节及后${futureOutlines.length}章大纲`);
    } else {
      logger.log('⚠️ 未找到后续章节大纲');
    }

    return content;
  }

  private _buildForeshadowContext(selectedForeshadows: string[]): string {
    if (selectedForeshadows.length === 0) {
      return '';
    }

    const allForeshadows = dataStorage.loadForeshadows();
    const selected = allForeshadows.filter(f => selectedForeshadows.includes(f.id));

    return '\n\n### 本章需要处理的伏笔：\n' + 
      selected.map(f => `- ${f.keyword}（第${f.plantedChapter}章埋下）: ${f.description}`).join('\n');
  }

  private async _saveChapter(chapterNumber: number, chapterTitle: string, content: string): Promise<{ success: boolean; fileName?: string; filePath?: string; error?: string }> {
    try {
      const fullContent = `# 第${chapterNumber}章 ${chapterTitle}\n\n${content}`;
      
      // 使用文件管理服务生成章节文件
      const filePath = await fileManagementService.generateChapterFile({
        chapterNumber,
        title: chapterTitle,
        content: fullContent
      });
      
      if (filePath) {
        return {
          success: true,
          fileName: path.basename(filePath),
          filePath: filePath // Return full path
        };
      } else {
        return {
          success: false,
          error: '文件管理服务生成文件失败'
        };
      }
    } catch (error: any) {
      logger.log(`❌ 保存章节失败: ${error?.message ?? String(error)}`);
      return {
        success: false,
        error: error?.message ?? '保存文件失败'
      };
    }
  }

  getNextChapterNumber(): number {
    const summaries = dataStorage.loadSummaries();
    if (summaries.length === 0) {
      return 1;
    }
    const maxChapter = Math.max(...summaries.map(s => s.chapterNumber));
    return maxChapter + 1;
  }
}

export const chapterGenerationService = new ChapterGenerationService();
