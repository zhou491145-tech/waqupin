import { WritingStyle } from '../../data/storage';

export interface IWritingStyleRepository {
  load(): WritingStyle | null;
  save(style: WritingStyle): boolean;
  exists(): boolean;
  delete(): boolean;
}
