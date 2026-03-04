/**
 * 写作风格套装管理服务
 * 处理用户层的写作风格套装（商业化功能）
 */

import * as fs from 'fs';
import * as path from 'path';
import { aiService } from './aiService';
import { WritingStylePreset, PRESET_WRITING_STYLES, getPresetStyle } from './writingStylePresets';
import { promptTemplateService } from './promptTemplateService';
import { logger } from '../utils/logger';

let vscode: any = null;
try {
  vscode = require('vscode');
} catch (error) {
}

export interface UserStylePackage {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  styleContent: string;
  baseTemplateKey: string;
  defaultParams: Record<string, any>;
  isActive: boolean;
  isCustom: boolean; // 是否为用户自定义
  createdAt: string;
  updatedAt: string;
}

class WritingStylesService {
  private activePackageId: string = ''; // 当前激活的套装ID
  private customPackages: Map<string, UserStylePackage> = new Map();
  private customPackagesPath: string = '';
  private activePackagePath: string = '';

  /**
   * 初始化服务
   */
  init(workspaceRoot?: string): boolean {
    try {
      logger.log('🔧 开始初始化写作风格套装服务...');
      logger.log(`   工作区路径: ${workspaceRoot}`);

      if (!workspaceRoot) {
        logger.log('⚠️ 工作区路径为空，使用默认配置');
        // 使用默认预设套装
        this.activePackageId = 'urban_natural';
        logger.log(`✅ 写作风格套装服务已初始化（仅预设套装）`);
        logger.log(`   预设套装数: ${PRESET_WRITING_STYLES.length}`);
        logger.log(`   自定义套装数: 0`);
        logger.log(`   总套装数: ${PRESET_WRITING_STYLES.length}`);
        logger.log(`   当前激活套装: ${this.activePackageId}`);
        return true;
      }

      const configDir = path.join(workspaceRoot, '.novel-assistant', 'xiezuoguize');
      logger.log(`   配置目录: ${configDir}`);
      
      if (!fs.existsSync(configDir)) {
        try {
          fs.mkdirSync(configDir, { recursive: true });
          logger.log(`   ✅ 创建配置目录: ${configDir}`);
        } catch (mkdirError) {
          logger.log(`   ❌ 创建配置目录失败: ${mkdirError}`);
          if (vscode) {
            vscode.window.showErrorMessage(`创建配置目录失败: ${mkdirError}`);
          }
          return false;
        }
      } else {
        logger.log(`   ✅ 配置目录已存在: ${configDir}`);
      }
      
      this.customPackagesPath = path.join(configDir, 'custom-style-packages.json');
      this.activePackagePath = path.join(configDir, 'active-style-package.txt');
      logger.log(`   自定义套装文件: ${this.customPackagesPath}`);
      logger.log(`   激活套装文件: ${this.activePackagePath}`);
      
      this.loadCustomPackages();
      this.loadActivePackage();
      
      logger.log(`✅ 写作风格套装服务初始化完成`);
      logger.log(`   预设套装数: ${PRESET_WRITING_STYLES.length}`);
      logger.log(`   自定义套装数: ${this.customPackages.size}`);
      logger.log(`   总套装数: ${this.getAllPackages().length}`);
      logger.log(`   当前激活套装: ${this.activePackageId || '未设置'}`);
      
      return true;
    } catch (error) {
      logger.log(`❌ 写作风格套装服务初始化异常: ${error}`);
      if (vscode) {
        vscode.window.showErrorMessage(`写作风格套装服务初始化失败: ${error}`);
      }
      return false;
    }
  }

