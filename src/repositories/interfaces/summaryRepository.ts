import { ChapterSummary } from '../../data/storage';

export interface ISummaryRepository {
  loadAll(): ChapterSummary[];
  saveAll(summaries: ChapterSummary[]): boolean;
  add(summary: ChapterSummary): boolean;
  update(id: string, updates: Partial<ChapterSummary>): boolean;
  delete(id: string): boolean;
  findById(id: string): ChapterSummary | null;
  findByChapter(chapterNumber: number): ChapterSummary | null;
  generateId(): string;
}
