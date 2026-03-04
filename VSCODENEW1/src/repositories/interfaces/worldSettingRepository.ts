import { WorldSetting } from '../../data/storage';

export interface IWorldSettingRepository {
  load(): WorldSetting | null;
  save(setting: WorldSetting): boolean;
  exists(): boolean;
  delete(): boolean;
}
