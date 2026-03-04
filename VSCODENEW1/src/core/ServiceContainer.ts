import { logger } from '../utils/logger';

/**
 * 服务生命周期
 */
export enum ServiceLifetime {
  SINGLETON = 'singleton',
  TRANSIENT = 'transient'
}

/**
 * 服务描述符
 */
interface ServiceDescriptor {
  token: string | symbol;
  factory: () => any;
  lifetime: ServiceLifetime;
  instance?: any;
}

/**
 * 轻量级依赖注入容器
 * 管理服务的注册、解析和生命周期
 */
export class ServiceContainer {
  private services = new Map<string | symbol, ServiceDescriptor>();
  private resolving = new Set<string | symbol>();

  /**
   * 注册单例服务
   * @param token 服务标识
   * @param factory 服务工厂函数
   */
  registerSingleton<T>(token: string | symbol, factory: () => T): void {
    this.services.set(token, {
      token,
      factory,
      lifetime: ServiceLifetime.SINGLETON
    });
    logger.debug(`已注册单例服务: ${String(token)}`);
  }

  /**
   * 注册瞬时服务（每次解析都创建新实例）
   * @param token 服务标识
   * @param factory 服务工厂函数
   */
  registerTransient<T>(token: string | symbol, factory: () => T): void {
    this.services.set(token, {
      token,
      factory,
      lifetime: ServiceLifetime.TRANSIENT
    });
    logger.debug(`已注册瞬时服务: ${String(token)}`);
  }

  /**
   * 注册已存在的实例
   * @param token 服务标识
   * @param instance 服务实例
   */
  registerInstance<T>(token: string | symbol, instance: T): void {
    this.services.set(token, {
      token,
      factory: () => instance,
      lifetime: ServiceLifetime.SINGLETON,
      instance
    });
    logger.debug(`已注册服务实例: ${String(token)}`);
  }

  /**
   * 解析服务
   * @param token 服务标识
   * @returns 服务实例
   */
  resolve<T>(token: string | symbol): T {
    const descriptor = this.services.get(token);
    
    if (!descriptor) {
      throw new Error(`服务未注册: ${String(token)}`);
    }

    // 检测循环依赖
    if (this.resolving.has(token)) {
      const chain = Array.from(this.resolving).map(t => String(t)).join(' -> ');
      throw new Error(`检测到循环依赖: ${chain} -> ${String(token)}`);
    }

    // 单例服务：返回缓存的实例
    if (descriptor.lifetime === ServiceLifetime.SINGLETON && descriptor.instance) {
      return descriptor.instance as T;
    }

    // 解析服务
    this.resolving.add(token);
    
    try {
      const instance = descriptor.factory();
      
      // 缓存单例实例
      if (descriptor.lifetime === ServiceLifetime.SINGLETON) {
        descriptor.instance = instance;
      }
      
      return instance as T;
    } finally {
      this.resolving.delete(token);
    }
  }

  /**
   * 尝试解析服务（失败返回 undefined）
   * @param token 服务标识
   * @returns 服务实例或 undefined
   */
  tryResolve<T>(token: string | symbol): T | undefined {
    try {
      return this.resolve<T>(token);
    } catch (error) {
      logger.warn(`解析服务失败: ${String(token)}`);
      return undefined;
    }
  }

  /**
   * 检查服务是否已注册
   * @param token 服务标识
   * @returns 是否已注册
   */
  has(token: string | symbol): boolean {
    return this.services.has(token);
  }

  /**
   * 清空所有服务
   */
  clear(): void {
    this.services.clear();
    this.resolving.clear();
    logger.debug('已清空所有服务注册');
  }

  /**
   * 获取所有已注册的服务标识
   */
  getRegisteredTokens(): (string | symbol)[] {
    return Array.from(this.services.keys());
  }

  /**
   * 批量注册服务
   * @param registrations 服务注册配置数组
   */
  registerBatch(registrations: Array<{
    token: string | symbol;
    factory: () => any;
    lifetime?: ServiceLifetime;
  }>): void {
    registrations.forEach(reg => {
      const lifetime = reg.lifetime ?? ServiceLifetime.SINGLETON;
      
      if (lifetime === ServiceLifetime.SINGLETON) {
        this.registerSingleton(reg.token, reg.factory);
      } else {
        this.registerTransient(reg.token, reg.factory);
      }
    });
  }
}

/**
 * 全局服务容器实例
 */
export const container = new ServiceContainer();

/**
 * 服务标识符（用于类型安全的依赖注入）
 */
export const ServiceTokens = {
  // 数据仓库
  FORESHADOW_REPO: Symbol('ForeshadowRepository'),
  CHARACTER_REPO: Symbol('CharacterRepository'),
  SUMMARY_REPO: Symbol('SummaryRepository'),
  OUTLINE_REPO: Symbol('OutlineRepository'),
  WORLD_SETTING_REPO: Symbol('WorldSettingRepository'),
  ORGANIZATION_REPO: Symbol('OrganizationRepository'),
  WRITING_STYLE_REPO: Symbol('WritingStyleRepository'),
  PROJECT_CONFIG_REPO: Symbol('ProjectConfigRepository'),
  NOVEL_CATEGORY_REPO: Symbol('NovelCategoryRepository'),
  STYLE_TEMPLATE_REPO: Symbol('StyleTemplateRepository'),
  REFINING_TEMPLATE_REPO: Symbol('RefiningTemplateRepository'),
  CHARACTER_TIMELINE_REPO: Symbol('CharacterTimelineRepository'),
  CHARACTER_RELATIONSHIP_REPO: Symbol('CharacterRelationshipRepository'),
  CHARACTER_HISTORY_REPO: Symbol('CharacterHistoryRepository'),
  CHARACTER_ATTRIBUTE_REPO: Symbol('CharacterAttributeRepository'),
  
  // 核心服务
  DATA_CACHE: Symbol('DataCache'),
  ERROR_HANDLER: Symbol('ErrorHandler')
} as const;
