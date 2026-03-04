import { Organization } from '../../data/storage';

export interface IOrganizationRepository {
  loadAll(): Organization[];
  saveAll(organizations: Organization[]): boolean;
  add(organization: Organization): boolean;
  update(id: string, updates: Partial<Organization>): boolean;
  delete(id: string): boolean;
  findById(id: string): Organization | null;
  findByType(type: 'faction' | 'family' | 'sect' | 'government' | 'other'): Organization[];
  generateId(): string;
}
