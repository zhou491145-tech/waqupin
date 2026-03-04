import { logger } from '../utils/logger';
import { panelRefreshService } from './panelRefreshService';

// 服务类型枚举
export enum ServiceType {
  AI = 'ai',
  ANALYSIS = 'analysis',
  IMPORT = 'import',
  WORLD_SETTING_MARKDOWN = 'worldSettingMarkdown',
  PROJECT_CONFIG_MARKDOWN = 'projectConfigMarkdown',
  PROMPT_TEMPLATE = 'promptTemplate',
  WRITING_STYLES = 'writingStyles',
  CHAPTER_GENERATION = 'chapterGeneration',
  OUTLINE_MANAGEMENT = 'outlineManagement',
  CHARACTER_MANAGEMENT = 'characterManagement',
  FORESADOW_MANAGEMENT = 'foreshadowManagement',
  MEMORY_MANAGEMENT = 'memoryManagement',
  FILE_MANAGEMENT = 'fileManagement',
  SUMMARY_MANAGEMENT = 'summaryManagement',
  MEMORY_ADAPTER = 'memoryAdapter',
  CONTEXT = 'context',
  FORESADOW_FILTER = 'foreshadowFilter',
  OUTLINE_MARKDOWN = 'outlineMarkdown',
  WRITING_STYLE_MARKDOWN = 'writingStyleMarkdown',
  PANEL_REFRESH = 'panelRefresh'
}

// 服务状态枚举
export enum ServiceStatus {
  UNINITIALIZED = 'uninitialized',
  INITIALIZING = 'initializing',
  READY = 'ready',
  ERROR = 'error',
  DEGRADED = 'degraded',
  RECOVERING = 'recovering'
}

// 服务依赖关系配置
const SERVICE_DEPENDENCIES: Record<ServiceType, ServiceType[]> = {
  [ServiceType.AI]: [],
  [ServiceType.ANALYSIS]: [ServiceType.AI],
  [ServiceType.IMPORT]: [],
  [ServiceType.WORLD_SETTING_MARKDOWN]: [],
  [ServiceType.PROJECT_CONFIG_MARKDOWN]: [],
  [ServiceType.PROMPT_TEMPLATE]: [],
  [ServiceType.WRITING_STYLES]: [],
  [ServiceType.CHAPTER_GENERATION]: [ServiceType.ANALYSIS, ServiceType.MEMORY_ADAPTER, ServiceType.CONTEXT],
  [ServiceType.OUTLINE_MANAGEMENT]: [],
  [ServiceType.CHARACTER_MANAGEMENT]: [],
  [ServiceType.FORESADOW_MANAGEMENT]: [ServiceType.ANALYSIS, ServiceType.FORESADOW_FILTER],
  [ServiceType.MEMORY_MANAGEMENT]: [],
  [ServiceType.FILE_MANAGEMENT]: [],
  [ServiceType.SUMMARY_MANAGEMENT]: [],
  [ServiceType.MEMORY_ADAPTER]: [],
  [ServiceType.CONTEXT]: [ServiceType.ANALYSIS],
  [ServiceType.FORESADOW_FILTER]: [],
  [ServiceType.OUTLINE_MARKDOWN]: [],
  [ServiceType.WRITING_STYLE_MARKDOWN]: [],
  [ServiceType.PANEL_REFRESH]: []
};

// 服务健康检查配置
const HEALTH_CHECK_CONFIG = {
  interval: 30000, // 30秒检查一次
  retryAttempts: 3, // 重试次数
  retryDelay: 5000, // 重试间隔5秒
  timeout: 10000 // 健康检查超时时间10秒
};

// 服务注册信息
interface ServiceRegistration {
  service: any;
  type: ServiceType;
  status: ServiceStatus;
  initPromise?: Promise<boolean>;
}

// 服务调用上下文
interface ServiceCallContext {
  serviceType: ServiceType;
  method: string;
  params: any[];
  caller?: ServiceType;
}

// 服务调用记录
interface ServiceCallRecord {
  context: ServiceCallContext;
  startTime: number;
  endTime?: number;
  success?: boolean;
  error?: string;
}

/**
 * 服务协调器 - 管理插件各功能模块之间的调用流程、数据交互和依赖关系
 */
export class ServiceCoordinator {
  private static instance: ServiceCoordinator;
  private services: Map<string, ServiceRegistration> = new Map();
  private callHistory: ServiceCallRecord[] = [];
  private maxHistorySize = 100;
  private initializationComplete = false;
  
  // 健康检查相关
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private healthCheckResults: Map<ServiceType, { status: ServiceStatus; lastCheck: number; error?: string }> = new Map();
  
