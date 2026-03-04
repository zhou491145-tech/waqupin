import { Character } from '../../data/storage';

export interface ICharacterRepository {
  loadAll(): Character[];
  saveAll(characters: Character[]): boolean;
  add(character: Character): boolean;
  update(id: string, updates: Partial<Character>): boolean;
  delete(id: string): boolean;
  findById(id: string): Character | null;
  findByName(name: string): Character | null;
  findByRole(role: 'protagonist' | 'antagonist' | 'supporting' | 'minor'): Character[];
}
