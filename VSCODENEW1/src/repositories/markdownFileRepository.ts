import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

let vscode: any = null;
try {
  vscode = require('vscode');
} catch (error) {
}

export interface MarkdownSection {
  title: string;
  content: string;
  level: number;
}

export interface MarkdownFile {
  filePath: string;
  content: string;
  sections: MarkdownSection[];
  frontMatter?: Record<string, any>;
}

export interface MarkdownReadOptions {
  parseSections?: boolean;
  parseFrontMatter?: boolean;
}

export interface MarkdownWriteOptions {
  includeFrontMatter?: boolean;
  frontMatter?: Record<string, any>;
}

class MarkdownFileRepository {
  private workspaceRoot: string | null = null;
  private dataDir: string | null = null;

  init(explicitDataDir?: string): boolean {
    if (explicitDataDir) {
      this.dataDir = explicitDataDir;
      this.workspaceRoot = path.dirname(explicitDataDir);
      logger.log(`✅ MD仓库手动初始化: ${this.dataDir}`);
      return true;
    }

    if (this.dataDir && fs.existsSync(this.dataDir)) {
      return true;
    }

    if (vscode) {
      const folders = vscode.workspace.workspaceFolders;
      if (!folders || folders.length === 0) {
        logger.warn('⚠️ 未找到工作区文件夹，MD文件存储功能可能受限');
        return false;
      }

      this.workspaceRoot = folders[0].uri.fsPath;
    } else {
      this.workspaceRoot = process.cwd();
    }

    if (!this.workspaceRoot) {
      logger.error('❌ 无法确定工作区根目录');
      return false;
    }

    this.dataDir = path.join(this.workspaceRoot, '.novel-assistant');

    if (!fs.existsSync(this.dataDir)) {
      try {
        fs.mkdirSync(this.dataDir, { recursive: true });
        logger.log(`✅ 创建数据目录: ${this.dataDir}`);
      } catch (e) {
        logger.error(`❌ 创建目录失败: ${e}`);
        return false;
      }
    }

    return true;
  }

  private ensureDataDir(): void {
    if (!this.dataDir) {
      throw new Error('数据存储未初始化');
    }
  }

  private getFilePath(fileName: string): string {
    this.ensureDataDir();
    return path.join(this.dataDir!, fileName);
  }

  exists(fileName: string): boolean {
    const filePath = this.getFilePath(fileName);
    return fs.existsSync(filePath);
  }

  read(fileName: string, options: MarkdownReadOptions = {}): MarkdownFile {
    const filePath = this.getFilePath(fileName);

    if (!fs.existsSync(filePath)) {
      logger.log(`⚠️ MD文件不存在: ${fileName}`);
      return {
        filePath,
        content: '',
        sections: []
      };
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const result: MarkdownFile = {
        filePath,
        content,
        sections: []
      };

      if (options.parseFrontMatter) {
        result.frontMatter = this.parseFrontMatter(content);
      }

      if (options.parseSections) {
        result.sections = this.parseSections(content);
      }

      return result;
    } catch (error) {
      logger.log(`❌ 读取MD文件失败: ${fileName}, 错误: ${error}`);
      throw error;
    }
  }

  write(fileName: string, content: string, options: MarkdownWriteOptions = {}): boolean {
    const filePath = this.getFilePath(fileName);

    try {
      let finalContent = content;

      if (options.includeFrontMatter && options.frontMatter) {
        const frontMatterStr = this.formatFrontMatter(options.frontMatter);
        finalContent = `${frontMatterStr}\n\n${content}`;
      }

      fs.writeFileSync(filePath, finalContent, 'utf-8');
      logger.log(`💾 MD文件已保存: ${fileName}`);
      return true;
    } catch (error) {
      logger.log(`❌ 保存MD文件失败: ${fileName}, 错误: ${error}`);
      return false;
    }
  }

