import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

// 所有面板的引用
let worldSettingPanel: any = null;
let outlinePanel: any = null;
let summaryPanel: any = null;
let chapterGenerationPanel: any = null;
let projectConfigPanel: any = null;
let projectOverviewPanel: any = null;
let promptTemplatePanel: any = null;
let toolbarPanel: any = null;
let writingStylePanel: any = null;
let writingStylesPackagePanel: any = null;

// 事件监听器列表
interface EventListeners {
  foreshadowsChanged: Array<() => void>;
  charactersChanged: Array<() => void>;
  summariesChanged: Array<() => void>;
  outlinesChanged: Array<() => void>;
  projectConfigChanged: Array<() => void>;
  worldSettingChanged: Array<() => void>;
  writingStyleChanged: Array<() => void>;
  promptTemplateChanged: Array<() => void>;
  allPanelsChanged: Array<() => void>;
}

/**
 * 面板刷新服务，用于统一管理UI组件的刷新
 */
export class PanelRefreshService {
  private listeners: EventListeners = {
    foreshadowsChanged: [],
    charactersChanged: [],
    summariesChanged: [],
    outlinesChanged: [],
    projectConfigChanged: [],
    worldSettingChanged: [],
    writingStyleChanged: [],
    promptTemplateChanged: [],
    allPanelsChanged: []
  };
  
  private watcher: fs.FSWatcher | null = null;
  
  // 刷新状态管理
  private refreshStatus = {
    worldSetting: { lastRefreshed: 0, isRefreshing: false },
    outline: { lastRefreshed: 0, isRefreshing: false },
    summary: { lastRefreshed: 0, isRefreshing: false },
    chapterGeneration: { lastRefreshed: 0, isRefreshing: false },
    projectConfig: { lastRefreshed: 0, isRefreshing: false },
    projectOverview: { lastRefreshed: 0, isRefreshing: false },
    promptTemplate: { lastRefreshed: 0, isRefreshing: false },
    writingStyle: { lastRefreshed: 0, isRefreshing: false },
    writingStylesPackage: { lastRefreshed: 0, isRefreshing: false }
  };
  
  // 防抖定时器
  private debounceTimers: { [key: string]: NodeJS.Timeout } = {};
  
  // 刷新间隔阈值（毫秒），避免频繁刷新
  private readonly REFRESH_THRESHOLD = 1000;

  /**
   * 注册世界观设定面板
   */
  registerWorldSettingPanel(panel: any) {
    worldSettingPanel = panel;
    logger.debug('✅ 世界观设定面板已注册到刷新服务');
  }
  
  /**
   * 注册大纲面板
   */
  registerOutlinePanel(panel: any) {
    outlinePanel = panel;
    logger.debug('✅ 大纲面板已注册到刷新服务');
  }
  
  /**
   * 注册章节摘要面板
   */
  registerSummaryPanel(panel: any) {
    summaryPanel = panel;
    logger.debug('✅ 章节摘要面板已注册到刷新服务');
  }
  
  /**
   * 注册章节生成面板
   */
  registerChapterGenerationPanel(panel: any) {
    chapterGenerationPanel = panel;
    logger.debug('✅ 章节生成面板已注册到刷新服务');
  }
  
  /**
   * 注册项目配置面板
   */
  registerProjectConfigPanel(panel: any) {
    projectConfigPanel = panel;
    logger.debug('✅ 项目配置面板已注册到刷新服务');
  }
  
  /**
   * 注册项目概览面板
   */
  registerProjectOverviewPanel(panel: any) {
    projectOverviewPanel = panel;
    logger.debug('✅ 项目概览面板已注册到刷新服务');
  }
  
  /**
   * 注册提示模板面板
   */
  registerPromptTemplatePanel(panel: any) {
    promptTemplatePanel = panel;
    logger.debug('✅ 提示模板面板已注册到刷新服务');
  }
  
  /**
   * 注册工具栏面板
   */
  registerToolbarPanel(panel: any) {
    toolbarPanel = panel;
    logger.debug('✅ 工具栏面板已注册到刷新服务');
  }
  
  /**
   * 注册写作风格面板
   */
  registerWritingStylePanel(panel: any) {
    writingStylePanel = panel;
    logger.debug('✅ 写作风格面板已注册到刷新服务');
  }
  