  /**
   * 加载用户自定义套装
   */
  private loadCustomPackages(): void {
    if (!this.customPackagesPath) {
      logger.log('⚠️ 自定义套装文件路径未设置');
      return;
    }

    if (!fs.existsSync(this.customPackagesPath)) {
      logger.log(`📄 未找到自定义套装文件: ${this.customPackagesPath}`);
      logger.log('   将使用预设风格套装');
      
      try {
        fs.writeFileSync(this.customPackagesPath, '[]', 'utf-8');
        logger.log(`   ✅ 创建空的自定义套装文件`);
      } catch (createError) {
        logger.log(`   ⚠️ 创建空文件失败: ${createError}`);
      }
      return;
    }

    try {
      const content = fs.readFileSync(this.customPackagesPath, 'utf-8');
      const packages: UserStylePackage[] = JSON.parse(content);
      
      if (!Array.isArray(packages)) {
        logger.log(`❌ 自定义套装文件格式错误: 期望数组，实际为 ${typeof packages}`);
        if (vscode) {
          vscode.window.showErrorMessage('自定义套装文件格式错误');
        }
        return;
      }
      
      this.customPackages.clear();
      packages.forEach(p => {
        if (p && p.id && p.name) {
          this.customPackages.set(p.id, p);
        } else {
          logger.log(`⚠️ 跳过无效的套装数据: ${JSON.stringify(p)}`);
        }
      });
      
      logger.log(`📥 加载了 ${this.customPackages.size} 个自定义风格套装`);
    } catch (error) {
      logger.log(`❌ 加载自定义风格套装失败: ${error}`);
      logger.log(`   将使用预设风格套装`);
      
      if (error instanceof SyntaxError) {
        if (vscode) {
          vscode.window.showErrorMessage('自定义套装文件格式错误，请检查JSON格式');
        }
      } else {
        if (vscode) {
          vscode.window.showErrorMessage(`加载自定义套装失败: ${error}`);
        }
      }
    }
  }

  /**
   * 保存用户自定义套装
   */
  private saveCustomPackages(): boolean {
    try {
      const packages = Array.from(this.customPackages.values());
      fs.writeFileSync(
        this.customPackagesPath,
        JSON.stringify(packages, null, 2),
        'utf-8'
      );
      logger.log(`💾 已保存 ${packages.length} 个自定义风格套装`);
      return true;
    } catch (error) {
      logger.log(`❌ 保存自定义风格套装失败: ${error}`);
      return false;
    }
  }

  /**
   * 加载当前激活的套装
   */
  private loadActivePackage(): void {
    if (!this.activePackagePath) {
      logger.log('⚠️ 激活套装文件路径未设置');
      this.activePackageId = PRESET_WRITING_STYLES[0]?.id || '';
      return;
    }

    if (!fs.existsSync(this.activePackagePath)) {
      logger.log(`📄 未找到激活套装文件: ${this.activePackagePath}`);
      logger.log(`   将使用默认预设套装: ${PRESET_WRITING_STYLES[0]?.name || '未设置'}`);
      this.activePackageId = PRESET_WRITING_STYLES[0]?.id || '';
      
      try {
        fs.writeFileSync(this.activePackagePath, this.activePackageId, 'utf-8');
        logger.log(`   ✅ 创建激活套装文件`);
      } catch (createError) {
        logger.log(`   ⚠️ 创建激活套装文件失败: ${createError}`);
      }
      return;
    }

    try {
      const content = fs.readFileSync(this.activePackagePath, 'utf-8').trim();
      
      if (!content) {
        logger.log(`⚠️ 激活套装文件为空`);
        this.activePackageId = PRESET_WRITING_STYLES[0]?.id || '';
        return;
      }
      
      this.activePackageId = content;
      
      const activePkg = this.getActivePackage();
      if (activePkg) {
        logger.log(`✅ 当前激活风格套装: ${activePkg.name} (${activePkg.id})`);
      } else {
        logger.log(`⚠️ 激活的套装ID不存在: ${this.activePackageId}`);
        logger.log(`   将使用默认预设套装`);
        this.activePackageId = PRESET_WRITING_STYLES[0]?.id || '';
      }
    } catch (error) {
      logger.log(`⚠️ 读取激活套装失败: ${error}`);
      logger.log(`   将使用默认预设套装`);
      this.activePackageId = PRESET_WRITING_STYLES[0]?.id || '';
    }
  }

