import { BaseRepository } from '../../core/BaseRepository';
import { WorldSetting } from '../../data/storage';

/**
 * 世界观设定仓库
 */
export class WorldSettingRepositoryImpl extends BaseRepository<WorldSetting> {
  constructor() {
    super('worldSetting.json');
  }

  /**
   * 获取主世界设定（通常只有一个）
   */
  getMain(): WorldSetting | undefined {
    const settings = this.loadAll();
    return settings.length > 0 ? settings[0] : undefined;
  }

  /**
   * 保存主世界设定
   */
  saveMain(setting: WorldSetting): boolean {
    return this.saveAll([setting]);
  }

  /**
   * 根据标题搜索
   */
  findByTitle(title: string): WorldSetting | undefined {
    return this.loadAll().find(s => s.title === title);
  }

  /**
   * 根据时代搜索
   */
  findByTimePeriod(timePeriod: string): WorldSetting[] {
    return this.loadAll().filter(s => 
      s.timePeriod.toLowerCase().includes(timePeriod.toLowerCase())
    );
  }

  /**
   * 根据地点搜索
   */
  findByLocation(location: string): WorldSetting[] {
    return this.loadAll().filter(s => 
      s.location.toLowerCase().includes(location.toLowerCase())
    );
  }
}