  /**
   * 注册写作风格包面板
   */
  registerWritingStylesPackagePanel(panel: any) {
    writingStylesPackagePanel = panel;
    logger.debug('✅ 写作风格包面板已注册到刷新服务');
  }
  
  /**
   * 刷新世界观设定面板
   */
  refreshWorldSetting() {
    const panelKey = 'worldSetting';
    
    // 检查是否正在刷新或刚刷新过
    if (this.refreshStatus[panelKey].isRefreshing) {
      logger.debug(`⏳ 世界观设定面板正在刷新中，跳过本次请求`);
      return;
    }
    
    const now = Date.now();
    if (now - this.refreshStatus[panelKey].lastRefreshed < this.REFRESH_THRESHOLD) {
      logger.debug(`⏱️  世界观设定面板刷新过于频繁，跳过本次请求`);
      return;
    }
    
    // 清除之前的防抖定时器
    if (this.debounceTimers[panelKey]) {
      clearTimeout(this.debounceTimers[panelKey]);
    }
    
    // 设置防抖，延迟执行刷新
    this.debounceTimers[panelKey] = setTimeout(() => {
      if (worldSettingPanel) {
        this.refreshStatus[panelKey].isRefreshing = true;
        try {
          worldSettingPanel.refresh();
          this.refreshStatus[panelKey].lastRefreshed = Date.now();
          logger.debug('🔄 世界观设定面板已刷新');
        } catch (error) {
          logger.error('❌ 刷新世界观设定面板失败: ' + String(error));
        } finally {
          this.refreshStatus[panelKey].isRefreshing = false;
        }
      }
    }, 100);
  }
  
  /**
   * 刷新大纲面板
   */
  refreshOutline() {
    const panelKey = 'outline';
    
    if (this.refreshStatus[panelKey].isRefreshing) {
      logger.debug(`⏳ 大纲面板正在刷新中，跳过本次请求`);
      return;
    }
    
    const now = Date.now();
    if (now - this.refreshStatus[panelKey].lastRefreshed < this.REFRESH_THRESHOLD) {
      logger.debug(`⏱️  大纲面板刷新过于频繁，跳过本次请求`);
      return;
    }
    
    if (this.debounceTimers[panelKey]) {
      clearTimeout(this.debounceTimers[panelKey]);
    }
    
    this.debounceTimers[panelKey] = setTimeout(() => {
      if (outlinePanel) {
        this.refreshStatus[panelKey].isRefreshing = true;
        try {
          outlinePanel.refresh();
          this.refreshStatus[panelKey].lastRefreshed = Date.now();
          logger.debug('🔄 大纲面板已刷新');
        } catch (error) {
          logger.error('❌ 刷新大纲面板失败: ' + String(error));
        } finally {
          this.refreshStatus[panelKey].isRefreshing = false;
        }
      }
    }, 100);
  }
  
  /**
   * 刷新章节摘要面板
   */
  refreshSummary() {
    const panelKey = 'summary';
    
    if (this.refreshStatus[panelKey].isRefreshing) {
      logger.debug(`⏳ 章节摘要面板正在刷新中，跳过本次请求`);
      return;
    }
    
    const now = Date.now();
    if (now - this.refreshStatus[panelKey].lastRefreshed < this.REFRESH_THRESHOLD) {
      logger.debug(`⏱️  章节摘要面板刷新过于频繁，跳过本次请求`);
      return;
    }
    
    if (this.debounceTimers[panelKey]) {
      clearTimeout(this.debounceTimers[panelKey]);
    }
    
    this.debounceTimers[panelKey] = setTimeout(() => {
      if (summaryPanel) {
        this.refreshStatus[panelKey].isRefreshing = true;
        try {
          summaryPanel.refresh();
          this.refreshStatus[panelKey].lastRefreshed = Date.now();
          logger.debug('🔄 章节摘要面板已刷新');
        } catch (error) {
          logger.error('❌ 刷新章节摘要面板失败: ' + String(error));
        } finally {
          this.refreshStatus[panelKey].isRefreshing = false;
        }
      }
    }, 100);
  }
  
