import { markdownFileRepository } from '../repositories/markdownFileRepository';
import { logger } from '../utils/logger';
import { dataStorage } from '../data/storage';
import { panelRefreshService } from './panelRefreshService';

let vscode: any = null;
try {
  vscode = require('vscode');
} catch (error) {
}

export interface WorldSettingData {
  timePeriod?: string;
  location?: string;
  atmosphere?: string;
  rules?: string[];
  additionalInfo?: string;
}

export interface WorldSettingMarkdown {
  frontMatter: {
    title?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  sections: {
    timePeriod?: string;
    location?: string;
    atmosphere?: string;
    rules?: string;
    additionalInfo?: string;
  };
}

const WORLD_SETTING_FILE = 'world-setting.md';

class WorldSettingMarkdownService {
  private initialized = false;

  init(): boolean {
    if (this.initialized) {
      return true;
    }

    const success = markdownFileRepository.init();
    if (success) {
      this.initialized = true;
      logger.log('✅ 世界观MD服务已初始化');
    }

    return success;
  }

  load(): WorldSettingData {
    if (!this.initialized) {
      this.init();
    }
    
    if (!this.initialized) {
      logger.warn('⚠️ 世界观MD服务尚未初始化，尝试加载数据可能失败');
    }

    try {
      const file = markdownFileRepository.read(WORLD_SETTING_FILE, {
        parseSections: true,
        parseFrontMatter: true
      });

      if (!file.content) {
        return {};
      }

      const result: WorldSettingData = {};

      if (file.sections && file.sections.length > 0) {
        for (const section of file.sections) {
          switch (section.title) {
            case '时代背景':
              result.timePeriod = section.content.trim();
              break;
            case '地点设定':
              result.location = section.content.trim();
              break;
            case '氛围基调':
              result.atmosphere = section.content.trim();
              break;
            case '世界规则':
              result.rules = this.parseRules(section.content);
              break;
            case '补充信息':
              result.additionalInfo = section.content.trim();
              break;
          }
        }
      }

      return result;
    } catch (error) {
      logger.error(`❌ 加载世界观数据失败: ${error}`);
      return {};
    }
  }

  save(data: WorldSettingData): boolean {
    if (!this.initialized) {
      throw new Error('服务未初始化');
    }

    const now = new Date().toISOString();
    const frontMatter = {
      title: '世界观设定',
      createdAt: now,
      updatedAt: now
    };

    const content = this.buildMarkdownContent(data);

    const success = markdownFileRepository.write(WORLD_SETTING_FILE, content, {
      includeFrontMatter: true,
      frontMatter
    });

    if (success) {
      // 同步到JSON存储
      const worldSetting = {
        id: 'WORLD001',
        title: '世界观设定',
        timePeriod: data.timePeriod || '',
        location: data.location || '',
        atmosphere: data.atmosphere || '',
        rules: data.rules || [],
        additionalInfo: data.additionalInfo || '',
        createdAt: now,
        updatedAt: now
      };
      
      dataStorage.saveWorldSetting(worldSetting);
      logger.log('💾 世界观设定已同步到JSON存储');
      
      // 触发面板刷新
      panelRefreshService.refreshWorldSetting();
    }

    return success;
  }

  exists(): boolean {
    return markdownFileRepository.exists(WORLD_SETTING_FILE);
  }

  delete(): boolean {
    return markdownFileRepository.delete(WORLD_SETTING_FILE);
  }

  openInEditor(): void {
    if (!vscode) {
      logger.log('⚠️ 无法打开编辑器：不在 VS Code 环境中');
      return;
    }
    const filePath = markdownFileRepository.read(WORLD_SETTING_FILE).filePath;
    vscode.workspace.openTextDocument(filePath).then((doc: any) => {
      vscode.window.showTextDocument(doc);
    });
  }

  private parseRules(content: string): string[] {
    const lines = content.split('\n').filter((line) => line.trim());
    const rules: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        rules.push(trimmed.substring(2).trim());
      } else if (trimmed.match(/^\d+\./)) {
        rules.push(trimmed.replace(/^\d+\.\s*/, ''));
      } else {
        rules.push(trimmed);
      }
    }

    return rules;
  }

  private buildMarkdownContent(data: WorldSettingData): string {
    const sections: string[] = [];

    if (data.timePeriod) {
      sections.push(`## 时代背景\n\n${data.timePeriod}`);
    }

    if (data.location) {
      sections.push(`## 地点设定\n\n${data.location}`);
    }

    if (data.atmosphere) {
      sections.push(`## 氛围基调\n\n${data.atmosphere}`);
    }

    if (data.rules && data.rules.length > 0) {
      const rulesContent = data.rules.map((rule) => `- ${rule}`).join('\n');
      sections.push(`## 世界规则\n\n${rulesContent}`);
    }

    if (data.additionalInfo) {
      sections.push(`## 补充信息\n\n${data.additionalInfo}`);
    }

    return sections.join('\n\n');
  }

  updateSection(sectionTitle: string, content: string): boolean {
    return markdownFileRepository.updateSection(WORLD_SETTING_FILE, sectionTitle, content);
  }

  getSection(sectionTitle: string): string | null {
    const section = markdownFileRepository.getSection(WORLD_SETTING_FILE, sectionTitle);
    return section ? section.content.trim() : null;
  }
}

export const worldSettingMarkdownService = new WorldSettingMarkdownService();
