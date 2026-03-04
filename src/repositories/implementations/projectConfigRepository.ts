import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../../utils/logger';
import { IProjectConfigRepository } from '../interfaces/projectConfigRepository';
import { ProjectConfig } from '../../data/storage';

class ProjectConfigRepository implements IProjectConfigRepository {
  private filePath: string | null = null;

  init(dataDir: string): boolean {
    this.filePath = path.join(dataDir, 'projectConfig.json');
    return true;
  }

  load(): ProjectConfig | null {
    if (!this.filePath || !fs.existsSync(this.filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      logger.log(`⚠️ 读取项目配置失败: ${error}`);
      return null;
    }
  }

  save(config: ProjectConfig): boolean {
    if (!this.filePath) {
      logger.log('⚠️ 项目配置文件路径未初始化');
      return false;
    }

    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.filePath, JSON.stringify(config, null, 2), 'utf-8');
      return true;
    } catch (error) {
      logger.log(`⚠️ 保存项目配置失败: ${error}`);
      return false;
    }
  }

  update(updates: Partial<ProjectConfig>): boolean {
    const current = this.load();

    if (!current) {
      logger.log('⚠️ 未找到项目配置');
      return false;
    }

    const updated = { ...current, ...updates };
    return this.save(updated);
  }

  delete(): boolean {
    if (!this.filePath || !fs.existsSync(this.filePath)) {
      logger.log('⚠️ 项目配置文件不存在');
      return false;
    }

    try {
      fs.unlinkSync(this.filePath);
      return true;
    } catch (error) {
      logger.log(`⚠️ 删除项目配置失败: ${error}`);
      return false;
    }
  }

  exists(): boolean {
    return this.filePath !== null && fs.existsSync(this.filePath);
  }
}

export const projectConfigRepository = new ProjectConfigRepository();
