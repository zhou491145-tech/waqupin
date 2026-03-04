import { Foreshadow } from '../../data/storage';

export interface IForeshadowRepository {
  loadAll(): Foreshadow[];
  saveAll(foreshadows: Foreshadow[]): boolean;
  add(foreshadow: Foreshadow): boolean;
  update(id: string, updates: Partial<Foreshadow>): boolean;
  delete(id: string): boolean;
  findById(id: string): Foreshadow | null;
  findByStatus(status: 'pending' | 'resolved' | 'abandoned'): Foreshadow[];
  findByChapter(chapterNumber: number): Foreshadow[];
  generateId(): string;
}
