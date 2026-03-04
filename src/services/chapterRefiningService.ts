/**
 * 文章精修服务 - 调用AI进行精修
 */

import * as vscode from 'vscode';
import { aiService } from './aiService';
import { refiningTemplateService } from './refiningTemplateService';
import { RefiningRequest, RefiningResult, RefiningResponse, ChangeLog } from '../types/refining';
import { logger } from '../utils/logger';

export class ChapterRefiningService {
  /**
   * 执行文章精修
   */
  public async refineChapter(request: RefiningRequest): Promise<RefiningResult> {
    logger.log(`▶ 开始精修章节，选择了 ${request.templateIds.length} 个模板`);

    const { isEntitledSync, PRO_FEATURE_REQUIRED_MESSAGE } = require('../auth/verify');
    if (!isEntitledSync('refine')) {
      throw new Error(PRO_FEATURE_REQUIRED_MESSAGE);
    }

    try {
      // 合并模板提示词
      const mergedPrompt = refiningTemplateService.mergeTemplatePrompts(request.templateIds);

      // 构建AI提示
      const systemPrompt = `你是一位专业的网络文学编辑，拥有丰富的小说精修经验。
你的任务是根据用户提供的精修方向，对章节内容进行精修和优化。

【输出格式要求】
1. 直接输出修改后的完整文本，不要添加任何标注或说明
2. 保持原文的核心意思和作者的独特声音
3. 修改要有说服力和质量，不能删除关键信息
4. 在文章**末尾**用空行分隔后，添加简洁的修改总结

【修改总结格式】（放在文章末尾）
---
【精修总结】
总修改处：X处
主要改进：
- 已完成全文润色
- 已修改逻辑问题X处
- 已优化对话X处
- 已调整节奏X处
（根据实际修改内容简要列出）`;

      const userMessage = `【要精修的文本】
\`\`\`
${request.chapterText}
\`\`\`

【精修要求】
小说类别：${this._getCategoryName(request.novelCategory)}

${mergedPrompt}

请根据上述要求对文本进行精修。`;

      // 调用AI
      logger.log('📡 调用AI服务进行精修...');
      const refinedText = await aiService.callChat(systemPrompt, userMessage);
      
      if (!refinedText) {
        throw new Error('AI服务返回空结果');
      }

      // 生成修改结果
      const result: RefiningResult = {
        originalText: request.chapterText,
        refinedText: refinedText,
        changes: this._extractChanges(refinedText),
        statistics: {
          originalLength: request.chapterText.length,
          refinedLength: this._extractActualTextLength(refinedText),
          changeCount: this._extractChangeCount(refinedText),
          estimatedTime: request.templateIds.reduce(
            (sum, id) => {
              const template = refiningTemplateService.getTemplateById(id);
              return sum + (template?.estimatedTime || 0);
            },
            0
          ),
        },
        timestamp: Date.now(),
      };

      logger.log(`✓ 精修完成: 字数变化 ${request.chapterText.length} → ${result.statistics.refinedLength}，修改 ${result.statistics.changeCount} 处`);
      return result;
    } catch (error) {
      logger.error(`❌ 精修失败: ${error}`);
      throw error;
    }
  }

  /**
   * 应用精修结果到编辑器
   */
  public async applyRefinements(editor: vscode.TextEditor, refinedText: string): Promise<void> {
    try {
      const document = editor.document;
      
      // 创建文档全部内容的范围
      const fullRange = new vscode.Range(
        new vscode.Position(0, 0),
        new vscode.Position(document.lineCount, 0)
      );

      // 使用 edit 接口替换全部文本
      const success = await editor.edit(editBuilder => {
        editBuilder.replace(fullRange, refinedText);
      });

      if (!success) {
        throw new Error('编辑器编辑失败，可能是文件只读或其他权限问题');
      }

      logger.log('✓ 精修结果已应用到文件');
    } catch (error) {
      logger.error(`❌ 应用精修结果失败: ${error}`);
      throw error;
    }
  }

  /**
   * 获取分类的中文名称
   */
  private _getCategoryName(category: string): string {
    const categoryConfig = refiningTemplateService.getCategoryConfig(category as any);
    return categoryConfig?.name || category;
  }

  /**
   * 提取实际文本长度（排除总结部分）
   */
  private _extractActualTextLength(refinedText: string): number {
    // 查找分隔线和总结位置
    const separatorIndex = refinedText.indexOf('\n---\n【精修总结】');
    if (separatorIndex === -1) {
      // 尝试旧格式
      const oldIndex = refinedText.indexOf('\n---\n## 精修总结');
      if (oldIndex === -1) {
        return refinedText.length;
      }
      return oldIndex;
    }
    return separatorIndex;
  }

  /**
   * 从总结中提取修改数量
   */
  private _extractChangeCount(refinedText: string): number {
    // 尝试从总结中提取
    const match = refinedText.match(/总修改处[：:]\s*(\d+)\s*处/);
    if (match) {
      return parseInt(match[1], 10);
    }
    // 如果没有总结，返回 0
    return 0;
  }

  /**
   * 提取修改详情列表
   */
  private _extractChanges(refinedText: string): ChangeLog[] {
    const changes: ChangeLog[] = [];
    
    // 从新格式总结中提取主要改进
    const summarySection = refinedText.match(/主要改进[：:]\s*\n([\s\S]*?)(?:\n---|\'$)/m);
    if (summarySection) {
      const items = summarySection[1].match(/^\s*-\s*(.+)$/gm);
      if (items) {
        let position = 0;
        items.forEach(item => {
          const description = item.replace(/^\s*-\s*/, '').trim();
          if (description) {
            // 根据描述判断修改类型
            let type: 'add' | 'delete' | 'modify' = 'modify';
            let reason = '优化';
            
            if (description.includes('润色') || description.includes('文笔')) {
              reason = '文笔优化';
            } else if (description.includes('逻辑')) {
              reason = '逻辑修正';
            } else if (description.includes('对话')) {
              reason = '对话优化';
            } else if (description.includes('节奏')) {
              reason = '节奏调整';
            }
            
            changes.push({
              type,
              position: position++,
              original: '',
              refined: description,
              reason
            });
          }
        });
      }
    }
    
    return changes;
  }

  /**
   * 统计修改数量（旧方法，保留作为后备）
   */
  // 已移除旧的统计方法 `_countChanges`（由 _extractChangeCount 替代）。
}

// 导出单例
export const chapterRefiningService = new ChapterRefiningService();
