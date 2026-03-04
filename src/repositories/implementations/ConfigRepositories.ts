import { BaseRepository } from '../../core/BaseRepository';
import { WritingStyle, ProjectConfig, NovelCategory, StyleTemplate, RefiningTemplate } from '../../data/storage';

/**
 * 写作风格仓库
 */
export class WritingStyleRepositoryImpl extends BaseRepository<WritingStyle> {
  constructor() {
    super('writingStyles.json');
  }

  findByName(name: string): WritingStyle | undefined {
    return this.loadAll().find(s => s.name === name);
  }

  getActive(): WritingStyle | undefined {
    return this.loadAll().find(s => s.isActive);
  }

  setActive(id: string): boolean {
    const styles = this.loadAll();
    
    // 取消所有激活状态
    styles.forEach(s => s.isActive = false);
    
    // 激活指定风格
    const target = styles.find(s => s.id === id);
    if (target) {
      target.isActive = true;
      return this.saveAll(styles);
    }
    
    return false;
  }
}

/**
 * 项目配置仓库
 */
export class ProjectConfigRepositoryImpl extends BaseRepository<ProjectConfig> {
  constructor() {
    super('projectConfig.json');
  }

  getMain(): ProjectConfig | undefined {
    const configs = this.loadAll();
    return configs.length > 0 ? configs[0] : undefined;
  }

  saveMain(config: ProjectConfig): boolean {
    return this.saveAll([config]);
  }
}

/**
 * 小说分类仓库
 */
export class NovelCategoryRepositoryImpl extends BaseRepository<NovelCategory> {
  constructor() {
    super('novelCategories.json');
  }

  findByName(name: string): NovelCategory | undefined {
    return this.loadAll().find(c => c.name === name);
  }

  findByParent(parentId: string | null): NovelCategory[] {
    return this.loadAll().filter(c => c.parentId === parentId);
  }

  getTopLevel(): NovelCategory[] {
    return this.findByParent(null);
  }
}

/**
 * 风格模板仓库
 */
export class StyleTemplateRepositoryImpl extends BaseRepository<StyleTemplate> {
  constructor() {
    super('styleTemplates.json');
  }

  findByCategory(category: string): StyleTemplate[] {
    return this.loadAll().filter(t => t.category === category);
  }

  findByName(name: string): StyleTemplate | undefined {
    return this.loadAll().find(t => t.name === name);
  }

  getBuiltIn(): StyleTemplate[] {
    return this.loadAll().filter(t => t.isBuiltIn);
  }

  getCustom(): StyleTemplate[] {
    return this.loadAll().filter(t => !t.isBuiltIn);
  }
}

/**
 * 精修模板仓库
 */
export class RefiningTemplateRepositoryImpl extends BaseRepository<RefiningTemplate> {
  constructor() {
    super('refiningTemplates.json');
  }

  findByCategory(category: string): RefiningTemplate[] {
    return this.loadAll().filter(t => t.category === category);
  }

  findByName(name: string): RefiningTemplate | undefined {
    return this.loadAll().find(t => t.name === name);
  }

  getBuiltIn(): RefiningTemplate[] {
    return this.loadAll().filter(t => t.isBuiltIn);
  }

  getCustom(): RefiningTemplate[] {
    return this.loadAll().filter(t => !t.isBuiltIn);
  }

  findByIds(ids: string[]): RefiningTemplate[] {
    const idsSet = new Set(ids);
    return this.loadAll().filter(t => idsSet.has(t.id));
  }
}
