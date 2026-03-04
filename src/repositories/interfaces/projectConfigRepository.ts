import { ProjectConfig } from '../../data/storage';

export interface IProjectConfigRepository {
  load(): ProjectConfig | null;
  save(config: ProjectConfig): boolean;
  exists(): boolean;
  delete(): boolean;
}