  /**
   * 保存当前激活的套装
   */
  private saveActivePackage(): boolean {
    try {
      fs.writeFileSync(this.activePackagePath, this.activePackageId, 'utf-8');
      return true;
    } catch (error) {
      logger.log(`❌ 保存激活套装失败: ${error}`);
      return false;
    }
  }

  /**
   * 获取所有可用的套装（预设 + 自定义）
   */
  getAllPackages(): UserStylePackage[] {
    const packages: UserStylePackage[] = [];
    
    // 添加预设套装
    PRESET_WRITING_STYLES.forEach(preset => {
      packages.push({
        id: preset.id,
        name: preset.name,
        description: preset.description,
        category: preset.category,
        icon: preset.icon,
        styleContent: preset.styleContent,
        baseTemplateKey: preset.baseTemplateKey,
        defaultParams: preset.defaultParams || {},
        isActive: this.activePackageId === preset.id,
        isCustom: false,
        createdAt: '',
        updatedAt: ''
      });
    });

    // 添加自定义套装
    this.customPackages.forEach(pkg => {
      packages.push({
        ...pkg,
        isActive: this.activePackageId === pkg.id
      });
    });

    return packages;
  }

  /**
   * 获取当前激活的套装
   */
  getActivePackage(): UserStylePackage | null {
    if (!this.activePackageId) {
      return null;
    }

    // 先查找预设
    const preset = getPresetStyle(this.activePackageId);
    if (preset) {
      return {
        id: preset.id,
        name: preset.name,
        description: preset.description,
        category: preset.category,
        icon: preset.icon,
        styleContent: preset.styleContent,
        baseTemplateKey: preset.baseTemplateKey,
        defaultParams: preset.defaultParams || {},
        isActive: true,
        isCustom: false,
        createdAt: '',
        updatedAt: ''
      };
    }

    // 再查找自定义
    const custom = this.customPackages.get(this.activePackageId);
    if (custom) {
      return { ...custom, isActive: true };
    }

    return null;
  }

  /**
   * 激活套装
   */
  activatePackage(id: string): boolean {
    const pkg = this.getAllPackages().find(p => p.id === id);
    if (!pkg) {
      if (vscode) {
        vscode.window.showErrorMessage('套装不存在');
      }
      return false;
    }

    this.activePackageId = id;
    if (this.saveActivePackage()) {
      logger.log(`✅ 已激活风格套装: ${pkg.name}`);
      if (vscode) {
        vscode.window.showInformationMessage(`已激活风格套装：${pkg.name}`);
      }
      return true;
    }

    return false;
  }

  /**
   * 创建自定义套装（基于预设）
   */
  createCustomPackage(basePresetId: string, name: string): boolean {
    const preset = getPresetStyle(basePresetId);
    if (!preset) {
      if (vscode) {
        vscode.window.showErrorMessage('预设套装不存在');
      }
      return false;
    }

    const now = new Date().toISOString();
    const customId = `custom_${Date.now()}`;

    const customPkg: UserStylePackage = {
      id: customId,
      name: name || `${preset.name}（自定义）`,
      description: preset.description,
      category: preset.category,
      icon: preset.icon,
      styleContent: preset.styleContent,
      baseTemplateKey: preset.baseTemplateKey,
      defaultParams: { ...preset.defaultParams },
      isActive: false,
      isCustom: true,
      createdAt: now,
      updatedAt: now
    };

    this.customPackages.set(customId, customPkg);
    
    if (this.saveCustomPackages()) {
      if (vscode) {
        vscode.window.showInformationMessage(`已创建自定义套装：${customPkg.name}`);
      }
      return true;
    }

    return false;
  }

