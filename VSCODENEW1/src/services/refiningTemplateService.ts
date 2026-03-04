/**
 * 精修模板管理服务
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { PromptTemplate, NovelCategory } from '../types/refining';
import { SYSTEM_TEMPLATES, getTemplateById, getTemplatesByCategory } from '../data/refiningTemplates';
import { NOVEL_CATEGORIES, getDefaultTemplatesForCategory } from '../data/novelCategories';
import { logger } from '../utils/logger';

export class RefiningTemplateService {
  private userCustomTemplates: Map<string, PromptTemplate> = new Map();
  private storageUri: vscode.Uri | null = null;
  private customTemplatesPath: string | null = null;

  /**
   * 初始化存储路径
   */
  public initialize(storageUri: vscode.Uri): void {
    this.storageUri = storageUri;
    this.customTemplatesPath = path.join(storageUri.fsPath, 'customTemplates.json');
    
    // 确保存储目录存在
    if (!fs.existsSync(storageUri.fsPath)) {
      fs.mkdirSync(storageUri.fsPath, { recursive: true });
    }

    // 从存储加载自定义模板
    this._loadCustomTemplates();
  }

  /**
   * 从本地存储加载自定义模板
   */
  private _loadCustomTemplates(): void {
    if (!this.customTemplatesPath || !fs.existsSync(this.customTemplatesPath)) {
      logger.debug('📁 自定义模板文件不存在，跳过加载');
      return;
    }

    try {
      const content = fs.readFileSync(this.customTemplatesPath, 'utf-8');
      const templates = JSON.parse(content) as PromptTemplate[];

      this.userCustomTemplates.clear();
      templates.forEach(template => {
        this.userCustomTemplates.set(template.id, template);
      });

      logger.log(`✓ 已加载 ${templates.length} 个自定义模板`);
    } catch (error) {
      logger.error(`❌ 加载自定义模板失败: ${error}`);
    }
  }

  /**
   * 保存自定义模板到本地存储
   */
  private _persistCustomTemplates(): void {
    if (!this.customTemplatesPath) {
      logger.warn('⚠️ 存储路径未初始化，无法保存自定义模板');
      return;
    }

    try {
      const templates = Array.from(this.userCustomTemplates.values());
      fs.writeFileSync(this.customTemplatesPath, JSON.stringify(templates, null, 2), 'utf-8');
      logger.log(`✓ 已保存 ${templates.length} 个自定义模板`);
    } catch (error) {
      logger.error(`❌ 保存自定义模板失败: ${error}`);
    }
  }

  /**
   * 获取所有可用模板（系统 + 用户自定义）
   */
  public getAllTemplates(): PromptTemplate[] {
    const systemTemplates = Object.values(SYSTEM_TEMPLATES);
    const customTemplates = Array.from(this.userCustomTemplates.values());
    return [...systemTemplates, ...customTemplates];
  }

  /**
   * 获取系统模板
   */
  public getSystemTemplates(): PromptTemplate[] {
    return Object.values(SYSTEM_TEMPLATES);
  }

  /**
   * 获取某个类别的所有模板
   */
  public getTemplatesByCategory(category: NovelCategory): PromptTemplate[] {
    return getTemplatesByCategory(category);
  }

  /**
   * 获取某个类别的默认推荐模板
   */
  public getDefaultTemplatesForCategory(category: NovelCategory): PromptTemplate[] {
    const defaultIds = getDefaultTemplatesForCategory(category);
    return defaultIds
      .map(id => getTemplateById(id))
      .filter((t): t is PromptTemplate => t !== undefined);
  }

  /**
   * 通过ID获取模板
   */
  public getTemplateById(id: string): PromptTemplate | undefined {
    return getTemplateById(id) || this.userCustomTemplates.get(id);
  }

  /**
   * 合并多个模板的提示词
   */
  public mergeTemplatePrompts(templateIds: string[]): string {
    const templates = templateIds
      .map(id => this.getTemplateById(id))
      .filter((t): t is PromptTemplate => t !== undefined);

    if (templates.length === 0) {
      return '';
    }

    const lines = [
      '【综合精修指南】',
      '',
      '您已选择以下精修方向：',
      ...templates.map(t => `• ${t.emoji} ${t.name}`),
      '',
      '请按以下顺序进行精修：',
      '',
    ];

    templates.forEach((template, index) => {
      lines.push(`【${index + 1}. ${template.name}】`);
      lines.push(template.promptText);
      lines.push('');
      lines.push('---');
      lines.push('');
    });

    lines.push('【总体要求】');
    lines.push('- 所有修改必须用【修改】标签标注');
    lines.push('- 确保修改前后的连贯性');
    lines.push('- 保持原文的核心意思和作者风格');

    return lines.join('\n');
  }

  /**
   * 获取模板的分类信息
   */
  public getCategoryConfig(category: NovelCategory) {
    return NOVEL_CATEGORIES[category];
  }

  /**
   * 获取所有分类
   */
  public getAllCategories() {
    return Object.values(NOVEL_CATEGORIES);
  }

  /**
   * 保存用户自定义模板
   */
  public saveCustomTemplate(template: PromptTemplate): void {
    if (template.isSystemTemplate) {
      logger.warn('无法修改系统模板');
      return;
    }

    // 验证模板
    const validation = this.validateTemplate(template);
    if (!validation.valid) {
      logger.error(`❌ 模板验证失败: ${validation.errors.join(', ')}`);
      return;
    }

    this.userCustomTemplates.set(template.id, template);
    this._persistCustomTemplates();
    logger.log(`✓ 已保存自定义模板: ${template.name}`);
  }

  /**
   * 删除用户自定义模板
   */
  public deleteCustomTemplate(templateId: string): boolean {
    if (this.userCustomTemplates.has(templateId)) {
      this.userCustomTemplates.delete(templateId);
      this._persistCustomTemplates();
      logger.log(`✓ 已删除自定义模板: ${templateId}`);
      return true;
    }
    return false;
  }

  /**
   * 获取用户自定义模板数量
   */
  public getCustomTemplateCount(): number {
    return this.userCustomTemplates.size;
  }

  /**
   * 获取所有模板统计
   */
  public getTemplateStats() {
    const systemCount = Object.keys(SYSTEM_TEMPLATES).length;
    const customCount = this.userCustomTemplates.size;
    const totalCount = systemCount + customCount;

    const categoryStats = new Map<NovelCategory, number>();
    Object.values(NOVEL_CATEGORIES).forEach(cat => {
      const count = this.getTemplatesByCategory(cat.id).length;
      categoryStats.set(cat.id, count);
    });

    return {
      systemTemplates: systemCount,
      customTemplates: customCount,
      total: totalCount,
      byCategory: Object.fromEntries(categoryStats),
    };
  }

  /**
   * 验证模板合法性
   */
  public validateTemplate(template: PromptTemplate): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!template.id) errors.push('模板ID不能为空');
    if (!template.name) errors.push('模板名称不能为空');
    if (!template.promptText) errors.push('提示词不能为空');
    if (template.category.length === 0) errors.push('至少需要选择一个分类');
    if (template.estimatedTime <= 0) errors.push('预估耗时必须大于0');

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// 导出单例
export const refiningTemplateService = new RefiningTemplateService();
