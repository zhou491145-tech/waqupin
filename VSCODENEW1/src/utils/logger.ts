// 日志级别枚举
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

interface LogEntry {
  message: string;
  timestamp: number;
}

let vscode: any = null;
try {
  vscode = require('vscode');
} catch (error) {
}

class Logger {
  private _channel: any = null;
  private _useVsCode: boolean;
  private _logLevel: LogLevel = LogLevel.INFO;
  private _logCache: Map<string, LogEntry> = new Map();
  private _deduplicationWindowMs: number = 1000; // 1秒去重窗口

  constructor() {
    this._useVsCode = vscode !== null && vscode.window && typeof vscode.window.createOutputChannel === 'function';
  }

  get channel(): any {
    if (!this._channel && this._useVsCode) {
      this._channel = vscode.window.createOutputChannel('小说创作助手');
    }
    return this._channel;
  }

  init() {
    if (this._useVsCode) {
      this.channel.show(true);
      this.info('📝 输出面板已初始化');
    } else {
      this.info('📝 日志已初始化');
    }
  }

  /**
   * 设置日志级别
   */
  setLogLevel(level: LogLevel): void {
    this._logLevel = level;
  }

  /**
   * 检查日志是否重复
   */
  private isDuplicateLog(message: string): boolean {
    const now = Date.now();
    const cachedEntry = this._logCache.get(message);
    
    if (cachedEntry) {
      const timeSinceLastLog = now - cachedEntry.timestamp;
      if (timeSinceLastLog < this._deduplicationWindowMs) {
        return true;
      }
    }
    
    // 更新缓存
    this._logCache.set(message, { message, timestamp: now });
    
    // 清理过期缓存
    this._logCache.forEach((entry, key) => {
      if (now - entry.timestamp > this._deduplicationWindowMs * 10) { // 10倍窗口时间后清理
        this._logCache.delete(key);
      }
    });
    
    return false;
  }

  /**
   * 通用日志输出方法
   */
  private outputLog(level: LogLevel, levelLabel: string, message: string): void {
    if (level < this._logLevel) {
      return;
    }
    
    // 检查重复日志
    if (this.isDuplicateLog(message)) {
      return;
    }
    
    // 精简时间戳格式：YYYY-MM-DD HH:mm:ss
    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').slice(0, 19);
    const logMessage = `[${timestamp}] ${levelLabel} ${message}`;
    
    if (this._useVsCode) {
      this.channel.appendLine(logMessage);
    } else {
      switch (level) {
        case LogLevel.ERROR:
          console.error(logMessage);
          break;
        case LogLevel.WARN:
          console.warn(logMessage);
          break;
        default:
          console.log(logMessage);
      }
    }
  }

  /**
   * 调试日志
   */
  debug(message: string): void {
    this.outputLog(LogLevel.DEBUG, '🔍', message);
  }

  /**
   * 信息日志
   */
  info(message: string): void {
    this.outputLog(LogLevel.INFO, 'ℹ️', message);
  }

  /**
   * 警告日志
   */
  warn(message: string): void {
    this.outputLog(LogLevel.WARN, '⚠️', message);
  }

  /**
   * 错误日志
   */
  error(message: string): void {
    this.outputLog(LogLevel.ERROR, '❌', message);
  }

  /**
   * 保留原有log方法以保持兼容性，默认使用INFO级别
   */
  log(message: string): void {
    this.info(message);
  }
}

export const logger = new Logger();
