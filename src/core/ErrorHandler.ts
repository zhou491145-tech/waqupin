import { logger } from '../utils/logger';

/**
 * 错误代码枚举
 */
export enum ErrorCode {
  UNKNOWN = 'UNKNOWN',
  NETWORK_ERROR = 'NETWORK_ERROR',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  PARSE_ERROR = 'PARSE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  TIMEOUT = 'TIMEOUT',
  API_ERROR = 'API_ERROR',
  CONFIG_ERROR = 'CONFIG_ERROR'
}

/**
 * 错误处理结果接口
 */
export interface ErrorResult {
  shouldRetry: boolean;
  delay?: number;
  errorCode: ErrorCode;
  message: string;
}

/**
 * 统一错误处理器
 * 提供错误分类、重试判断和错误上报
 */
export class ErrorHandler {
  /**
   * 处理错误
   * @param error 错误对象
   * @param context 错误上下文（服务名、操作名等）
   * @returns 错误处理结果
   */
  static handle(error: any, context: string): ErrorResult {
    const errorCode = this.classifyError(error);
    const message = this.extractMessage(error);

    logger.error(`[${context}] ${errorCode}: ${message} ${error.stack || ''}`.trim());

    const shouldRetry = this.isRetryable(errorCode);
    const delay = shouldRetry ? this.getRetryDelay(errorCode) : undefined;

    return {
      shouldRetry,
      delay,
      errorCode,
      message
    };
  }

  /**
   * 分类错误类型
   * @param error 错误对象
   * @returns 错误代码
   */
  private static classifyError(error: any): ErrorCode {
    if (!error) {
      return ErrorCode.UNKNOWN;
    }

    const message = String(error.message || error).toLowerCase();

    if (message.includes('enoent') || message.includes('file not found')) {
      return ErrorCode.FILE_NOT_FOUND;
    }

    if (message.includes('json') || message.includes('parse')) {
      return ErrorCode.PARSE_ERROR;
    }

    if (message.includes('eacces') || message.includes('permission')) {
      return ErrorCode.PERMISSION_DENIED;
    }

    if (message.includes('timeout') || message.includes('timed out')) {
      return ErrorCode.TIMEOUT;
    }

    if (message.includes('network') || message.includes('enotfound') || message.includes('econnrefused')) {
      return ErrorCode.NETWORK_ERROR;
    }

    if (error.response || message.includes('api') || message.includes('status code')) {
      return ErrorCode.API_ERROR;
    }

    if (message.includes('config') || message.includes('invalid')) {
      return ErrorCode.CONFIG_ERROR;
    }

    return ErrorCode.UNKNOWN;
  }

  /**
   * 提取错误消息
   * @param error 错误对象
   * @returns 错误消息
   */
  private static extractMessage(error: any): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (error?.response?.data?.message) {
      return error.response.data.message;
    }

    if (error?.message) {
      return error.message;
    }

    return String(error);
  }

  /**
   * 判断错误是否可重试
   * @param errorCode 错误代码
   * @returns 是否可重试
   */
  private static isRetryable(errorCode: ErrorCode): boolean {
    const retryableErrors = [
      ErrorCode.NETWORK_ERROR,
      ErrorCode.TIMEOUT,
      ErrorCode.API_ERROR
    ];

    return retryableErrors.includes(errorCode);
  }

  /**
   * 获取重试延迟时间
   * @param errorCode 错误代码
   * @returns 延迟时间（毫秒）
   */
  private static getRetryDelay(errorCode: ErrorCode): number {
    switch (errorCode) {
      case ErrorCode.NETWORK_ERROR:
        return 3000; // 3 秒
      case ErrorCode.TIMEOUT:
        return 5000; // 5 秒
      case ErrorCode.API_ERROR:
        return 2000; // 2 秒
      default:
        return 1000; // 1 秒
    }
  }

  /**
   * 尝试执行操作，失败时自动重试
   * @param operation 要执行的操作
   * @param context 操作上下文
   * @param maxRetries 最大重试次数
   * @returns Promise<T | null>
   */
  static async retry<T>(
    operation: () => Promise<T>,
    context: string,
    maxRetries: number = 3
  ): Promise<T | null> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const result = this.handle(error, context);

        if (!result.shouldRetry || attempt === maxRetries) {
          logger.error(`[${context}] 操作失败，已达到最大重试次数 (${maxRetries})`);
          return null;
        }

        logger.warn(`[${context}] 操作失败，${result.delay}ms 后重试 (尝试 ${attempt + 1}/${maxRetries})`);
        await this.sleep(result.delay || 1000);
      }
    }

    return null;
  }

  /**
   * 延迟指定时间
   * @param ms 毫秒数
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
