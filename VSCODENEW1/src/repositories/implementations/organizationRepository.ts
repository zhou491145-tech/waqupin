import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../utils/logger';
import { Organization } from '../../data/storage';
import { IOrganizationRepository } from '../interfaces/organizationRepository';

class OrganizationRepository implements IOrganizationRepository {
  private filePath: string | null = null;
  private counter = 1;

  init(dataDir: string): boolean {
    this.filePath = path.join(dataDir, 'organizations.json');
    
    const existing = this.loadAll();
    if (existing.length > 0) {
      const maxId = Math.max(...existing.map((o) => {
        const match = o.id.match(/^ORG(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      }));
      this.counter = maxId + 1;
    }
    
    return true;
  }

  loadAll(): Organization[] {
    if (!this.filePath || !fs.existsSync(this.filePath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      logger.log(`⚠️ 读取组织数据失败: ${error}`);
      return [];
    }
  }

  saveAll(organizations: Organization[]): boolean {
    if (!this.filePath) {
      logger.log('❌ 组织存储未初始化');
      return false;
    }

    try {
      fs.writeFileSync(this.filePath, JSON.stringify(organizations, null, 2), 'utf-8');
      logger.log(`💾 保存 ${organizations.length} 个组织到本地`);
      return true;
    } catch (error) {
      logger.log(`❌ 保存组织数据失败: ${error}`);
      return false;
    }
  }

  add(organization: Organization): boolean {
    const all = this.loadAll();
    all.push(organization);
    return this.saveAll(all);
  }

  update(id: string, updates: Partial<Organization>): boolean {
    const all = this.loadAll();
    const index = all.findIndex((o) => o.id === id);
    if (index === -1) {
      logger.log(`⚠️ 未找到组织: ${id}`);
      return false;
    }

    all[index] = { ...all[index], ...updates, updatedAt: new Date().toISOString() };
    return this.saveAll(all);
  }

  delete(id: string): boolean {
    const all = this.loadAll();
    const filtered = all.filter((o) => o.id !== id);
    if (filtered.length === all.length) {
      logger.log(`⚠️ 未找到组织: ${id}`);
      return false;
    }

    return this.saveAll(filtered);
  }

  findById(id: string): Organization | null {
    const all = this.loadAll();
    return all.find((o) => o.id === id) || null;
  }

  findByType(type: 'faction' | 'family' | 'sect' | 'government' | 'other'): Organization[] {
    const all = this.loadAll();
    return all.filter((o) => o.type === type);
  }

  generateId(): string {
    const id = `ORG${String(this.counter).padStart(4, '0')}`;
    this.counter++;
    return id;
  }
}

export const organizationRepository = new OrganizationRepository();
