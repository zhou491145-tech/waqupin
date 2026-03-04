/**
 * 提示词模板管理服务
 * 负责加载、保存、合并用户自定义模板和系统默认模板
 */

import * as fs from 'fs';
import * as path from 'path';
import { PromptTemplate, SYSTEM_PROMPTS, formatPrompt, getSystemPrompt } from './promptTemplates';
import { logger } from '../utils/logger';

let vscode: any = null;
try {
  vscode = require('vscode');
} catch (error) {
}

export interface UserPromptTemplate extends PromptTemplate {
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
}

class PromptTemplateService {
  private customPromptsPath: string = '';
  private userPrompts: Map<string, UserPromptTemplate> = new Map();
  private initialized: boolean = false;

  /**
   * 初始化服务
   */
  init(workspaceRoot?: string): boolean {
    try {
      logger.debug('🔧 开始初始化提示词模板服务');
      logger.debug(`工作区路径: ${workspaceRoot}`);

      if (!workspaceRoot) {
        logger.warn('⚠️ 工作区路径为空，使用默认提示词配置');
        this.initialized = true;
        logger.info(`✅ 提示词模板服务已初始化（系统 ${this.getSystemTemplatesCount()}，自定义 0）`);
        return true;
      }

      // 设置自定义提示词存储路径
      const configDir = path.join(workspaceRoot, '.novel-assistant', 'xiezuoguize');
      logger.debug(`配置目录: ${configDir}`);
      
      if (!fs.existsSync(configDir)) {
        try {
          fs.mkdirSync(configDir, { recursive: true });
          logger.debug(`✅ 创建配置目录: ${configDir}`);
        } catch (mkdirError) {
          logger.error(`❌ 创建配置目录失败: ${mkdirError}`);
          if (vscode) {
            vscode.window.showErrorMessage(`创建配置目录失败: ${mkdirError}`);
          }
          return false;
        }
      } else {
        logger.debug(`✅ 配置目录已存在: ${configDir}`);
      }
      
      this.customPromptsPath = path.join(configDir, 'custom-prompts.json');
      logger.debug(`自定义提示词文件: ${this.customPromptsPath}`);
      
      // 加载用户自定义模板
      this.loadUserPrompts();
      
      this.initialized = true;
      logger.info(
        `✅ 提示词模板服务初始化完成（系统 ${this.getSystemTemplatesCount()}，自定义 ${this.userPrompts.size}，合计 ${this.getAllTemplates().length}）`
      );
      
      return true;
    } catch (error) {
      logger.error(`❌ 提示词模板服务初始化异常: ${error}`);
      if (vscode) {
        vscode.window.showErrorMessage(`提示词模板服务初始化失败: ${error}`);
      }
      return false;
    }
  }

  /**
   * 检查服务是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 加载用户自定义提示词
   */
  private loadUserPrompts(): void {
    if (!this.customPromptsPath) {
      logger.warn('⚠️ 自定义提示词文件路径未设置');
      return;
    }

    if (!fs.existsSync(this.customPromptsPath)) {
      logger.debug(`📄 未找到自定义提示词文件: ${this.customPromptsPath}，将使用系统默认模板`);
      
      // 创建空文件
      try {
        fs.writeFileSync(this.customPromptsPath, '[]', 'utf-8');
        logger.debug('✅ 创建空的自定义提示词文件');
      } catch (createError) {
        logger.warn(`⚠️ 创建空文件失败: ${createError}`);
      }
      return;
    }

    try {
      const content = fs.readFileSync(this.customPromptsPath, 'utf-8');
      
      // 检查文件内容是否为空
      if (!content || content.trim() === '') {
        logger.debug('📄 自定义提示词文件为空，使用系统默认');
        this.userPrompts.clear();
        return;
      }
      
      const prompts: UserPromptTemplate[] = JSON.parse(content);
      
      // 验证数据格式
      if (!Array.isArray(prompts)) {
        logger.warn('❌ 自定义提示词文件格式错误：应为数组');
        if (vscode) {
          vscode.window.showErrorMessage('自定义提示词文件格式错误，将使用系统默认');
        }
        this.userPrompts.clear();
        return;
      }
      
      this.userPrompts.clear();
      let validCount = 0;
      prompts.forEach(p => {
        if (p.key && p.name && p.content) {
          this.userPrompts.set(p.key, p);
          validCount++;
        } else {
          logger.warn(`⚠️ 跳过无效模板: ${p.key || '未知'}`);
        }
      });
      
      logger.info(`📥 已加载 ${validCount}/${prompts.length} 个自定义提示词模板`);
    } catch (error) {
      logger.error(`❌ 加载自定义提示词失败: ${error}`);
      if (error instanceof SyntaxError) {
        logger.debug('错误类型: JSON解析错误');
        if (vscode) {
          vscode.window.showErrorMessage('自定义提示词文件格式错误（JSON解析失败），将使用系统默认');
        }
      } else {
        logger.debug(`错误详情: ${error}`);
        if (vscode) {
          vscode.window.showErrorMessage('加载自定义提示词失败，将使用系统默认');
        }
      }
      this.userPrompts.clear();
    }
  }

  /**
   * 保存用户自定义提示词
   */
  private saveUserPrompts(): boolean {
    try {
      const prompts = Array.from(this.userPrompts.values());
      fs.writeFileSync(
        this.customPromptsPath,
        JSON.stringify(prompts, null, 2),
        'utf-8'
      );
      logger.debug(`💾 已保存 ${prompts.length} 个自定义提示词模板`);
      return true;
    } catch (error) {
      logger.error(`❌ 保存自定义提示词失败: ${error}`);
      if (vscode) {
        vscode.window.showErrorMessage('保存自定义提示词失败');
      }
      return false;
    }
  }