  // 事件监听器映射
  private eventListeners: Map<string, Set<Function>> = new Map();

  private constructor() {
    logger.log('🚀 服务协调器已初始化');
    this.startHealthCheck();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): ServiceCoordinator {
    if (!ServiceCoordinator.instance) {
      ServiceCoordinator.instance = new ServiceCoordinator();
    }
    return ServiceCoordinator.instance;
  }

  /**
   * 注册服务
   */
  public registerService(
    serviceType: ServiceType,
    service: any
  ): void {
    if (this.services.has(serviceType)) {
      logger.warn(`⚠️ 服务 ${serviceType} 已注册，将被覆盖`);
    }

    this.services.set(serviceType, {
      service,
      type: serviceType,
      status: ServiceStatus.UNINITIALIZED
    });

    logger.log(`📋 服务已注册: ${serviceType}`);
  }

  /**
   * 初始化所有服务
   */
  public async initializeAllServices(): Promise<boolean> {
    if (this.initializationComplete) {
      logger.log('✅ 服务已全部初始化，跳过重复初始化');
      return true;
    }

    logger.log('🔄 开始初始化所有服务...');
    
    // 拓扑排序，确保服务按依赖顺序初始化
    const orderedServices = this.topologicalSortServices();
    
    let allSuccess = true;
    
    for (const serviceType of orderedServices) {
      const success = await this.initializeService(serviceType);
      if (!success) {
        allSuccess = false;
        logger.error(`❌ 服务 ${serviceType} 初始化失败，可能影响依赖它的服务`);
      }
    }
    
    this.initializationComplete = allSuccess;
    logger.log(`📊 服务初始化完成，成功: ${allSuccess}`);
    
    // 触发初始化完成事件
    this.emit('servicesInitialized', { success: allSuccess });
    
    return allSuccess;
  }

  /**
   * 初始化单个服务
   */
  public async initializeService(serviceType: ServiceType): Promise<boolean> {
    const registration = this.services.get(serviceType);
    if (!registration) {
      logger.error(`❌ 服务 ${serviceType} 未注册，无法初始化`);
      return false;
    }

    if (registration.status === ServiceStatus.READY) {
      logger.log(`✅ 服务 ${serviceType} 已就绪，跳过初始化`);
      return true;
    }

    if (registration.status === ServiceStatus.INITIALIZING) {
      logger.log(`⏳ 服务 ${serviceType} 正在初始化中，等待完成...`);
      return registration.initPromise as Promise<boolean>;
    }

    // 检查依赖服务是否已就绪
    const dependencies = SERVICE_DEPENDENCIES[serviceType];
    for (const depType of dependencies) {
      const depRegistration = this.services.get(depType);
      if (!depRegistration || depRegistration.status !== ServiceStatus.READY) {
        logger.error(`❌ 服务 ${serviceType} 的依赖服务 ${depType} 未就绪，无法初始化`);
        registration.status = ServiceStatus.ERROR;
        return false;
      }
    }

    logger.log(`🔄 开始初始化服务: ${serviceType}`);
    registration.status = ServiceStatus.INITIALIZING;

    try {
      // 调用服务的init方法（如果存在）
      if (typeof registration.service.init === 'function') {
        registration.initPromise = registration.service.init();
        const success = await registration.initPromise;
        
        if (success) {
          registration.status = ServiceStatus.READY;
          logger.log(`✅ 服务 ${serviceType} 初始化成功`);
          return true;
        } else {
          registration.status = ServiceStatus.ERROR;
          logger.error(`❌ 服务 ${serviceType} 初始化失败`);
          return false;
        }
      } else {
        // 没有init方法，直接标记为就绪
        registration.status = ServiceStatus.READY;
        logger.log(`✅ 服务 ${serviceType} 无需初始化，已就绪`);
        return true;
      }
    } catch (error) {
      registration.status = ServiceStatus.ERROR;
      logger.error(`❌ 服务 ${serviceType} 初始化异常: ${error}`);
      return false;
    }
  }