  /**
   * 更新自定义套装
   */
  updateCustomPackage(id: string, updates: Partial<UserStylePackage>): boolean {
    const pkg = this.customPackages.get(id);
    if (!pkg) {
      if (vscode) {
        vscode.window.showErrorMessage('自定义套装不存在');
      }
      return false;
    }

    const updated = {
      ...pkg,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.customPackages.set(id, updated);
    
    if (this.saveCustomPackages()) {
      if (vscode) {
        vscode.window.showInformationMessage(`已更新套装：${updated.name}`);
      }
      return true;
    }

    return false;
  }

  /**
   * 删除自定义套装
   */
  deleteCustomPackage(id: string): boolean {
    const pkg = this.customPackages.get(id);
    if (!pkg) {
      if (vscode) {
        vscode.window.showErrorMessage('自定义套装不存在');
      }
      return false;
    }

    // 如果正在使用，取消激活
    if (this.activePackageId === id) {
      this.activePackageId = PRESET_WRITING_STYLES[0]?.id || '';
      this.saveActivePackage();
    }

    this.customPackages.delete(id);
    
    if (this.saveCustomPackages()) {
      if (vscode) {
        vscode.window.showInformationMessage(`已删除套装：${pkg.name}`);
      }
      return true;
    }

    return false;
  }

  /**
   * 导出自定义套装
   */
  exportCustomPackages(): string {
    const packages = Array.from(this.customPackages.values());
    return JSON.stringify(packages, null, 2);
  }

  /**
   * 导入自定义套装
   */
  importCustomPackages(jsonContent: string): boolean {
    try {
      const packages: UserStylePackage[] = JSON.parse(jsonContent);
      
      let imported = 0;
      packages.forEach(pkg => {
        // 确保是自定义套装
        if (pkg.isCustom) {
          this.customPackages.set(pkg.id, pkg);
          imported++;
        }
      });

      if (this.saveCustomPackages()) {
        if (vscode) {
          vscode.window.showInformationMessage(`成功导入 ${imported} 个风格套装`);
        }
        return true;
      }
      return false;
    } catch (error) {
      logger.log(`❌ 导入失败: ${error}`);
      if (vscode) {
        vscode.window.showErrorMessage('导入失败，请检查JSON格式');
      }
      return false;
    }
  }

  /**
   * 应用风格套装到提示词
   * 这是与底层模板系统的衔接点
   */
  applyStyleToPrompt(basePrompt: string, params: Record<string, any>): string {
    const { isEntitledSync } = require('../auth/verify');
    if (!isEntitledSync('styleTemplates')) {
      return basePrompt;
    }

    const activePackage = this.getActivePackage();
    if (!activePackage) {
      return basePrompt;
    }

    logger.log(`📝 应用风格套装: ${activePackage.name}`);

    // 合并默认参数
    const mergedParams = {
      ...activePackage.defaultParams,
      ...params
    };

    // 使用底层模板
    let finalPrompt = promptTemplateService.format(
      activePackage.baseTemplateKey,
      mergedParams
    );

    if (!finalPrompt) {
      finalPrompt = basePrompt;
    }



    // 添加风格指令
    return `${finalPrompt}

${activePackage.styleContent}

请直接输出章节正文内容，不要包含章节标题和其他说明文字。`;
  }

  /**
   * 预览风格效果
   */
  async previewStyle(
    styleContent: string,
    sampleText: string,
    onChunk: (chunk: string) => void
  ): Promise<string | null> {
    const systemPrompt = `你是一个专业的写作助手，请根据用户提供的【写作风格要求】，将【测试文本】扩写成一段约100-150字的小说正文。
请务必严格体现风格要求中的语气、修辞和节奏。`;

    const userPrompt = `【写作风格要求】：
${styleContent}

【测试文本】：
${sampleText}

请开始扩写：`;

    return aiService.streamChat(systemPrompt, userPrompt, onChunk);
  }
}

// 导出单例
export const writingStylesService = new WritingStylesService();
