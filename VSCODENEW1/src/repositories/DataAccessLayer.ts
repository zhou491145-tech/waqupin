import { container, ServiceTokens } from '../core/ServiceContainer';
import { globalCache } from '../core/DataCache';
import { ForeshadowRepositoryImpl } from './implementations/ForeshadowRepositoryImpl';
import { CharacterRepositoryImpl } from './implementations/CharacterRepositoryImpl';
import { SummaryRepositoryImpl } from './implementations/SummaryRepositoryImpl';
import { OutlineRepositoryImpl } from './implementations/OutlineRepositoryImpl';
import { WorldSettingRepositoryImpl } from './implementations/WorldSettingRepositoryImpl';
import { OrganizationRepositoryImpl } from './implementations/OrganizationRepositoryImpl';
import {
  WritingStyleRepositoryImpl,
  ProjectConfigRepositoryImpl,
  NovelCategoryRepositoryImpl,
  StyleTemplateRepositoryImpl,
  RefiningTemplateRepositoryImpl
} from './implementations/ConfigRepositories';
import {
  CharacterTimelineRepositoryImpl,
  CharacterRelationshipRepositoryImpl,
  CharacterHistoryRepositoryImpl,
  CharacterAttributeRepositoryImpl
} from './implementations/CharacterExtendedRepositories';
import { logger } from '../utils/logger';

/**
 * 统一的数据访问层
 * 提供对所有仓库的访问
 */
export class DataAccessLayer {
  // 仓库实例（通过 DI 容器获取）
  public readonly foreshadows: ForeshadowRepositoryImpl;
  public readonly characters: CharacterRepositoryImpl;
  public readonly summaries: SummaryRepositoryImpl;
  public readonly outlines: OutlineRepositoryImpl;
  public readonly worldSettings: WorldSettingRepositoryImpl;
  public readonly organizations: OrganizationRepositoryImpl;
  public readonly writingStyles: WritingStyleRepositoryImpl;
  public readonly projectConfigs: ProjectConfigRepositoryImpl;
  public readonly novelCategories: NovelCategoryRepositoryImpl;
  public readonly styleTemplates: StyleTemplateRepositoryImpl;
  public readonly refiningTemplates: RefiningTemplateRepositoryImpl;
  public readonly characterTimelines: CharacterTimelineRepositoryImpl;
  public readonly characterRelationships: CharacterRelationshipRepositoryImpl;
  public readonly characterHistories: CharacterHistoryRepositoryImpl;
  public readonly characterAttributes: CharacterAttributeRepositoryImpl;

  constructor() {
    // 从容器解析所有仓库
    this.foreshadows = container.resolve(ServiceTokens.FORESHADOW_REPO);
    this.characters = container.resolve(ServiceTokens.CHARACTER_REPO);
    this.summaries = container.resolve(ServiceTokens.SUMMARY_REPO);
    this.outlines = container.resolve(ServiceTokens.OUTLINE_REPO);
    this.worldSettings = container.resolve(ServiceTokens.WORLD_SETTING_REPO);
    this.organizations = container.resolve(ServiceTokens.ORGANIZATION_REPO);
    this.writingStyles = container.resolve(ServiceTokens.WRITING_STYLE_REPO);
    this.projectConfigs = container.resolve(ServiceTokens.PROJECT_CONFIG_REPO);
    this.novelCategories = container.resolve(ServiceTokens.NOVEL_CATEGORY_REPO);
    this.styleTemplates = container.resolve(ServiceTokens.STYLE_TEMPLATE_REPO);
    this.refiningTemplates = container.resolve(ServiceTokens.REFINING_TEMPLATE_REPO);
    this.characterTimelines = container.resolve(ServiceTokens.CHARACTER_TIMELINE_REPO);
    this.characterRelationships = container.resolve(ServiceTokens.CHARACTER_RELATIONSHIP_REPO);
    this.characterHistories = container.resolve(ServiceTokens.CHARACTER_HISTORY_REPO);
    this.characterAttributes = container.resolve(ServiceTokens.CHARACTER_ATTRIBUTE_REPO);
  }

