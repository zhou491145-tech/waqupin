import { Outline } from '../../data/storage';

export interface IOutlineRepository {
  loadAll(): Outline[];
  saveAll(outlines: Outline[]): boolean;
  add(outline: Outline): boolean;
  update(id: string, updates: Partial<Outline>): boolean;
  delete(id: string): boolean;
  findById(id: string): Outline | null;
  findByChapter(chapterNumber: number): Outline[];
  findByType(type: 'volume' | 'chapter' | 'scene'): Outline[];
  generateId(): string;
}
