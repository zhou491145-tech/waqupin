import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';
import { vscode } from '../utils/vscode';

// 文件类型枚举
export enum FileType {
  CHAPTER = 'chapter',
  IMPORT = 'import',
  TEMPLATE = 'template',
  WRITING_STYLE = 'writingStyle',
  BACKUP = 'backup',
  DATA = 'data'
}

// 文件管理配置
export interface FileManagementConfig {
  userDirectory: string; // 用户文件主目录
  chapterFileExtension: string; // 章节文件扩展名
  autoOpenGeneratedFiles: boolean; // 是否自动打开生成的文件
}

/**
 * 文件管理服务 - 统一管理用户文件和插件内部文件
 */
export class FileManagementService {
  private static instance: FileManagementService;
  private config: FileManagementConfig;
  private workspaceRoot: string | null = null;
  private fileWatchers: Map<string, fs.FSWatcher> = new Map();

  private constructor() {
    // 默认配置
    this.config = {
      userDirectory: 'AAA',
      chapterFileExtension: 'md',
      autoOpenGeneratedFiles: true
    };
    
    logger.log('📁 文件管理服务已初始化');
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): FileManagementService {
    if (!FileManagementService.instance) {
      FileManagementService.instance = new FileManagementService();
    }
    return FileManagementService.instance;
  }

