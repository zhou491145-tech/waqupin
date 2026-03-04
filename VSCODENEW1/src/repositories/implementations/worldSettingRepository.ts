import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../../utils/logger';
import { IWorldSettingRepository } from '../interfaces/worldSettingRepository';
import { WorldSetting } from '../../data/storage';

class WorldSettingRepository implements IWorldSettingRepository {
  private filePath: string | null = null;

  init(dataDir: string): boolean {
    this.filePath = path.join(dataDir, 'world-setting.json');
    return true;
  }

  load(): WorldSetting | null {
    if (!this.filePath || !fs.existsSync(this.filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      logger.log(`⚠️ 读取世界观数据失败: ${error}`);
      return null;
    }
  }

  save(setting: WorldSetting): boolean {
    if (!this.filePath) {
      logger.log('⚠️ 世界观数据文件路径未初始化');
      return false;
    }

    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.filePath, JSON.stringify(setting, null, 2), 'utf-8');
      return true;
    } catch (error) {
      logger.log(`⚠️ 保存世界观数据失败: ${error}`);
      return false;
    }
  }

  exists(): boolean {
    return this.filePath !== null && fs.existsSync(this.filePath);
  }

  delete(): boolean {
    if (!this.filePath || !fs.existsSync(this.filePath)) {
      logger.log('⚠️ 世界观数据文件不存在');
      return false;
    }

    try {
      fs.unlinkSync(this.filePath);
      return true;
    } catch (error) {
      logger.log(`⚠️ 删除世界观数据失败: ${error}`);
      return false;
    }
  }
}

export const worldSettingRepository = new WorldSettingRepository();
