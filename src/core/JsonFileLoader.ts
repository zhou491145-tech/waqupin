import * as fs from 'fs';
import { logger } from '../utils/logger';

/**
 * 通用 JSON 文件加载器
 * 提供统一的文件读写和错误处理
 */
export class JsonFileLoader<T> {
  /**
   * 同步加载 JSON 文件
   * @param filePath 文件路径
   * @param defaultValue 默认值（文件不存在或解析失败时返回）
   * @returns 解析后的数据或默认值
   */
  load(filePath: string, defaultValue: T): T {
    if (!filePath) {
      logger.debug('文件路径为空，返回默认值');
      return defaultValue;
    }

    if (!fs.existsSync(filePath)) {
      logger.debug(`文件不存在: ${filePath}`);
      return defaultValue;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (!content || content.trim() === '') {
        logger.debug(`文件为空: ${filePath}`);
        return defaultValue;
      }
      return JSON.parse(content) as T;
    } catch (error) {
      logger.error(`读取文件失败: ${filePath} - ${error}`);
      return defaultValue;
    }
  }

  /**
   * 同步保存数据到 JSON 文件
   * @param filePath 文件路径
   * @param data 要保存的数据
   * @returns 是否保存成功
   */
  save(filePath: string, data: T): boolean {
    if (!filePath) {
      logger.error('保存失败: 文件路径为空');
      return false;
    }

    try {
      const dir = require('path').dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const content = JSON.stringify(data, null, 2);
      fs.writeFileSync(filePath, content, 'utf-8');
      return true;
    } catch (error) {
      logger.error(`保存文件失败: ${filePath} - ${error}`);
      return false;
    }
  }

  /**
   * 异步加载 JSON 文件
   * @param filePath 文件路径
   * @param defaultValue 默认值
   * @returns Promise<T>
   */
  async loadAsync(filePath: string, defaultValue: T): Promise<T> {
    if (!filePath) {
      logger.debug('文件路径为空，返回默认值');
      return defaultValue;
    }

    try {
      if (!fs.existsSync(filePath)) {
        logger.debug(`文件不存在: ${filePath}`);
        return defaultValue;
      }

      const content = await fs.promises.readFile(filePath, 'utf-8');
      if (!content || content.trim() === '') {
        logger.debug(`文件为空: ${filePath}`);
        return defaultValue;
      }
      return JSON.parse(content) as T;
    } catch (error) {
      logger.error(`异步读取文件失败: ${filePath} - ${error}`);
      return defaultValue;
    }
  }

  /**
   * 异步保存数据到 JSON 文件
   * @param filePath 文件路径
   * @param data 要保存的数据
   * @returns Promise<boolean>
   */
  async saveAsync(filePath: string, data: T): Promise<boolean> {
    if (!filePath) {
      logger.error('保存失败: 文件路径为空');
      return false;
    }

    try {
      const dir = require('path').dirname(filePath);
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
      }

      const content = JSON.stringify(data, null, 2);
      await fs.promises.writeFile(filePath, content, 'utf-8');
      return true;
    } catch (error) {
      logger.error(`异步保存文件失败: ${filePath} - ${error}`);
      return false;
    }
  }
}