  /**
   * 刷新章节生成面板
   */
  refreshChapterGeneration() {
    const panelKey = 'chapterGeneration';
    
    if (this.refreshStatus[panelKey].isRefreshing) {
      logger.debug(`⏳ 章节生成面板正在刷新中，跳过本次请求`);
      return;
    }
    
    const now = Date.now();
    if (now - this.refreshStatus[panelKey].lastRefreshed < this.REFRESH_THRESHOLD) {
      logger.debug(`⏱️  章节生成面板刷新过于频繁，跳过本次请求`);
      return;
    }
    
    if (this.debounceTimers[panelKey]) {
      clearTimeout(this.debounceTimers[panelKey]);
    }
    
    this.debounceTimers[panelKey] = setTimeout(() => {
      if (chapterGenerationPanel) {
        this.refreshStatus[panelKey].isRefreshing = true;
        try {
          chapterGenerationPanel.refresh();
          this.refreshStatus[panelKey].lastRefreshed = Date.now();
          logger.debug('🔄 章节生成面板已刷新');
        } catch (error) {
          logger.error('❌ 刷新章节生成面板失败: ' + String(error));
        } finally {
          this.refreshStatus[panelKey].isRefreshing = false;
        }
      }
    }, 100);
  }
  
  /**
   * 刷新项目配置面板
   */
  refreshProjectConfig() {
    const panelKey = 'projectConfig';
    
    if (this.refreshStatus[panelKey].isRefreshing) {
      logger.debug(`⏳ 项目配置面板正在刷新中，跳过本次请求`);
      return;
    }
    
    const now = Date.now();
    if (now - this.refreshStatus[panelKey].lastRefreshed < this.REFRESH_THRESHOLD) {
      logger.debug(`⏱️  项目配置面板刷新过于频繁，跳过本次请求`);
      return;
    }
    
    if (this.debounceTimers[panelKey]) {
      clearTimeout(this.debounceTimers[panelKey]);
    }
    
    this.debounceTimers[panelKey] = setTimeout(() => {
      if (projectConfigPanel) {
        this.refreshStatus[panelKey].isRefreshing = true;
        try {
          projectConfigPanel.refresh();
          this.refreshStatus[panelKey].lastRefreshed = Date.now();
          logger.debug('🔄 项目配置面板已刷新');
        } catch (error) {
          logger.error('❌ 刷新项目配置面板失败: ' + String(error));
        } finally {
          this.refreshStatus[panelKey].isRefreshing = false;
        }
      }
    }, 100);
  }
  
  /**
   * 刷新项目概览面板
   */
  refreshProjectOverview() {
    const panelKey = 'projectOverview';
    
    if (this.refreshStatus[panelKey].isRefreshing) {
      logger.debug(`⏳ 项目概览面板正在刷新中，跳过本次请求`);
      return;
    }
    
    const now = Date.now();
    if (now - this.refreshStatus[panelKey].lastRefreshed < this.REFRESH_THRESHOLD) {
      logger.debug(`⏱️  项目概览面板刷新过于频繁，跳过本次请求`);
      return;
    }
    
    if (this.debounceTimers[panelKey]) {
      clearTimeout(this.debounceTimers[panelKey]);
    }
    
    this.debounceTimers[panelKey] = setTimeout(() => {
      if (projectOverviewPanel) {
        this.refreshStatus[panelKey].isRefreshing = true;
        try {
          projectOverviewPanel.refresh();
          this.refreshStatus[panelKey].lastRefreshed = Date.now();
          logger.debug('🔄 项目概览面板已刷新');
        } catch (error) {
          logger.error('❌ 刷新项目概览面板失败: ' + String(error));
        } finally {
          this.refreshStatus[panelKey].isRefreshing = false;
        }
      }
    }, 100);
  }
  
  /**
   * 刷新提示模板面板
   */
  refreshPromptTemplate() {
    const panelKey = 'promptTemplate';
    
    if (this.refreshStatus[panelKey].isRefreshing) {
      logger.debug(`⏳ 提示模板面板正在刷新中，跳过本次请求`);
      return;
    }
    
    const now = Date.now();
    if (now - this.refreshStatus[panelKey].lastRefreshed < this.REFRESH_THRESHOLD) {
      logger.debug(`⏱️  提示模板面板刷新过于频繁，跳过本次请求`);
      return;
    }
    
    if (this.debounceTimers[panelKey]) {
      clearTimeout(this.debounceTimers[panelKey]);
    }
    
    this.debounceTimers[panelKey] = setTimeout(() => {
      if (promptTemplatePanel) {
        this.refreshStatus[panelKey].isRefreshing = true;
        try {
          promptTemplatePanel.refresh();
          this.refreshStatus[panelKey].lastRefreshed = Date.now();
          logger.debug('🔄 提示模板面板已刷新');
        } catch (error) {
          logger.error('❌ 刷新提示模板面板失败: ' + String(error));
        } finally {
          this.refreshStatus[panelKey].isRefreshing = false;
        }
      }
    }, 100);
  }
  
