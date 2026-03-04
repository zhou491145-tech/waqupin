import * as path from 'path';
import * as fs from 'fs';
import { markdownFileRepository, MarkdownSection } from '../repositories/markdownFileRepository';
import { logger } from '../utils/logger';

let vscode: any = null;
try {
  vscode = require('vscode');
} catch (error) {
}

export interface ProjectConfigData {
  id?: string;
  title?: string;
  theme?: string;
  genre?: string;
  targetWordCount?: number;
  narrativePerspective?: string;
  targetAudience?: string;
  coreConflict?: string;
  mainPlot?: string;
  createdAt?: string;
  updatedAt?: string;
}

const PROJECT_CONFIG_FILE = 'project-config.md';

class ProjectConfigMarkdownService {
  private initialized = false;

  init(): boolean {
    if (this.initialized) {
      return true;
    }

    const success = markdownFileRepository.init();
    if (success) {
      this.initialized = true;
      logger.log('✅ 项目配置MD服务已初始化');
    }

    return success;
  }

  load(): ProjectConfigData {
    if (!this.initialized) {
      throw new Error('服务未初始化');
    }

    const file = markdownFileRepository.read(PROJECT_CONFIG_FILE, {
      parseSections: true,
      parseFrontMatter: true
    });

    if (!file.content) {
      return {};
    }

    const result: ProjectConfigData = {};

    if (file.frontMatter) {
      result.id = file.frontMatter.id;
      result.createdAt = file.frontMatter.createdAt;
      result.updatedAt = file.frontMatter.updatedAt;
    }

    for (const section of file.sections) {
      switch (section.title) {
        case '书名':
          result.title = section.content.trim();
          break;
        case '类型':
          result.genre = section.content.trim();
          break;
        case '叙述视角':
          result.narrativePerspective = section.content.trim();
          break;
        case '主题':
          result.theme = section.content.trim();
          break;
        case '目标读者':
          result.targetAudience = section.content.trim();
          break;
        case '目标字数':
          const wordCount = parseInt(section.content.trim());
          result.targetWordCount = isNaN(wordCount) ? undefined : wordCount;
          break;
        case '核心冲突':
          result.coreConflict = section.content.trim();
          break;
        case '主要情节':
          result.mainPlot = section.content.trim();
          break;
      }
    }

    return result;
  }

  save(data: ProjectConfigData): boolean {
    if (!this.initialized) {
      throw new Error('服务未初始化');
    }

    const existing = this.load();
    const now = new Date().toISOString();

    const id = data.id || existing.id || 'PROJ0001';
    const createdAt = data.createdAt || existing.createdAt || now;
    const updatedAt = now;

    const frontMatter: Record<string, any> = {
      id,
      createdAt,
      updatedAt
    };

    const sections: MarkdownSection[] = [
      {
        title: '书名',
        content: data.title || existing.title || '',
        level: 1
      },
      {
        title: '类型',
        content: data.genre || existing.genre || '',
        level: 2
      },
      {
        title: '叙述视角',
        content: data.narrativePerspective || existing.narrativePerspective || '第三人称',
        level: 2
      },
      {
        title: '主题',
        content: data.theme || existing.theme || '',
        level: 2
      },
      {
        title: '目标读者',
        content: data.targetAudience || existing.targetAudience || '',
        level: 2
      },
      {
        title: '目标字数',
        content: String(data.targetWordCount || existing.targetWordCount || 100000),
        level: 2
      },
      {
        title: '核心冲突',
        content: data.coreConflict || existing.coreConflict || '',
        level: 2
      },
      {
        title: '主要情节',
        content: data.mainPlot || existing.mainPlot || '',
        level: 2
      }
    ];

    const markdownContent = sections.map((section) => {
      const prefix = '#'.repeat(section.level);
      return `${prefix} ${section.title}\n\n${section.content}`;
    }).join('\n\n');

    const success = markdownFileRepository.write(PROJECT_CONFIG_FILE, markdownContent, {
      includeFrontMatter: true,
      frontMatter
    });

    if (success) {
      logger.log(`✅ 项目配置已保存到MD文件`);
    }

    return success;
  }

  updateSection(sectionTitle: string, newContent: string): boolean {
    if (!this.initialized) {
      throw new Error('服务未初始化');
    }

    return markdownFileRepository.updateSection(PROJECT_CONFIG_FILE, sectionTitle, newContent);
  }

  getSection(sectionTitle: string): string | null {
    if (!this.initialized) {
      throw new Error('服务未初始化');
    }

    const file = markdownFileRepository.read(PROJECT_CONFIG_FILE, {
      parseSections: true
    });

    const section = file.sections.find((s: MarkdownSection) => s.title === sectionTitle);
    return section ? section.content.trim() : null;
  }

  exists(): boolean {
    if (!this.initialized) {
      return false;
    }

    const file = markdownFileRepository.read(PROJECT_CONFIG_FILE);
    return file.content !== '';
  }

  delete(): boolean {
    if (!this.initialized) {
      throw new Error('服务未初始化');
    }

    return markdownFileRepository.delete(PROJECT_CONFIG_FILE);
  }
}

export const projectConfigMarkdownService = new ProjectConfigMarkdownService();