  /**
   * 调用服务方法
   */
  public async callServiceMethod(
    serviceType: ServiceType,
    method: string,
    params: any[],
    caller?: ServiceType
  ): Promise<any> {
    const registration = this.services.get(serviceType);
    if (!registration) {
      throw new Error(`服务 ${serviceType} 未注册`);
    }

    if (registration.status !== ServiceStatus.READY) {
      // 尝试初始化服务
      const initSuccess = await this.initializeService(serviceType);
      if (!initSuccess) {
        throw new Error(`服务 ${serviceType} 未就绪，无法调用方法 ${method}`);
      }
    }

    // 检查方法是否存在
    if (typeof registration.service[method] !== 'function') {
      throw new Error(`服务 ${serviceType} 不存在方法 ${method}`);
    }

    // 创建调用上下文
    const context: ServiceCallContext = {
      serviceType,
      method,
      params,
      caller
    };

    // 记录调用开始
    const callRecord: ServiceCallRecord = {
      context,
      startTime: Date.now()
    };

    try {
      logger.debug(`📞 调用服务方法: ${serviceType}.${method}`);
      
      // 调用服务方法
      const result = await registration.service[method](...params);
      
      // 更新调用记录
      callRecord.endTime = Date.now();
      callRecord.success = true;
      
      // 添加到历史记录
      this.addToCallHistory(callRecord);
      
      logger.debug(`✅ 服务方法调用成功: ${serviceType}.${method}`);
      
      return result;
    } catch (error) {
      // 更新调用记录
      callRecord.endTime = Date.now();
      callRecord.success = false;
      callRecord.error = error instanceof Error ? error.message : String(error);
      
      // 添加到历史记录
      this.addToCallHistory(callRecord);
      
      logger.error(`❌ 服务方法调用失败: ${serviceType}.${method} - ${callRecord.error}`);
      throw error;
    }
  }

  /**
   * 获取服务状态
   */
  public getServiceStatus(serviceType: ServiceType): ServiceStatus {
    const registration = this.services.get(serviceType);
    return registration ? registration.status : ServiceStatus.UNINITIALIZED;
  }

  /**
   * 获取所有服务状态
   */
  public getAllServiceStatuses(): Record<ServiceType, ServiceStatus> {
    const statuses: Record<ServiceType, ServiceStatus> = {} as Record<ServiceType, ServiceStatus>;
    
    for (const serviceType of Object.values(ServiceType)) {
      statuses[serviceType] = this.getServiceStatus(serviceType);
    }
    
    return statuses;
  }

  /**
   * 添加调用记录到历史
   */
  private addToCallHistory(record: ServiceCallRecord): void {
    this.callHistory.push(record);
    
    // 限制历史记录大小
    if (this.callHistory.length > this.maxHistorySize) {
      this.callHistory.shift();
    }
  }

  /**
   * 获取调用历史
   */
  public getCallHistory(): ServiceCallRecord[] {
    return [...this.callHistory];
  }

  /**
   * 拓扑排序服务依赖关系
   */
  private topologicalSortServices(): ServiceType[] {
    const visited = new Set<ServiceType>();
    const tempMark = new Set<ServiceType>();
    const result: ServiceType[] = [];

    const visit = (serviceType: ServiceType) => {
      if (tempMark.has(serviceType)) {
        throw new Error(`服务依赖关系中存在循环依赖: ${serviceType}`);
      }

      if (!visited.has(serviceType)) {
        tempMark.add(serviceType);
        
        // 访问依赖服务
        const dependencies = SERVICE_DEPENDENCIES[serviceType] || [];
        for (const dep of dependencies) {
          visit(dep);
        }
        
        tempMark.delete(serviceType);
        visited.add(serviceType);
        result.push(serviceType);
      }
    };

    // 对所有服务进行拓扑排序
    for (const serviceType of Object.values(ServiceType)) {
      if (!visited.has(serviceType)) {
        visit(serviceType);
      }
    }

    return result;
  }