  /**
   * 初始化文件管理服务
   */
  public init(): boolean {
    try {
      // 获取VSCode工作区根目录
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        this.workspaceRoot = workspaceFolders[0].uri.fsPath;
        logger.log(`📁 工作区根目录: ${this.workspaceRoot}`);
        
        // 初始化目录结构
        this.ensureDirectoryStructure();
        
        // 启动文件监听
        this.startFileWatchers();
        
        return true;
      } else {
        logger.warn('⚠️ 未找到工作区，文件管理服务无法初始化');
        return false;
      }
    } catch (error) {
      logger.error(`❌ 文件管理服务初始化失败: ${error}`);
      return false;
    }
  }

  /**
   * 更新配置
   */
  public updateConfig(config: Partial<FileManagementConfig>): void {
    this.config = { ...this.config, ...config };
    logger.log(`🔧 文件管理配置已更新: ${JSON.stringify(this.config)}`);
    
    // 重新初始化目录结构
    this.ensureDirectoryStructure();
  }

  /**
   * 获取当前配置
   */
  public getConfig(): FileManagementConfig {
    return { ...this.config };
  }

  /**
   * 确保目录结构存在
   */
  public ensureDirectoryStructure(): void {
    if (!this.workspaceRoot) {
      logger.warn('⚠️ 未找到工作区，无法创建目录结构');
      return;
    }

    // 用户文件目录结构
    const userDirs = [
      path.join(this.workspaceRoot, this.config.userDirectory, 'chapters'),
      path.join(this.workspaceRoot, this.config.userDirectory, 'imports'),
      path.join(this.workspaceRoot, this.config.userDirectory, 'backups')
    ];

    // 插件内部文件目录结构
    const pluginDirs = [
      path.join(this.workspaceRoot, '.novel-assistant', 'data'),
      path.join(this.workspaceRoot, '.novel-assistant', 'templates'),
      path.join(this.workspaceRoot, '.novel-assistant', 'writing-styles'),
      path.join(this.workspaceRoot, '.novel-assistant', 'backups')
    ];

    // 确保所有目录存在
    for (const dir of [...userDirs, ...pluginDirs]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.log(`✅ 已创建目录: ${dir}`);
      }
    }
  }

  /**
   * 生成章节文件
   */
  public async generateChapterFile(
    chapterInfo: {
      chapterNumber: number;
      title: string;
      content: string;
    }
  ): Promise<string | null> {
    if (!this.workspaceRoot) {
      logger.error('❌ 未找到工作区，无法生成章节文件');
      return null;
    }

    try {
      const { chapterNumber, title, content } = chapterInfo;
      
      // 生成文件名
      const fileName = `第${chapterNumber}章-${title}.${this.config.chapterFileExtension}`;
      const filePath = path.join(this.workspaceRoot, this.config.userDirectory, 'chapters', fileName);
      
      // 写入文件
      await fs.promises.writeFile(filePath, content, 'utf-8');
      logger.log(`✅ 已生成章节文件: ${filePath}`);
      
      // 自动打开文件
      if (this.config.autoOpenGeneratedFiles) {
        this.openFileInEditor(filePath);
      }
      
      return filePath;
    } catch (error) {
      logger.error(`❌ 生成章节文件失败: ${error}`);
      return null;
    }
  }

  /**
   * 导入用户文件
   */
  public async importUserFile(filePath: string): Promise<string | null> {
    if (!this.workspaceRoot) {
      logger.error('❌ 未找到工作区，无法导入文件');
      return null;
    }

    try {
      const fileName = path.basename(filePath);
      const importPath = path.join(this.workspaceRoot, this.config.userDirectory, 'imports', fileName);
      
      // 复制文件到导入目录
      await fs.promises.copyFile(filePath, importPath);
      logger.log(`✅ 已导入文件: ${importPath}`);
      
      return importPath;
    } catch (error) {
      logger.error(`❌ 导入文件失败: ${error}`);
      return null;
    }
  }

  /**
   * 在VSCode编辑器中打开文件
   */
  public async openFileInEditor(filePath: string): Promise<void> {
    try {
      // 使用VSCode API打开文件
      if (vscode && vscode.workspace && vscode.window) {
        const uri = vscode.Uri.file(filePath);
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc);
        logger.log(`📄 已在编辑器中打开文件: ${filePath}`);
      } else {
        logger.warn('⚠️ 无法访问VSCode API，无法打开文件');
      }
    } catch (error) {
      logger.error(`❌ 在编辑器中打开文件失败: ${error}`);
    }
  }

  /**
   * 获取指定类型的文件列表
   */
  public getFilesByType(type: FileType): string[] {
    if (!this.workspaceRoot) {
      return [];
    }

    try {
      let directory: string;
      let pattern: string;

      switch (type) {
        case FileType.CHAPTER:
          directory = path.join(this.workspaceRoot, this.config.userDirectory, 'chapters');
          pattern = `*.${this.config.chapterFileExtension}`;
          break;
        case FileType.IMPORT:
          directory = path.join(this.workspaceRoot, this.config.userDirectory, 'imports');
          pattern = '*';
          break;
        case FileType.TEMPLATE:
          directory = path.join(this.workspaceRoot, '.novel-assistant', 'templates');
          pattern = '*.txt';
          break;
        case FileType.WRITING_STYLE:
          directory = path.join(this.workspaceRoot, '.novel-assistant', 'writing-styles');
          pattern = '*.json';
          break;
        case FileType.BACKUP:
          directory = path.join(this.workspaceRoot, this.config.userDirectory, 'backups');
          pattern = '*';
          break;
        case FileType.DATA:
          directory = path.join(this.workspaceRoot, '.novel-assistant', 'data');
          pattern = '*.json';
          break;
        default:
          return [];
      }

      // 检查目录是否存在
      if (!fs.existsSync(directory)) {
        return [];
      }

      // 获取文件列表
      const files = fs.readdirSync(directory);
      const filteredFiles = pattern === '*' 
        ? files 
        : files.filter(file => file.match(new RegExp(pattern)));

      return filteredFiles.map(file => path.join(directory, file));
    } catch (error) {
      logger.error(`❌ 获取文件列表失败: ${error}`);
      return [];
    }
  }

  /**
   * 获取章节文件列表
   */
  public getChapterFiles(): string[] {
    return this.getFilesByType(FileType.CHAPTER);
  }

  /**
   * 获取导入文件列表
   */
  public getImportFiles(): string[] {
    return this.getFilesByType(FileType.IMPORT);
  }

  /**
   * 启动文件监听
   */
  public startFileWatchers(): void {
    if (!this.workspaceRoot) {
      return;
    }

    // 停止现有监听
    this.stopFileWatchers();

    // 监听章节文件变化
    const chaptersDir = path.join(this.workspaceRoot, this.config.userDirectory, 'chapters');
    this.startWatcher(chaptersDir, '*.md', (eventType, filename) => {
      this.handleFileChange(FileType.CHAPTER, eventType, path.join(chaptersDir, filename));
    });

    // 监听导入文件变化
    const importsDir = path.join(this.workspaceRoot, this.config.userDirectory, 'imports');
    this.startWatcher(importsDir, '*', (eventType, filename) => {
      this.handleFileChange(FileType.IMPORT, eventType, path.join(importsDir, filename));
    });

    logger.log('👁️ 文件监听已启动');
  }

  /**
   * 启动单个文件监听
   */
  private startWatcher(directory: string, pattern: string, callback: (eventType: string, filename: string) => void): void {
    try {
      const watcher = fs.watch(directory, { encoding: 'utf-8' }, (eventType, filename) => {
        if (filename) {
          callback(eventType, filename);
        }
      });
      this.fileWatchers.set(directory, watcher);
      logger.log(`👁️ 已启动文件监听: ${directory}`);
    } catch (error) {
      logger.error(`❌ 启动文件监听失败: ${error}`);
    }
  }

  /**
   * 停止文件监听
   */
  public stopFileWatchers(): void {
    for (const [directory, watcher] of this.fileWatchers) {
      watcher.close();
      logger.log(`⏹️ 已停止文件监听: ${directory}`);
    }
    this.fileWatchers.clear();
  }

  /**
   * 处理文件变化
   */
  private handleFileChange(fileType: FileType, eventType: string, filePath: string): void {
    logger.log(`📁 文件变化: ${eventType} - ${filePath}`);
    
    // 触发文件变化事件
    // 这里可以通过事件系统通知其他服务
    // 例如：当章节文件变化时，触发章节分析
    
    switch (fileType) {
      case FileType.CHAPTER:
        if (eventType === 'change') {
          logger.debug(`📝 章节文件已修改: ${filePath}`);
          // 这里可以触发章节分析或数据更新
        } else if (eventType === 'rename') {
          logger.debug(`📄 章节文件已重命名: ${filePath}`);
        } else if (eventType === 'delete') {
          logger.debug(`🗑️ 章节文件已删除: ${filePath}`);
        }
        break;
      case FileType.IMPORT:
        if (eventType === 'change') {
          logger.debug(`📝 导入文件已修改: ${filePath}`);
        } else if (eventType === 'rename') {
          logger.debug(`📄 导入文件已重命名: ${filePath}`);
        } else if (eventType === 'delete') {
          logger.debug(`🗑️ 导入文件已删除: ${filePath}`);
        }
        break;
    }
  }

  /**
   * 设置工作区根目录
   */
  public setWorkspaceRoot(workspaceRoot: string): void {
    this.workspaceRoot = workspaceRoot;
    logger.log(`📁 工作区根目录已设置: ${workspaceRoot}`);
    
    // 初始化目录结构
    this.ensureDirectoryStructure();
    
    // 启动文件监听
    this.startFileWatchers();
  }

  /**
   * 健康检查
   */
  public healthCheck(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // 简单的健康检查：检查必要目录是否存在
        if (this.workspaceRoot) {
          const userDir = path.join(this.workspaceRoot, this.config.userDirectory);
          const pluginDir = path.join(this.workspaceRoot, '.novel-assistant');
          
          if (fs.existsSync(userDir) && fs.existsSync(pluginDir)) {
            resolve(true);
          } else {
            resolve(false);
          }
        } else {
          resolve(true); // 没有工作区时，健康检查通过
        }
      } catch (error) {
        logger.error(`❌ 文件管理服务健康检查失败: ${error}`);
        resolve(false);
      }
    });
  }
}

// 导出单例实例
export const fileManagementService = FileManagementService.getInstance();