  /**
   * 初始化所有仓库
   * @param dataDir 数据目录
   */
  initAll(dataDir: string): void {
    logger.log(`📦 初始化数据访问层: ${dataDir}`);

    this.foreshadows.init(dataDir);
    this.characters.init(dataDir);
    this.summaries.init(dataDir);
    this.outlines.init(dataDir);
    this.worldSettings.init(dataDir);
    this.organizations.init(dataDir);
    this.writingStyles.init(dataDir);
    this.projectConfigs.init(dataDir);
    this.novelCategories.init(dataDir);
    this.styleTemplates.init(dataDir);
    this.refiningTemplates.init(dataDir);
    this.characterTimelines.init(dataDir);
    this.characterRelationships.init(dataDir);
    this.characterHistories.init(dataDir);
    this.characterAttributes.init(dataDir);

    logger.log('✅ 所有仓库初始化完成');
  }

  /**
   * 使指定文件的缓存失效
   * @param fileName 文件名（如 'foreshadows.json'）
   */
  invalidateCacheByFile(fileName: string): void {
    const cacheKey = `repo:${fileName}`;
    globalCache.invalidate(cacheKey);
    logger.debug(`已失效缓存: ${fileName}`);
  }

  /**
   * 清空所有缓存
   */
  clearAllCaches(): void {
    globalCache.clear();
    logger.log('已清空所有数据缓存');
  }
}

/**
 * 注册所有仓库到 DI 容器
 */
export function registerRepositories(): void {
  container.registerSingleton(ServiceTokens.FORESHADOW_REPO, () => new ForeshadowRepositoryImpl());
  container.registerSingleton(ServiceTokens.CHARACTER_REPO, () => new CharacterRepositoryImpl());
  container.registerSingleton(ServiceTokens.SUMMARY_REPO, () => new SummaryRepositoryImpl());
  container.registerSingleton(ServiceTokens.OUTLINE_REPO, () => new OutlineRepositoryImpl());
  container.registerSingleton(ServiceTokens.WORLD_SETTING_REPO, () => new WorldSettingRepositoryImpl());
  container.registerSingleton(ServiceTokens.ORGANIZATION_REPO, () => new OrganizationRepositoryImpl());
  container.registerSingleton(ServiceTokens.WRITING_STYLE_REPO, () => new WritingStyleRepositoryImpl());
  container.registerSingleton(ServiceTokens.PROJECT_CONFIG_REPO, () => new ProjectConfigRepositoryImpl());
  container.registerSingleton(ServiceTokens.NOVEL_CATEGORY_REPO, () => new NovelCategoryRepositoryImpl());
  container.registerSingleton(ServiceTokens.STYLE_TEMPLATE_REPO, () => new StyleTemplateRepositoryImpl());
  container.registerSingleton(ServiceTokens.REFINING_TEMPLATE_REPO, () => new RefiningTemplateRepositoryImpl());
  container.registerSingleton(ServiceTokens.CHARACTER_TIMELINE_REPO, () => new CharacterTimelineRepositoryImpl());
  container.registerSingleton(ServiceTokens.CHARACTER_RELATIONSHIP_REPO, () => new CharacterRelationshipRepositoryImpl());
  container.registerSingleton(ServiceTokens.CHARACTER_HISTORY_REPO, () => new CharacterHistoryRepositoryImpl());
  container.registerSingleton(ServiceTokens.CHARACTER_ATTRIBUTE_REPO, () => new CharacterAttributeRepositoryImpl());

  // 注册缓存服务
  container.registerInstance(ServiceTokens.DATA_CACHE, globalCache);

  logger.log('✅ 所有仓库已注册到 DI 容器');
}

/**
 * 创建数据访问层实例
 * @returns DataAccessLayer 实例
 */
export function createDataAccessLayer(): DataAccessLayer {
  return new DataAccessLayer();
}