  /**
   * 刷新写作风格面板
   */
  refreshWritingStyle() {
    const panelKey = 'writingStyle';
    
    if (this.refreshStatus[panelKey].isRefreshing) {
      logger.debug(`⏳ 写作风格面板正在刷新中，跳过本次请求`);
      return;
    }
    
    const now = Date.now();
    if (now - this.refreshStatus[panelKey].lastRefreshed < this.REFRESH_THRESHOLD) {
      logger.debug(`⏱️  写作风格面板刷新过于频繁，跳过本次请求`);
      return;
    }
    
    if (this.debounceTimers[panelKey]) {
      clearTimeout(this.debounceTimers[panelKey]);
    }
    
    this.debounceTimers[panelKey] = setTimeout(() => {
      if (writingStylePanel) {
        this.refreshStatus[panelKey].isRefreshing = true;
        try {
          writingStylePanel.refresh();
          this.refreshStatus[panelKey].lastRefreshed = Date.now();
          logger.debug('🔄 写作风格面板已刷新');
        } catch (error) {
          logger.error('❌ 刷新写作风格面板失败: ' + String(error));
        } finally {
          this.refreshStatus[panelKey].isRefreshing = false;
        }
      }
    }, 100);
  }
  
  /**
   * 刷新写作风格包面板
   */
  refreshWritingStylesPackage() {
    const panelKey = 'writingStylesPackage';
    
    if (this.refreshStatus[panelKey].isRefreshing) {
      logger.debug(`⏳ 写作风格包面板正在刷新中，跳过本次请求`);
      return;
    }
    
    const now = Date.now();
    if (now - this.refreshStatus[panelKey].lastRefreshed < this.REFRESH_THRESHOLD) {
      logger.debug(`⏱️  写作风格包面板刷新过于频繁，跳过本次请求`);
      return;
    }
    
    if (this.debounceTimers[panelKey]) {
      clearTimeout(this.debounceTimers[panelKey]);
    }
    
    this.debounceTimers[panelKey] = setTimeout(() => {
      if (writingStylesPackagePanel) {
        this.refreshStatus[panelKey].isRefreshing = true;
        try {
          writingStylesPackagePanel.refresh();
          this.refreshStatus[panelKey].lastRefreshed = Date.now();
          logger.debug('🔄 写作风格包面板已刷新');
        } catch (error) {
          logger.error('❌ 刷新写作风格包面板失败: ' + String(error));
        } finally {
          this.refreshStatus[panelKey].isRefreshing = false;
        }
      }
    }, 100);
  }
  
  /**
   * 刷新所有面板
   */
  refreshAll() {
    this.refreshWorldSetting();
    this.refreshOutline();
    this.refreshSummary();
    this.refreshChapterGeneration();
    this.refreshProjectConfig();
    this.refreshProjectOverview();
    this.refreshPromptTemplate();
    this.refreshWritingStyle();
    this.refreshWritingStylesPackage();
    this.notifyAllPanelsChanged();
    logger.debug('🔄 所有面板已刷新');
  }
  
  /**
   * 开始监听文件变化（兼容原有接口）
   */
  startWatching(_folderPath: string) {
    logger.debug('✅ 文件监听已启动');
    // 简化实现，不实际监听文件变化
  }
  