  /**
   * 获取提示词模板（优先用户自定义，降级到系统默认）
   */
  getTemplate(key: string): PromptTemplate | undefined {
    // 1. 先查找用户自定义
    const userPrompt = this.userPrompts.get(key);
    if (userPrompt) {
      logger.debug(`✅ 使用自定义提示词: ${key} - ${userPrompt.name}`);
      return userPrompt;
    }

    // 2. 降级到系统默认
    const systemPrompt = getSystemPrompt(key);
    if (systemPrompt) {
      logger.debug(`⚪ 使用系统默认提示词: ${key} - ${systemPrompt.name}`);
      return systemPrompt;
    }

    logger.warn(`⚠️ 未找到提示词模板: ${key}`);
    return undefined;
  }

  /**
   * 获取所有模板（合并系统和用户）
   */
  getAllTemplates(): PromptTemplate[] {
    if (!this.initialized) {
      logger.warn('⚠️ 提示词模板服务未初始化，仅返回系统默认模板');
      return [...SYSTEM_PROMPTS];
    }

    const templates: PromptTemplate[] = [];
    const addedKeys = new Set<string>();

    // 先添加用户自定义的
    this.userPrompts.forEach(prompt => {
      templates.push(prompt);
      addedKeys.add(prompt.key);
    });

    // 再添加未自定义的系统默认
    SYSTEM_PROMPTS.forEach(prompt => {
      if (!addedKeys.has(prompt.key)) {
        templates.push(prompt);
      }
    });

    logger.debug(`📋 获取所有模板: ${templates.length} 个（自定义: ${this.userPrompts.size}, 系统: ${SYSTEM_PROMPTS.length}）`);
    return templates;
  }

  /**
   * 创建或更新自定义模板
   */
  saveCustomTemplate(template: Omit<PromptTemplate, 'key'> & { key?: string }): boolean {
    const now = new Date().toISOString();
    const key = template.key || this.generateKey(template.name);

    const existing = this.userPrompts.get(key);
    
    const userTemplate: UserPromptTemplate = {
      key,
      name: template.name,
      category: template.category,
      description: template.description,
      content: template.content,
      parameters: template.parameters,
      isCustom: true,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };

    this.userPrompts.set(key, userTemplate);
    
    if (this.saveUserPrompts()) {
      if (vscode) {
        vscode.window.showInformationMessage(`提示词模板"${template.name}"已保存`);
      }
      return true;
    }
    return false;
  }

  /**
   * 删除自定义模板（恢复为系统默认）
   */
  deleteCustomTemplate(key: string): boolean {
    if (!this.userPrompts.has(key)) {
      if (vscode) {
        vscode.window.showWarningMessage('该模板未自定义');
      }
      return false;
    }

    this.userPrompts.delete(key);
    
    if (this.saveUserPrompts()) {
      if (vscode) {
        vscode.window.showInformationMessage('已恢复为系统默认模板');
      }
      return true;
    }
    return false;
  }

  /**
   * 导出所有自定义模板
   */
  exportCustomTemplates(): string {
    const prompts = Array.from(this.userPrompts.values());
    return JSON.stringify(prompts, null, 2);
  }

  /**
   * 导入自定义模板
   */
  importCustomTemplates(jsonContent: string): boolean {
    try {
      const prompts: UserPromptTemplate[] = JSON.parse(jsonContent);
      
      let imported = 0;
      prompts.forEach(p => {
        this.userPrompts.set(p.key, p);
        imported++;
      });

      if (this.saveUserPrompts()) {
        if (vscode) {
          vscode.window.showInformationMessage(`成功导入 ${imported} 个提示词模板`);
        }
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`❌ 导入失败: ${error}`);
      if (vscode) {
        vscode.window.showErrorMessage('导入失败，请检查JSON格式');
      }
      return false;
    }
  }

  /**
   * 格式化提示词
   */
  format(key: string, params: Record<string, any>): string | undefined {
    const template = this.getTemplate(key);
    if (!template) {
      return undefined;
    }
    return formatPrompt(template.content, params);
  }

  /**
   * 生成模板key
   */
  private generateKey(name: string): string {
    const pinyin = name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    const timestamp = Date.now().toString(36);
    return `CUSTOM_${pinyin}_${timestamp}`;
  }

  /**
   * 检查模板是否为自定义
   */
  isCustomTemplate(key: string): boolean {
    return this.userPrompts.has(key);
  }

  /**
   * 获取系统默认模板信息
   */
  getSystemTemplate(key: string): PromptTemplate | undefined {
    return getSystemPrompt(key);
  }

  /**
   * 获取系统模板数量
   */
  private getSystemTemplatesCount(): number {
    return SYSTEM_PROMPTS.length;
  }

  /**
   * 获取自定义模板数量
   */
  getCustomTemplatesCount(): number {
    return this.userPrompts.size;
  }

  /**
   * 重新加载模板（用于调试）
   */
  reload(): boolean {
    if (!this.initialized) {
      logger.warn('⚠️ 服务未初始化，无法重新加载');
      return false;
    }
    logger.info('🔄 重新加载提示词模板...');
    this.loadUserPrompts();
    logger.info(`✅ 重新加载完成，当前模板总数: ${this.getAllTemplates().length}`);
    return true;
  }
}

// 导出单例
export const promptTemplateService = new PromptTemplateService();
