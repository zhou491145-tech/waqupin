import * as vscode from 'vscode';
import { markdownFileRepository } from '../repositories/markdownFileRepository';
import { logger } from '../utils/logger';

export interface WritingStyleData {
  name?: string;
  baseAuthor?: string;
  description?: string;
  characteristics?: string[];
  writingRules?: string[];
  exampleSentences?: string[];
  isActive?: boolean;
  updatedAt?: string;
}

export interface WritingStyleMarkdown {
  frontMatter: {
    title?: string;
    baseAuthor?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  sections: {
    description?: string;
    characteristics?: string;
    writingRules?: string;
    exampleSentences?: string;
  };
}

const WRITING_STYLE_FILE = 'writing-style.md';

class WritingStyleMarkdownService {
  private initialized = false;

  init(): boolean {
    if (this.initialized) {
      return true;
    }

    const success = markdownFileRepository.init();
    if (success) {
      this.initialized = true;
      logger.log('✅ 写作风格MD服务已初始化');
    }

    return success;
  }

  load(): WritingStyleData {
    if (!this.initialized) {
      throw new Error('服务未初始化');
    }

    const file = markdownFileRepository.read(WRITING_STYLE_FILE, {
      parseSections: true,
      parseFrontMatter: true
    });

    if (!file.content) {
      return {};
    }

    const result: WritingStyleData = {};

    if (file.frontMatter) {
      if (file.frontMatter.title) {
        result.name = file.frontMatter.title;
      }
      if (file.frontMatter.baseAuthor) {
        result.baseAuthor = file.frontMatter.baseAuthor;
      }
      if (file.frontMatter.isActive !== undefined) {
        result.isActive = file.frontMatter.isActive;
      }
      if (file.frontMatter.updatedAt) {
        result.updatedAt = file.frontMatter.updatedAt;
      }
    }

    for (const section of file.sections) {
      switch (section.title) {
        case '风格描述':
          result.description = section.content.trim();
          break;
        case '风格特征':
          result.characteristics = this.parseList(section.content);
          break;
        case '写作规则':
          result.writingRules = this.parseList(section.content);
          break;
        case '示例句子':
          result.exampleSentences = this.parseList(section.content);
          break;
      }
    }

    return result;
  }

  save(data: WritingStyleData): boolean {
    if (!this.initialized) {
      throw new Error('服务未初始化');
    }

    const now = new Date().toISOString();
    const frontMatter = {
      title: data.name || '写作风格',
      baseAuthor: data.baseAuthor,
      createdAt: now,
      updatedAt: data.updatedAt || now,
      isActive: data.isActive !== undefined ? data.isActive : true
    };

    const content = this.buildMarkdownContent(data);

    return markdownFileRepository.write(WRITING_STYLE_FILE, content, {
      includeFrontMatter: true,
      frontMatter
    });
  }

  exists(): boolean {
    return markdownFileRepository.exists(WRITING_STYLE_FILE);
  }

  delete(): boolean {
    return markdownFileRepository.delete(WRITING_STYLE_FILE);
  }

  openInEditor(): void {
    const filePath = markdownFileRepository.read(WRITING_STYLE_FILE).filePath;
    vscode.workspace.openTextDocument(filePath).then((doc) => {
      vscode.window.showTextDocument(doc);
    });
  }

  private parseList(content: string): string[] {
    const lines = content.split('\n').filter((line) => line.trim());
    const items: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        items.push(trimmed.substring(2).trim());
      } else if (trimmed.match(/^\d+\./)) {
        items.push(trimmed.replace(/^\d+\.\s*/, ''));
      } else {
        items.push(trimmed);
      }
    }

    return items;
  }

  private buildMarkdownContent(data: WritingStyleData): string {
    const sections: string[] = [];

    if (data.description) {
      sections.push(`## 风格描述\n\n${data.description}`);
    }

    if (data.characteristics && data.characteristics.length > 0) {
      const characteristicsContent = data.characteristics.map((item) => `- ${item}`).join('\n');
      sections.push(`## 风格特征\n\n${characteristicsContent}`);
    }

    if (data.writingRules && data.writingRules.length > 0) {
      const rulesContent = data.writingRules.map((rule) => `- ${rule}`).join('\n');
      sections.push(`## 写作规则\n\n${rulesContent}`);
    }

    if (data.exampleSentences && data.exampleSentences.length > 0) {
      const examplesContent = data.exampleSentences.map((example) => `- ${example}`).join('\n');
      sections.push(`## 示例句子\n\n${examplesContent}`);
    }

    return sections.join('\n\n');
  }

  updateSection(sectionTitle: string, content: string): boolean {
    return markdownFileRepository.updateSection(WRITING_STYLE_FILE, sectionTitle, content);
  }

  getSection(sectionTitle: string): string | null {
    const section = markdownFileRepository.getSection(WRITING_STYLE_FILE, sectionTitle);
    return section ? section.content.trim() : null;
  }

  applyToPrompt(prompt: string, data?: WritingStyleData): string {
    const styleData = data || this.load();
    
    if (!styleData.description && (!styleData.writingRules || styleData.writingRules.length === 0)) {
      return prompt;
    }

    const styleInstructions: string[] = [];

    if (styleData.description) {
      styleInstructions.push(`写作风格: ${styleData.description}`);
    }

    if (styleData.baseAuthor) {
      styleInstructions.push(`仿照作家风格: ${styleData.baseAuthor}`);
    }

    if (styleData.characteristics && styleData.characteristics.length > 0) {
      styleInstructions.push(`风格特征:\n${styleData.characteristics.map((c) => `- ${c}`).join('\n')}`);
    }

    if (styleData.writingRules && styleData.writingRules.length > 0) {
      styleInstructions.push(`写作规则:\n${styleData.writingRules.map((r) => `- ${r}`).join('\n')}`);
    }

    if (styleInstructions.length === 0) {
      return prompt;
    }

    const styleSection = styleInstructions.join('\n\n');
    return `${prompt}\n\n---\n\n${styleSection}`;
  }
}

export const writingStyleMarkdownService = new WritingStyleMarkdownService();