  /**
   * 注册事件监听器
   */
  public on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)?.add(listener);
  }

  /**
   * 移除事件监听器
   */
  public off(event: string, listener: Function): void {
    this.eventListeners.get(event)?.delete(listener);
  }

  /**
   * 触发事件
   */
  public emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      logger.debug(`📢 触发事件: ${event}, 监听器数量: ${listeners.size}`);
      for (const listener of listeners) {
        try {
          listener(data);
        } catch (error) {
          logger.error(`❌ 事件监听器执行失败: ${event} - ${error}`);
        }
      }
    }
  }

  /**
   * 启动健康检查
   */
  public startHealthCheck(): void {
    if (this.healthCheckTimer) {
      this.stopHealthCheck();
    }

    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, HEALTH_CHECK_CONFIG.interval);

    logger.log(`✅ 健康检查已启动，检查间隔: ${HEALTH_CHECK_CONFIG.interval / 1000}秒`);
  }

  /**
   * 停止健康检查
   */
  public stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
      logger.log(`⏹️ 健康检查已停止`);
    }
  }

  /**
   * 执行健康检查
   */
  public async performHealthCheck(): Promise<void> {
    logger.debug(`🔍 开始执行健康检查`);
    
    // 只检查已注册的服务，包括动态注册的服务
    for (const [serviceKey, registration] of this.services.entries()) {
      const serviceType = serviceKey as ServiceType;
      await this.checkServiceHealth(serviceType, registration);
    }
    
    logger.debug(`✅ 健康检查执行完成`);
    
    // 触发健康检查完成事件
    this.emit('healthCheckCompleted', {
      results: Object.fromEntries(this.healthCheckResults),
      totalServices: this.services.size,
      checkedServices: this.healthCheckResults.size
    });
  }

  /**
   * 检查单个服务的健康状态
   */
  private async checkServiceHealth(
    serviceType: ServiceType,
    registration: ServiceRegistration
  ): Promise<void> {
    const now = Date.now();
    
    try {
      // 如果服务有healthCheck方法，调用它进行健康检查
      if (typeof registration.service.healthCheck === 'function') {
        const healthResult = await Promise.race([
          registration.service.healthCheck(),
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('健康检查超时')), HEALTH_CHECK_CONFIG.timeout);
          })
        ]);

        if (healthResult === true) {
          // 健康检查通过
          if (registration.status === ServiceStatus.ERROR || registration.status === ServiceStatus.DEGRADED) {
            // 恢复服务
            registration.status = ServiceStatus.READY;
            logger.log(`✅ 服务 ${serviceType} 健康检查通过，已恢复正常状态`);
            this.emit('serviceRecovered', { serviceType });
          }
          
          this.healthCheckResults.set(serviceType, {
            status: ServiceStatus.READY,
            lastCheck: now
          });
        } else {
          // 健康检查失败，降级服务
          this.degradeService(serviceType, registration, '健康检查失败');
        }
      } else {
        // 没有healthCheck方法，检查服务状态
        if (registration.status === ServiceStatus.READY) {
          this.healthCheckResults.set(serviceType, {
            status: ServiceStatus.READY,
            lastCheck: now
          });
        } else {
          this.degradeService(serviceType, registration, '服务状态异常');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.degradeService(serviceType, registration, errorMessage);
    }
  }

  /**
   * 降级服务
   */
  private degradeService(
    serviceType: ServiceType,
    registration: ServiceRegistration,
    reason: string
  ): void {
    const now = Date.now();
    
    if (registration.status !== ServiceStatus.DEGRADED) {
      registration.status = ServiceStatus.DEGRADED;
      logger.warn(`⚠️ 服务 ${serviceType} 已降级，原因: ${reason}`);
      this.emit('serviceDegraded', { serviceType, reason });
    }
    
    this.healthCheckResults.set(serviceType, {
      status: ServiceStatus.DEGRADED,
      lastCheck: now,
      error: reason
    });
    
    // 尝试恢复服务
    this.scheduleRecovery(serviceType);
  }

  /**
   * 安排服务恢复
   */
  private scheduleRecovery(serviceType: ServiceType): void {
    setTimeout(async () => {
      await this.recoverService(serviceType);
    }, HEALTH_CHECK_CONFIG.retryDelay);
  }

  /**
   * 恢复服务
   */
  public async recoverService(serviceType: ServiceType): Promise<boolean> {
    const registration = this.services.get(serviceType);
    if (!registration) {
      return false;
    }
    
    logger.log(`🔄 尝试恢复服务: ${serviceType}`);
    registration.status = ServiceStatus.RECOVERING;
    this.emit('serviceRecovering', { serviceType });
    
    try {
      // 尝试重新初始化服务
      const success = await this.initializeService(serviceType);
      
      if (success) {
        logger.log(`✅ 服务 ${serviceType} 恢复成功`);
        this.emit('serviceRecovered', { serviceType });
        return true;
      } else {
        logger.error(`❌ 服务 ${serviceType} 恢复失败`);
        registration.status = ServiceStatus.ERROR;
        return false;
      }
    } catch (error) {
      logger.error(`❌ 服务 ${serviceType} 恢复异常: ${error}`);
      registration.status = ServiceStatus.ERROR;
      return false;
    }
  }

  /**
   * 获取服务健康状态
   */
  public getServiceHealthStatus(serviceType: ServiceType): {
    status: ServiceStatus;
    lastCheck: number;
    error?: string;
  } | null {
    return this.healthCheckResults.get(serviceType) || null;
  }

  /**
   * 获取所有服务的健康状态
   */
  public getAllServiceHealthStatuses(): Record<string, {
    status: ServiceStatus;
    lastCheck: number;
    error?: string;
  }> {
    return Object.fromEntries(this.healthCheckResults);
  }
}

// 导出单例实例
export const serviceCoordinator = ServiceCoordinator.getInstance();
