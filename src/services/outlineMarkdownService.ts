import { markdownFileRepository, MarkdownSection } from '../repositories/markdownFileRepository';
import { logger } from '../utils/logger';
import { Outline } from '../data/storage';
import { panelRefreshService } from './panelRefreshService';

let vscode: any = null;
try {
  vscode = require('vscode');
} catch (error) {
}

export interface OutlineMarkdownData {
  title?: string;
  content?: string;
  sections?: { title: string; content: string }[];
}

const OUTLINE_FILE = 'outline.md';

class OutlineMarkdownService {
  private initialized = false;

  init(): boolean {
    if (this.initialized) {
      return true;
    }

    const success = markdownFileRepository.init();
    if (success) {
      this.initialized = true;
      logger.log('✅ 大纲MD服务已初始化');
    }

    return success;
  }

  load(): OutlineMarkdownData {
    if (!this.initialized) {
      throw new Error('服务未初始化');
    }

    const file = markdownFileRepository.read(OUTLINE_FILE, {
      parseSections: true,
      parseFrontMatter: true
    });

    if (!file.content) {
      return {};
    }

    const result: OutlineMarkdownData = {
      title: file.frontMatter?.title || '小说大纲',
      content: file.content,
      sections: file.sections.map(section => ({
        title: section.title,
        content: section.content.trim()
      }))
    };

    return result;
  }

  /**
   * 从大纲列表生成Markdown文件
   */
  generateFromOutlines(outlines: Outline[]): boolean {
    if (!this.initialized) {
      throw new Error('服务未初始化');
    }

    if (!outlines || outlines.length === 0) {
      logger.log('⚠️ 大纲列表为空，跳过生成');
      return false;
    }

    // 按orderIndex排序
    const sortedOutlines = [...outlines].sort((a, b) => a.orderIndex - b.orderIndex);
    
    // 构建Markdown内容
    const sections: MarkdownSection[] = [];
    
    let currentVolume: string | null = null;
    
    for (const outline of sortedOutlines) {
      if (outline.type === 'volume') {
        // 卷级大纲
        currentVolume = outline.title;
        sections.push({
          title: `第${outline.volumeNumber}卷 ${outline.title}`,
          content: outline.content,
          level: 1
        });
      } else if (outline.type === 'chapter') {
        // 章级大纲
        const chapterTitle = currentVolume 
          ? `${currentVolume} - 第${outline.chapterNumber}章 ${outline.title}`
          : `第${outline.chapterNumber}章 ${outline.title}`;
        
        sections.push({
          title: chapterTitle,
          content: outline.content,
          level: 2
        });
      } else {
        // 场景级大纲
        sections.push({
          title: outline.title,
          content: outline.content,
          level: 3
        });
      }
    }
    
    // 构建最终Markdown内容
    const content = sections.map(section => {
      const header = '#'.repeat(section.level) + ' ' + section.title;
      return `${header}\n\n${section.content.trim()}\n\n`;
    }).join('');
    
    const frontMatter = {
      title: '小说大纲',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const success = markdownFileRepository.write(OUTLINE_FILE, content, {
      includeFrontMatter: true,
      frontMatter
    });
    
    if (success) {
      logger.log('💾 大纲Markdown文件已生成');
      panelRefreshService.refreshOutline();
    }
    
    return success;
  }

  /**
   * 保存单个大纲条目
   */
  saveOutline(outline: Outline): boolean {
    if (!this.initialized) {
      throw new Error('服务未初始化');
    }
    
    // 先加载所有大纲，然后更新或添加，再重新生成Markdown
    // 这里需要从dataStorage获取所有大纲
    const { dataStorage } = require('../data/storage');
    const allOutlines = dataStorage.loadOutlines();
    
    // 检查是否已存在该大纲
    const index = allOutlines.findIndex((o: Outline) => o.id === outline.id);
    
    if (index !== -1) {
      // 更新现有大纲
      allOutlines[index] = outline;
    } else {
      // 添加新大纲
      allOutlines.push(outline);
    }
    
    // 重新生成Markdown文件
    return this.generateFromOutlines(allOutlines);
  }

  exists(): boolean {
    return markdownFileRepository.exists(OUTLINE_FILE);
  }

  delete(): boolean {
    return markdownFileRepository.delete(OUTLINE_FILE);
  }

  openInEditor(): void {
    if (!vscode) {
      logger.log('⚠️ 无法打开编辑器：不在 VS Code 环境中');
      return;
    }
    const filePath = markdownFileRepository.read(OUTLINE_FILE).filePath;
    vscode.workspace.openTextDocument(filePath).then((doc: any) => {
      vscode.window.showTextDocument(doc);
    });
  }
}

export const outlineMarkdownService = new OutlineMarkdownService();