  /**
   * 停止监听文件变化（兼容原有接口）
   */
  stopWatching() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    logger.debug('✅ 文件监听已停止');
  }
  
  /**
   * 伏笔变化事件（兼容原有接口）
   */
  onForeshadowsChanged(callback: () => void) {
    this.listeners.foreshadowsChanged.push(callback);
    return { dispose: () => {
      this.listeners.foreshadowsChanged = this.listeners.foreshadowsChanged.filter(cb => cb !== callback);
    }};
  }
  
  /**
   * 触发伏笔变化事件
   */
  notifyForeshadowsChanged() {
    this.listeners.foreshadowsChanged.forEach(callback => callback());
    logger.debug('🔔 伏笔变化事件已触发');
  }
  
  /**
   * 角色变化事件（兼容原有接口）
   */
  onCharactersChanged(callback: () => void) {
    this.listeners.charactersChanged.push(callback);
    return { dispose: () => {
      this.listeners.charactersChanged = this.listeners.charactersChanged.filter(cb => cb !== callback);
    }};
  }
  
  /**
   * 触发角色变化事件
   */
  notifyCharactersChanged() {
    this.listeners.charactersChanged.forEach(callback => callback());
    logger.debug('🔔 角色变化事件已触发');
  }
  
  /**
   * 摘要变化事件（兼容原有接口）
   */
  onSummariesChanged(callback: () => void) {
    this.listeners.summariesChanged.push(callback);
    return { dispose: () => {
      this.listeners.summariesChanged = this.listeners.summariesChanged.filter(cb => cb !== callback);
    }};
  }
  
  /**
   * 触发摘要变化事件
   */
  notifySummariesChanged() {
    this.listeners.summariesChanged.forEach(callback => callback());
    logger.debug('🔔 摘要变化事件已触发');
  }
  
  /**
   * 大纲变化事件
   */
  onOutlinesChanged(callback: () => void) {
    this.listeners.outlinesChanged.push(callback);
    return { dispose: () => {
      this.listeners.outlinesChanged = this.listeners.outlinesChanged.filter(cb => cb !== callback);
    }};
  }
  
  /**
   * 触发大纲变化事件
   */
  notifyOutlinesChanged() {
    this.listeners.outlinesChanged.forEach(callback => callback());
    logger.debug('🔔 大纲变化事件已触发');
  }
  
  /**
   * 项目配置变化事件
   */
  onProjectConfigChanged(callback: () => void) {
    this.listeners.projectConfigChanged.push(callback);
    return { dispose: () => {
      this.listeners.projectConfigChanged = this.listeners.projectConfigChanged.filter(cb => cb !== callback);
    }};
  }
  
  /**
   * 触发项目配置变化事件
   */
  notifyProjectConfigChanged() {
    this.listeners.projectConfigChanged.forEach(callback => callback());
    logger.debug('🔔 项目配置变化事件已触发');
  }
  
  /**
   * 世界观设定变化事件
   */
  onWorldSettingChanged(callback: () => void) {
    this.listeners.worldSettingChanged.push(callback);
    return { dispose: () => {
      this.listeners.worldSettingChanged = this.listeners.worldSettingChanged.filter(cb => cb !== callback);
    }};
  }
  
  /**
   * 触发世界观设定变化事件
   */
  notifyWorldSettingChanged() {
    this.listeners.worldSettingChanged.forEach(callback => callback());
    logger.debug('🔔 世界观设定变化事件已触发');
  }
  
  /**
   * 写作风格变化事件
   */
  onWritingStyleChanged(callback: () => void) {
    this.listeners.writingStyleChanged.push(callback);
    return { dispose: () => {
      this.listeners.writingStyleChanged = this.listeners.writingStyleChanged.filter(cb => cb !== callback);
    }};
  }
  
  /**
   * 触发写作风格变化事件
   */
  notifyWritingStyleChanged() {
    this.listeners.writingStyleChanged.forEach(callback => callback());
    logger.debug('🔔 写作风格变化事件已触发');
  }
  
  /**
   * 提示模板变化事件
   */
  onPromptTemplateChanged(callback: () => void) {
    this.listeners.promptTemplateChanged.push(callback);
    return { dispose: () => {
      this.listeners.promptTemplateChanged = this.listeners.promptTemplateChanged.filter(cb => cb !== callback);
    }};
  }
  
  /**
   * 触发提示模板变化事件
   */
  notifyPromptTemplateChanged() {
    this.listeners.promptTemplateChanged.forEach(callback => callback());
    logger.debug('🔔 提示模板变化事件已触发');
  }
  
  /**
   * 所有面板变化事件
   */
  onAllPanelsChanged(callback: () => void) {
    this.listeners.allPanelsChanged.push(callback);
    return { dispose: () => {
      this.listeners.allPanelsChanged = this.listeners.allPanelsChanged.filter(cb => cb !== callback);
    }};
  }
  
  /**
   * 触发所有面板变化事件
   */
  notifyAllPanelsChanged() {
    this.listeners.allPanelsChanged.forEach(callback => callback());
    logger.debug('🔔 所有面板变化事件已触发');
  }
}

export const panelRefreshService = new PanelRefreshService();