  update(fileName: string, updates: Partial<MarkdownFile>): boolean {
    const existing = this.read(fileName, { parseSections: true, parseFrontMatter: true });

    const updatedContent = updates.content || existing.content;
    const updatedFrontMatter = updates.frontMatter || existing.frontMatter;

    return this.write(fileName, updatedContent, {
      includeFrontMatter: !!updatedFrontMatter,
      frontMatter: updatedFrontMatter
    });
  }

  delete(fileName: string): boolean {
    const filePath = this.getFilePath(fileName);

    if (!fs.existsSync(filePath)) {
      logger.log(`⚠️ MD文件不存在: ${fileName}`);
      return false;
    }

    try {
      fs.unlinkSync(filePath);
      logger.log(`🗑️ MD文件已删除: ${fileName}`);
      return true;
    } catch (error) {
      logger.log(`❌ 删除MD文件失败: ${fileName}, 错误: ${error}`);
      return false;
    }
  }

  list(pattern?: string): string[] {
    this.ensureDataDir();

    try {
      const files = fs.readdirSync(this.dataDir!);

      if (pattern) {
        const regex = new RegExp(pattern);
        return files.filter((file) => regex.test(file));
      }

      return files.filter((file) => file.endsWith('.md'));
    } catch (error) {
      logger.log(`❌ 列出MD文件失败: ${error}`);
      return [];
    }
  }

  private parseFrontMatter(content: string): Record<string, any> | undefined {
    const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
    const match = content.match(frontMatterRegex);

    if (!match) {
      return undefined;
    }

    try {
      const yamlContent = match[1];
      const result: Record<string, any> = {};

      const lines = yamlContent.split('\n');
      for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          let value: any = line.substring(colonIndex + 1).trim();

          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          } else if (value === 'true') {
            value = true;
          } else if (value === 'false') {
            value = false;
          } else if (!isNaN(Number(value))) {
            value = Number(value);
          }

          result[key] = value;
        }
      }

      return result;
    } catch (error) {
      logger.log(`⚠️ 解析front matter失败: ${error}`);
      return undefined;
    }
  }

  private formatFrontMatter(frontMatter: Record<string, any>): string {
    const lines = ['---'];
    for (const [key, value] of Object.entries(frontMatter)) {
      if (typeof value === 'string') {
        lines.push(`${key}: "${value}"`);
      } else {
        lines.push(`${key}: ${value}`);
      }
    }
    lines.push('---');
    return lines.join('\n');
  }

  private parseSections(content: string): MarkdownSection[] {
    const sections: MarkdownSection[] = [];
    const lines = content.split('\n');
    let currentSection: MarkdownSection | null = null;

    for (const line of lines) {
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);

      if (headerMatch) {
        if (currentSection) {
          sections.push(currentSection);
        }

        const level = headerMatch[1].length;
        const title = headerMatch[2].trim();
        currentSection = {
          title,
          content: '',
          level
        };
      } else if (currentSection) {
        currentSection.content += line + '\n';
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }

  getSection(fileName: string, sectionTitle: string): MarkdownSection | null {
    const file = this.read(fileName, { parseSections: true });
    const section = file.sections.find((s) => s.title === sectionTitle);
    return section || null;
  }

  updateSection(fileName: string, sectionTitle: string, newContent: string): boolean {
    const file = this.read(fileName, { parseSections: true });
    const sectionIndex = file.sections.findIndex((s) => s.title === sectionTitle);

    if (sectionIndex === -1) {
      logger.log(`⚠️ 未找到章节: ${sectionTitle}`);
      return false;
    }

    file.sections[sectionIndex].content = newContent;

    const newContentStr = this.rebuildContentFromSections(file.sections);
    return this.write(fileName, newContentStr);
  }

  private rebuildContentFromSections(sections: MarkdownSection[]): string {
    return sections.map((section) => {
      const header = '#'.repeat(section.level) + ' ' + section.title;
      return `${header}\n${section.content.trim()}\n`;
    }).join('\n');
  }
}

export const markdownFileRepository = new MarkdownFileRepository();
