import * as vscode from 'vscode';
import { aiService } from './services/aiService';
import { analysisService } from './services/analysisService';
import { importService } from './services/importService';
import { logger } from './utils/logger';
import { dataStorage } from './data/storage';
import { dataStorageV2 } from './data/storageV2';
import { globalCache } from './core/DataCache';
import { worldSettingMarkdownService } from './services/worldSettingMarkdownService';
import { projectConfigMarkdownService } from './services/projectConfigMarkdownService';
import { SummaryPanel } from './views/summaryPanel';
import { SummaryEditPanel } from './views/summaryEditPanel';
import { WorldSettingPanel } from './views/worldSettingPanel';
import { WorldSettingEditPanel } from './views/worldSettingEditPanel';
import { ProjectConfigPanel } from './views/projectConfigPanel';
import { OutlinePanel } from './views/outlinePanel';
import { PromptTemplatePanel } from './views/promptTemplatePanel';
import { WritingStylesPackagePanel } from './views/writingStylesPackagePanel';
import { ChapterGenerationEditorPanel } from './views/chapterGenerationEditorPanel';
import { ToolbarPanel } from './views/toolbarPanel';
import { NavigatorPanel } from './views/navigatorPanel';
import { ActivationPanel } from './views/activationPanel';
import { ChapterRefiningPanel } from './views/chapterRefiningPanel';
import { chapterRefiningService } from './services/chapterRefiningService';
import { refiningTemplateService } from './services/refiningTemplateService';
import { CharacterPanel } from './views/characterPanel';
import { CharacterListPanel } from './views/characterListPanel';
import { CharacterEditPanel } from './views/characterEditPanel';
import { OutlineEditPanel } from './views/outlineEditPanel';
import { ForeshadowDetailPanel } from './views/foreshadowDetailPanel';
import { ForeshadowListPanel } from './views/foreshadowListPanel';
import { ForeshadowEditPanel } from './views/foreshadowEditPanel';
import { RelationshipPanel } from './views/relationshipPanel';
import { StyleLabPanel } from './views/styleLabPanel';
import { panelRefreshService } from './services/panelRefreshService';
import { promptTemplateService } from './services/promptTemplateService';
import { writingStylesService } from './services/writingStylesService';
import { foreshadowRepository, characterRepository, summaryRepository, outlineRepository, organizationRepository, worldSettingRepository, writingStyleRepository, projectConfigRepository } from './repositories';
import { markdownFileRepository } from './repositories/markdownFileRepository';
import { serviceCoordinator, ServiceType } from './services/serviceCoordinator';
import { memoryAdapterService } from './services/memoryAdapterService';
import { fileManagementService } from './services/fileManagementService';
import { verifyLicense, showActivationDialog, initActivationStatus, isEntitledSync, PRO_FEATURE_REQUIRED_MESSAGE, getPlanSync } from './auth/verify';

export async function activate(context: vscode.ExtensionContext) {
  logger.log('📦 小说创作助手插件已激活');

  // 注册 Webview 面板 - 仅保留侧边栏视图（移到最前面，确保面板始终能注册）
  const navigatorPanel = new NavigatorPanel(context.extensionUri);
  try {
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        NavigatorPanel.viewType,
        navigatorPanel
      )
    );
  } catch (error: any) {
    // 避免重复注册导致激活失败（可能存在旧版本残留的注册）
    const msg = error?.message || String(error);
    if (msg.includes('already registered')) {
      logger.warn('⚠️ 导航视图已注册，跳过重复注册以避免激活失败');
    } else {
      throw error;
    }
  }

  // 注册激活验证面板
  const activationPanel = new ActivationPanel(context.extensionUri, context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ActivationPanel.viewType,
      activationPanel
    )
  );

  // 注册显示激活验证面板的命令
  const showActivationPanelCmd = vscode.commands.registerCommand('novelAssistant.showActivationPanel', () => {
    logger.log('▶ 打开面板：激活验证');
    vscode.commands.executeCommand('novelAssistant.activation.focus');
  });
  context.subscriptions.push(showActivationPanelCmd);

  // 注册文章精修面板（始终注册，但在使用时检查权限）
  logger.log('📝 正在注册文章精修面板...');
  const refiningPanel = new ChapterRefiningPanel(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ChapterRefiningPanel.viewType,
      refiningPanel
    )
  );
  logger.log('✅ 文章精修面板已注册');

  // 诊断：检查 refine 权限
  const hasRefinePermission = isEntitledSync('refine');
  const currentPlan = getPlanSync();
  logger.log(`🔍 权限诊断 - refine 功能权限: ${hasRefinePermission}`);
  logger.log(`🔍 权限诊断 - 当前计划: ${currentPlan}`);

  // -------------------- 验证系统集成（异步，不阻塞激活）--------------------
  // 将激活相关的异步操作放到后台，避免阻塞面板加载
  (async () => {
    try {
      // 初始化激活状态缓存
      await initActivationStatus(context);
      logger.log('✅ 激活状态已初始化');

      const authResult = await verifyLicense(context);
      if (!authResult.success) {
        // 使用 setTimeout 延迟显示激活提示，避免阻塞面板加载
        setTimeout(async () => {
          try {
            const action = await vscode.window.showWarningMessage(
              `插件未激活: ${authResult.message}`,
              '立即激活',
              '稍后提醒'
            );

            if (action === '立即激活') {
              // 直接聚焦到激活验证面板，而不是弹出旧版本的机器码对话框
              await vscode.commands.executeCommand('novelAssistant.activation.focus');
              logger.log('📋 已打开激活验证面板，请输入授权码');
            } else {
              logger.warn('⚠️ 插件未激活，核心功能将受限');
            }
          } catch (err) {
            logger.error(`❌ 激活对话框出错: ${err}`);
          }
        }, 1500); // 延迟 1.5 秒显示，确保面板已经加载
      } else {
        logger.log('✅ 插件验证通过');
      }
    } catch (error) {
      logger.error(`❌ 激活初始化失败: ${error}`);
      // 即使激活失败，也不要阻断插件启动，以免用户无法使用面板
      setTimeout(() => {
        vscode.window.showErrorMessage(`插件激活出错，请稍后重试。详见输出面板。`);
      }, 2000);
    }
  })();
  // -----------------------------------------------------------------------

  // 获取工作区文件夹，只声明一次
  const workspaceFolders = vscode.workspace.workspaceFolders;
  let workspaceRoot: string | undefined;

  if (workspaceFolders && workspaceFolders.length > 0) {
    workspaceRoot = workspaceFolders[0].uri.fsPath;
  }

  // 初始化旧数据存储（向后兼容）
  const storageOk = dataStorage.init();
  if (storageOk) {
    logger.debug('✅ 数据存储（旧版）已初始化');
  } else {
    logger.warn('⚠️ 数据存储（旧版）初始化失败');
  }

  // 初始化新数据存储 V2（使用仓库系统）
  const storageV2Ok = dataStorageV2.init();
  if (storageV2Ok) {
    logger.debug('✅ 数据存储 V2（新仓库系统）已初始化');

    // 初始化旧仓库（向后兼容）
    if (workspaceRoot) {
      const dataDir = require('path').join(workspaceRoot, '.novel-assistant');

      // 初始化各个旧仓库
      foreshadowRepository.init(dataDir);
      characterRepository.init(dataDir);
      summaryRepository.init(dataDir);
      outlineRepository.init(dataDir);
      organizationRepository.init(dataDir);
      worldSettingRepository.init(dataDir);
      writingStyleRepository.init(dataDir);
      projectConfigRepository.init(dataDir);
      markdownFileRepository.init(dataDir);

      // 初始化精修模板服务
      const storageUri = vscode.Uri.file(dataDir);
      refiningTemplateService.initialize(storageUri);

      logger.debug('✅ 所有旧仓库已初始化（向后兼容）');
    }
  } else {
    logger.warn('⚠️ 数据存储 V2 初始化失败');
  }

  // 自动创建AAA文件夹
  if (workspaceRoot) {
    const aaaFolderPath = require('path').join(workspaceRoot, 'AAA');
    const fs = require('fs');

    if (!fs.existsSync(aaaFolderPath)) {
      fs.mkdirSync(aaaFolderPath, { recursive: true });
      logger.log(`✅ 已在工作区根目录创建AAA文件夹: ${aaaFolderPath}`);
    } else {
      logger.debug(`📁 AAA文件夹已存在: ${aaaFolderPath}`);
    }
  }

  // 在工作区根目录创建使用指南文件（如果不存在）
  if (workspaceRoot) {
    try {
      const path = require('path');
      const fs = require('fs');
      const guidePath = path.join(workspaceRoot, '插件使用指南.md');

      if (!fs.existsSync(guidePath)) {
        const guideContent = `# 插件使用指南

      # 插件使用指南

1. 点击左侧书本图标，就可以打开**聚焦到导航面板**。
2. 先激活：在导航面板中点击 **复制机器码**，将复制的机器码发送到邮箱 491145@qq.com 以完成激活。
https://waqupin.com/api/license 这是激活需要的验证服务器地址
3. 配置API 在界面左下角点击API设置，输入你的API信息（国内有很多免费的足够用几个月的只需要注册就行，比如阿里的通义千问,豆包,智谱等等）,再点击左下角测试API连接,连接成功后就可以开始体验了.
4. 按 F1，搜索**导入**选择 **批量导入文件或者导入文件**，按照提示导入你的小说数据。

**本插件的基础版和专业版是收费的，基础版一杯奶茶/月，专业版3杯奶茶/年。插件会根据用户反馈和行业进步升级更新以满足用户需求。**
 请先仔细熟悉本系统,AI不是你说一句就能完成一切的,AI只是工具,要需要花时间学会使用才能创造出你想要的价值,本系统的开发也是基于AI开发的,
 我是书虫也是电脑爱好者但我不是软件编程工程师,只要用得好AI,你就能创造价值!
 后续还有很多视频使用教程我会放在抖音
      `;

        fs.writeFileSync(guidePath, guideContent, { encoding: 'utf8' });
        logger.log(`✅ 已在工作区根目录创建使用指南: ${guidePath}`);
      } else {
        logger.debug(`📄 使用指南已存在: ${guidePath}`);
      }
    } catch (error) {
      logger.error(`❌ 创建使用指南失败: ${error}`);
    }
  }

  // -------------------- 服务协调器集成 --------------------

  // 注册所有服务到服务协调器
  logger.debug('📋 开始注册服务到协调器...');
  serviceCoordinator.registerService(ServiceType.AI, aiService);
  serviceCoordinator.registerService(ServiceType.ANALYSIS, analysisService);
  serviceCoordinator.registerService(ServiceType.IMPORT, importService);
  serviceCoordinator.registerService(ServiceType.WORLD_SETTING_MARKDOWN, worldSettingMarkdownService);
  serviceCoordinator.registerService(ServiceType.PROJECT_CONFIG_MARKDOWN, projectConfigMarkdownService);
  serviceCoordinator.registerService(ServiceType.PROMPT_TEMPLATE, promptTemplateService);
  serviceCoordinator.registerService(ServiceType.WRITING_STYLES, writingStylesService);
  serviceCoordinator.registerService(ServiceType.FILE_MANAGEMENT, fileManagementService);
  serviceCoordinator.registerService(ServiceType.MEMORY_ADAPTER, memoryAdapterService);
  serviceCoordinator.registerService(ServiceType.PANEL_REFRESH, panelRefreshService);
  logger.debug('✅ 所有服务已注册到协调器');

  // 动态导入并注册其他服务
  (async () => {
    try {
      const { contextService } = await import('./services/contextService');
      const { foreshadowFilterService } = await import('./services/foreshadowFilterService');
      const { chapterGenerationService } = await import('./services/chapterGenerationService');
      const { outlineMarkdownService } = await import('./services/outlineMarkdownService');
      const { writingStyleMarkdownService } = await import('./services/writingStyleMarkdownService');

      serviceCoordinator.registerService(ServiceType.CONTEXT, contextService);
      serviceCoordinator.registerService(ServiceType.FORESADOW_FILTER, foreshadowFilterService);
      serviceCoordinator.registerService(ServiceType.CHAPTER_GENERATION, chapterGenerationService);
      serviceCoordinator.registerService(ServiceType.OUTLINE_MARKDOWN, outlineMarkdownService);
      serviceCoordinator.registerService(ServiceType.WRITING_STYLE_MARKDOWN, writingStyleMarkdownService);

      logger.debug('✅ 动态服务已注册到协调器');
    } catch (error) {
      logger.error(`❌ 动态服务注册失败: ${error}`);
    }
  })();

  // 初始化文件管理服务
  fileManagementService.init();

  // 初始化提示词模板服务和写作风格服务（需要workspaceRoot）
  if (workspaceRoot) {
    promptTemplateService.init(workspaceRoot);
    writingStylesService.init(workspaceRoot);
  } else {
    logger.warn('⚠️ 未找到工作区，提示词模板服务和写作风格服务将使用默认配置');
  }

  // 使用服务协调器初始化所有服务
  serviceCoordinator.initializeAllServices()
    .then(success => {
      if (success) {
        logger.log('✅ 所有服务初始化成功');
      } else {
        logger.warn('⚠️ 部分服务初始化失败，请查看日志');
      }
    })
    .catch(error => {
      logger.error(`❌ 服务初始化异常: ${error}`);
    });

  // -------------------- 记忆适配器集成 --------------------

  // 只进行一次初始验证，不再启动定时验证
  setTimeout(() => {
    memoryAdapterService.validateMemoryConsistency();
  }, 5000);

  logger.info('🧠 记忆适配器服务已启用（按需验证）');

  // 配置文件修改时触发验证和缓存失效（事件驱动）
  const fileWatcher = vscode.workspace.createFileSystemWatcher('**/.novel-assistant/*.json');
  
  fileWatcher.onDidChange((uri) => {
    logger.debug('📄 检测到数据文件变化，触发记忆验证和缓存失效');
    memoryAdapterService.validateMemoryConsistency();
    
    // 事件驱动的缓存失效
    const fileName = require('path').basename(uri.fsPath);
    dataStorageV2.invalidateCacheByFile(fileName);
    logger.debug(`🔄 已失效缓存: ${fileName}`);
  });
  
  fileWatcher.onDidCreate((uri) => {
    logger.debug('📄 检测到数据文件创建，触发记忆验证和缓存失效');
    memoryAdapterService.validateMemoryConsistency();
    
    const fileName = require('path').basename(uri.fsPath);
    dataStorageV2.invalidateCacheByFile(fileName);
  });
  
  fileWatcher.onDidDelete((uri) => {
    logger.debug('📄 检测到数据文件删除，触发记忆验证和缓存失效');
    memoryAdapterService.validateMemoryConsistency();
    
    const fileName = require('path').basename(uri.fsPath);
    dataStorageV2.invalidateCacheByFile(fileName);
  });

  context.subscriptions.push(fileWatcher);

  // 定期清理过期缓存（TTL 机制）
  const cacheCleanupInterval = setInterval(() => {
    globalCache.cleanExpired();
    const stats = globalCache.getStats();
    if (stats.total > 0) {
      logger.debug(`📊 缓存统计: ${stats.total} 项，其中 ${stats.expired} 项已过期`);
    }
  }, 60000); // 每分钟清理一次

  context.subscriptions.push({
    dispose: () => clearInterval(cacheCleanupInterval)
  });

  // 注册精修章节命令
  const refineChapterCmd = vscode.commands.registerCommand('novelAssistant.refineChapter', async (data?: any) => {
    try {
      logger.log('▶ 执行精修命令');

      if (!isEntitledSync('refine')) {
        vscode.window.showInformationMessage(PRO_FEATURE_REQUIRED_MESSAGE);
        return;
      }

      // 如果没有通过参数传入数据，检查当前编辑器
      if (!data) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showErrorMessage('请先打开需要精修的MD文件');
          return;
        }
        logger.warn('⚠️ 没有从精修面板获取数据，尝试使用当前编辑器内容');
        return;
      }

      const { templateIds, category, chapterText, filePath } = data;

      if (!templateIds || templateIds.length === 0) {
        vscode.window.showWarningMessage('请至少选择一个精修模板');
        return;
      }

      if (!chapterText) {
        vscode.window.showErrorMessage('章节内容为空');
        return;
      }

      // 先获取编辑器引用，确保编辑器存在且匹配
      const sourceEditor = vscode.window.activeTextEditor;
      if (!sourceEditor) {
        vscode.window.showErrorMessage('请先打开需要精修的MD文件');
        return;
      }

      // 规范化路径用于比较
      const normalizeUri = (fsPath: string) => {
        return fsPath.toLowerCase().replace(/\\/g, '/');
      };

      const normalizedSourcePath = normalizeUri(sourceEditor.document.uri.fsPath);
      const normalizedTargetPath = normalizeUri(filePath);

      if (normalizedSourcePath !== normalizedTargetPath) {
        vscode.window.showWarningMessage('当前打开的文件已改变，请重新打开需要精修的文件');
        return;
      }

      // 显示进度
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `✨ 正在精修章节（${templateIds.length}个模板）...`,
          cancellable: false,
        },
        async (progress) => {
          try {
            progress.report({ increment: 0 });

            // 调用精修服务
            logger.log(`📝 开始精修：${templateIds.length}个模板，字数：${chapterText.length}`);
            const result = await chapterRefiningService.refineChapter({
              chapterText,
              templateIds,
              novelCategory: category,
            });

            progress.report({ increment: 50 });

            // 应用结果到编辑器 - 使用之前保存的编辑器引用
            // 但仍需重新检查当前编辑器是否还有效
            const currentEditor = vscode.window.activeTextEditor;
            if (!currentEditor) {
              logger.error('❌ 编辑器已关闭，无法应用修改');
              vscode.window.showWarningMessage('编辑器已关闭，精修结果未应用。');
              return;
            }

            const currentPath = normalizeUri(currentEditor.document.uri.fsPath);
            if (currentPath !== normalizedTargetPath) {
              logger.error('❌ 当前编辑器不是目标文件，无法应用修改');
              vscode.window.showWarningMessage('当前打开的文件已改变，精修结果未应用。');
              return;
            }

            // 应用精修结果
            await chapterRefiningService.applyRefinements(currentEditor, result.refinedText);
            progress.report({ increment: 100 });

            // 显示成功信息和统计
            const stat = result.statistics;
            const lengthChange = stat.refinedLength - stat.originalLength;
            const percentChange = Math.round((lengthChange / stat.originalLength) * 100);

            vscode.window.showInformationMessage(
              `✅ 精修完成！\n字数：${stat.originalLength} → ${stat.refinedLength} (${lengthChange > 0 ? '+' : ''}${lengthChange}, ${percentChange}%)\n修改处：${stat.changeCount} 处\n耗时：${Math.round(stat.estimatedTime / 1000)}秒`
            );

            logger.log(`✓ 精修成功：字数${stat.originalLength}→${stat.refinedLength}，修改${stat.changeCount}处`);
          } catch (error) {
            logger.error(`❌ 精修出错: ${error}`);
            vscode.window.showErrorMessage(`精修失败: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      );
    } catch (error) {
      logger.error(`❌ 执行精修命令出错: ${error}`);
      vscode.window.showErrorMessage(`执行精修出错: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
  context.subscriptions.push(refineChapterCmd);

  // 注册创建自定义精修模板命令
  const createCustomTemplateCmd = vscode.commands.registerCommand('novelAssistant.createCustomTemplate', async () => {
    try {
      logger.log('▶ 打开自定义模板编辑器');

      if (!isEntitledSync('refine')) {
        vscode.window.showInformationMessage(PRO_FEATURE_REQUIRED_MESSAGE);
        return;
      }

      // 创建临时MD文件
      const templateContent = `# ✨ 创建自定义精修模板

## 📝 基本信息

**模板名称：** [输入你的模板名称，如：增强场景感的精修]

**精修提示词：** 
\`\`\`
[在这里输入详细的精修指导，支持多行。例如：
请注重：
1. 场景描写的细节
2. 环境气氛的营造
3. 人物动作的连贯性
等等]
\`\`\`

## 🏷️ 适用分类

请选择适用的分类（可多选），格式: \`category1,category2\`

可选分类：
- \`history\` - 历史小说 📚
- \`fantasy\` - 奇幻小说 🧙
- \`scifi\` - 科幻小说 🚀
- \`mystery\` - 悬疑推理 🔍
- \`romance\` - 爱情小说 💕
- \`web-novel\` - 网络文学 ⚡
- \`urban\` - 都市小说 🏙️
- \`action\` - 动作冒险 💥
- \`general\` - 通用 🌍

**分类选择：** \`history,general\`
（在反引号中直接输入分类代码，多个用逗号分隔，如上所示）

## ⚙️ 可选信息

**难度级别（可选）：** easy | medium | hard  
默认值：medium

**预估耗时（可选）：** [输入秒数，如 120]  
默认值：120

---

## ✅ 说明

1. 填写上面的信息
2. 保存此文件（Ctrl+S）
3. 模板会自动创建并应用到精修面板
4. 如有错误，下方会显示错误提示

⚠️ **注意：**
- 模板名称不能为空，最多50字符
- 精修提示词至少需要20个字符
- 至少需要选择一个分类
- 分类输入格式：\`history,general\`（逗号分隔，无需方括号）
`;

      // 创建临时文件URI
      const tempDir = vscode.Uri.joinPath(context.globalStorageUri, 'temp-templates');
      
      // 确保临时目录存在
      try {
        await vscode.workspace.fs.createDirectory(tempDir);
      } catch (e) {
        // 目录可能已存在，忽略错误
      }

      const fileName = `custom-template-${Date.now()}.md`;
      const filePath = vscode.Uri.joinPath(tempDir, fileName);

      // 写入模板内容
      const encoder = new TextEncoder();
      await vscode.workspace.fs.writeFile(filePath, encoder.encode(templateContent));

      // 打开文件
      const doc = await vscode.workspace.openTextDocument(filePath);
      const editor = await vscode.window.showTextDocument(doc, {
        viewColumn: vscode.ViewColumn.One,
        preview: false,
      });

      logger.log(`✓ 打开自定义模板编辑文件: ${filePath.fsPath}`);

      // 监听文件保存事件
      const saveDisposable = vscode.workspace.onDidSaveTextDocument(async (savedDoc) => {
        if (savedDoc.uri.fsPath === filePath.fsPath) {
          logger.log('▶ 检测到模板文件保存，开始处理...');
          
          try {
            // 解析文件内容
            const content = savedDoc.getText();
            const templateData = parseCustomTemplateMarkdown(content);

            if (templateData.errors.length > 0) {
              vscode.window.showErrorMessage(
                `模板格式错误：\n${templateData.errors.join('\n')}`
              );
              return;
            }

            // 创建模板对象
            const templateId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const newTemplate = {
              id: templateId,
              name: templateData.name,
              emoji: '⭐',
              promptText: templateData.promptText,
              focusPoints: [],
              difficulty: templateData.difficulty || 'medium',
              estimatedTime: (templateData.estimatedTime || 120) * 1000,
              tags: ['custom'],
              category: templateData.categories,
              isSystemTemplate: false,
            };

            // 保存模板
            refiningTemplateService.saveCustomTemplate(newTemplate as any);

            // 删除临时文件
            try {
              await vscode.workspace.fs.delete(filePath);
            } catch (e) {
              logger.warn('⚠️ 删除临时文件失败，忽略');
            }

            // 关闭编辑器
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

            vscode.window.showInformationMessage(
              `✅ 自定义模板创建成功！\n📝 模板名称：${templateData.name}\n🏷️ 应用分类：${templateData.categories.length}个`,
              '打开精修面板'
            ).then(action => {
              if (action === '打开精修面板') {
                vscode.commands.executeCommand('novelAssistant.refining.focus');
              }
            });

            // 取消监听
            saveDisposable.dispose();
          } catch (error) {
            logger.error(`❌ 处理模板文件失败: ${error}`);
            vscode.window.showErrorMessage(`处理模板失败: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      });

      context.subscriptions.push(saveDisposable);

    } catch (error) {
      logger.error(`❌ 打开模板编辑器失败: ${error}`);
      vscode.window.showErrorMessage(`打开编辑器失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
  context.subscriptions.push(createCustomTemplateCmd);

  // 注册编辑自定义精修模板命令
  const editCustomTemplateCmd = vscode.commands.registerCommand('novelAssistant.editCustomTemplate', async (params?: any) => {
    try {
      if (!isEntitledSync('refine')) {
        vscode.window.showInformationMessage(PRO_FEATURE_REQUIRED_MESSAGE);
        return;
      }

      const templateId = params?.templateId;
      if (!templateId) {
        vscode.window.showErrorMessage('模板ID不存在');
        return;
      }

      logger.log(`▶ 编辑自定义模板: ${templateId}`);

      // 获取模板信息
      const template = refiningTemplateService.getTemplateById(templateId);
      if (!template) {
        vscode.window.showErrorMessage('模板不存在');
        return;
      }

      if (template.isSystemTemplate) {
        vscode.window.showWarningMessage('系统模板不能编辑');
        return;
      }

      // 创建编辑用的临时MD文件
      const templateContent = `# ✏️ 编辑自定义精修模板

## 📝 基本信息

**模板名称：** [${template.name}]

**精修提示词：** 
\`\`\`
${template.promptText}
\`\`\`

## 🏷️ 适用分类

请选择适用的分类（可多选），格式: \`category1,category2\`

可选分类：
- \`history\` - 历史小说 📚
- \`fantasy\` - 奇幻小说 🧙
- \`scifi\` - 科幻小说 🚀
- \`mystery\` - 悬疑推理 🔍
- \`romance\` - 爱情小说 💕
- \`web-novel\` - 网络文学 ⚡
- \`urban\` - 都市小说 🏙️
- \`action\` - 动作冒险 💥
- \`general\` - 通用 🌍

**分类选择：** \`${template.category.join(',')}\`
（在反引号中直接输入分类代码，多个用逗号分隔，如上所示）

## ⚙️ 可选信息

**难度级别（可选）：** ${template.difficulty}

**预估耗时（可选）：** [${template.estimatedTime / 1000}]

---

## ✅ 说明

1. 修改上面的信息
2. 保存此文件（Ctrl+S）
3. 模板会自动更新
4. 如有错误，下方会显示错误提示

⚠️ **注意：**
- 模板名称不能为空，最多50字符
- 精修提示词至少需要20个字符
- 至少需要选择一个分类
`;

      // 创建临时文件
      const tempDir = vscode.Uri.joinPath(context.globalStorageUri, 'temp-templates');
      try {
        await vscode.workspace.fs.createDirectory(tempDir);
      } catch (e) {
        // 目录可能已存在，忽略错误
      }

      const fileName = `edit-template-${templateId}-${Date.now()}.md`;
      const filePath = vscode.Uri.joinPath(tempDir, fileName);

      const encoder = new TextEncoder();
      await vscode.workspace.fs.writeFile(filePath, encoder.encode(templateContent));

      // 打开编辑文件
      const doc = await vscode.workspace.openTextDocument(filePath);
      await vscode.window.showTextDocument(doc, {
        viewColumn: vscode.ViewColumn.One,
        preview: false,
      });

      logger.log(`✓ 打开编辑模板文件: ${filePath.fsPath}`);

      // 监听保存事件
      const saveDisposable = vscode.workspace.onDidSaveTextDocument(async (savedDoc) => {
        if (savedDoc.uri.fsPath === filePath.fsPath) {
          logger.log('▶ 检测到模板文件保存，开始处理...');

          try {
            const content = savedDoc.getText();
            const templateData = parseCustomTemplateMarkdown(content);

            if (templateData.errors.length > 0) {
              vscode.window.showErrorMessage(
                `模板格式错误：\n${templateData.errors.join('\n')}`
              );
              return;
            }

            // 更新模板对象
            const updatedTemplate = {
              ...template,
              name: templateData.name,
              promptText: templateData.promptText,
              category: templateData.categories,
              difficulty: templateData.difficulty || 'medium',
              estimatedTime: (templateData.estimatedTime || 120) * 1000,
            };

            // 保存更新
            refiningTemplateService.saveCustomTemplate(updatedTemplate as any);

            // 删除临时文件
            try {
              await vscode.workspace.fs.delete(filePath);
            } catch (e) {
              logger.warn('⚠️ 删除临时文件失败，忽略');
            }

            // 关闭编辑器
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

            vscode.window.showInformationMessage(
              `✅ 模板已更新！\n📝 模板名称：${templateData.name}`
            );

            saveDisposable.dispose();
          } catch (error) {
            logger.error(`❌ 更新模板失败: ${error}`);
            vscode.window.showErrorMessage(`更新失败: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      });

      context.subscriptions.push(saveDisposable);

    } catch (error) {
      logger.error(`❌ 编辑模板失败: ${error}`);
      vscode.window.showErrorMessage(`编辑失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
  context.subscriptions.push(editCustomTemplateCmd);

  // 注册删除自定义精修模板命令
  const deleteCustomTemplateCmd = vscode.commands.registerCommand('novelAssistant.deleteCustomTemplate', async (params?: any) => {
    try {
      if (!isEntitledSync('refine')) {
        vscode.window.showInformationMessage(PRO_FEATURE_REQUIRED_MESSAGE);
        return;
      }

      const templateId = params?.templateId;
      if (!templateId) {
        vscode.window.showErrorMessage('模板ID不存在');
        return;
      }

      logger.log(`▶ 删除自定义模板: ${templateId}`);

      // 删除模板
      const deleted = refiningTemplateService.deleteCustomTemplate(templateId);

      if (deleted) {
        vscode.window.showInformationMessage(`✅ 模板已删除`);
      } else {
        vscode.window.showWarningMessage('模板不存在或删除失败');
      }
    } catch (error) {
      logger.error(`❌ 删除模板失败: ${error}`);
      vscode.window.showErrorMessage(`删除失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
  context.subscriptions.push(deleteCustomTemplateCmd);

  // --------------------------------------------------------
  // 注册全屏面板命令 (Editor Tabs)
  // --------------------------------------------------------

  // 1. 世界观设定
  const openWorldSettingCmd = vscode.commands.registerCommand('novelAssistant.openWorldSetting', () => {
    logger.log('▶ 打开面板：世界观设定');
    // 这里需要改造 WorldSettingPanel使其支持 createWebviewPanel
    WorldSettingPanel.getInstance(context.extensionUri).show();
  });

  // 2. 大纲管理
  const openOutlineCmd = vscode.commands.registerCommand('novelAssistant.openOutline', () => {
    logger.log('▶ 打开面板：大纲管理');
    OutlinePanel.getInstance(context.extensionUri).show();
  });

  // 3. 写作风格
  const openWritingStylesCmd = vscode.commands.registerCommand('novelAssistant.openWritingStyles', () => {
    logger.log('▶ 打开面板：写作风格');
    
    // 添加诊断日志
    logger.log(`🔍 风格模板权限检查 - isEntitledSync('styleTemplates'): ${isEntitledSync('styleTemplates')}`);

    if (!isEntitledSync('styleTemplates')) {
      vscode.window.showInformationMessage(PRO_FEATURE_REQUIRED_MESSAGE);
      return;
    }

    WritingStylesPackagePanel.getInstance(context.extensionUri).show();
  });

  // 4. 项目配置
  const openProjectConfigCmd = vscode.commands.registerCommand('novelAssistant.openProjectConfig', () => {
    logger.log('▶ 打开面板：项目配置');
    ProjectConfigPanel.getInstance(context.extensionUri).show();
  });

  // 5. 章节摘要
  const openSummaryCmd = vscode.commands.registerCommand('novelAssistant.openSummary', () => {
    logger.log('▶ 打开面板：章节摘要');
    SummaryPanel.getInstance(context.extensionUri).show();
  });

  context.subscriptions.push(
    openWorldSettingCmd,
    openOutlineCmd,
    openWritingStylesCmd,
    openProjectConfigCmd,
    openSummaryCmd
  );

  // 注册面板刷新服务
  const summaryPanel = SummaryPanel.getInstance(context.extensionUri);
  panelRefreshService.registerSummaryPanel(summaryPanel);

  const worldSettingPanel = WorldSettingPanel.getInstance(context.extensionUri);
  panelRefreshService.registerWorldSettingPanel(worldSettingPanel);

  const outlinePanel = OutlinePanel.getInstance(context.extensionUri);
  panelRefreshService.registerOutlinePanel(outlinePanel);

  const chapterGenerationPanel = ChapterGenerationEditorPanel.getInstance(context.extensionUri);
  panelRefreshService.registerChapterGenerationPanel(chapterGenerationPanel);

  const projectConfigPanel = ProjectConfigPanel.getInstance(context.extensionUri);
  panelRefreshService.registerProjectConfigPanel(projectConfigPanel);

  const promptTemplatePanel = PromptTemplatePanel.getInstance(context.extensionUri);
  panelRefreshService.registerPromptTemplatePanel(promptTemplatePanel);

  // 启动文件监听
  if (workspaceRoot) {
    panelRefreshService.startWatching(workspaceRoot);
  }

  const testApiCmd = vscode.commands.registerCommand('novelAssistant.testApi', async () => {
    logger.log('▶ 执行命令：测试 API 连接');

    const ok = aiService.loadConfig();
    if (!ok) {
      const action = await vscode.window.showErrorMessage(
        '请先在设置中配置 novelAssistant.apiKey / apiBase / model',
        '去配置'
      );
      if (action === '去配置') {
        vscode.commands.executeCommand('workbench.action.openSettings', 'novelAssistant');
      }
      return;
    }

    const success = await aiService.testConnection();
    if (success) {
      vscode.window.showInformationMessage('AI API 连接成功');
    } else {
      vscode.window.showErrorMessage('AI API 连接失败，详情见输出面板：小说创作助手');
    }
  });

  const genCmd = vscode.commands.registerCommand('novelAssistant.generateChapter', async () => {
    logger.log('▶ 执行命令：打开章节生成面板');
    ChapterGenerationEditorPanel.createOrShow(context.extensionUri);
  });

  // 辅助方法：提取章节号
  function extractChapterNumber(fileName: string): number | null {
    const match1 = fileName.match(/第?(\d+)章/);
    if (match1) return parseInt(match1[1], 10);

    const match2 = fileName.match(/chapter[_-]?(\d+)/i);
    if (match2) return parseInt(match2[1], 10);

    return null;
  }

  const analyzeCmd = vscode.commands.registerCommand('novelAssistant.analyzeChapter', async () => {
    logger.log('▶ 执行命令：分析当前章节');

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('请先打开一个要分析的章节文件');
      logger.log('❌ 分析失败：未找到活动编辑器');
      return;
    }

    const ok = aiService.loadConfig();
    if (!ok) {
      const action = await vscode.window.showErrorMessage(
        '请先在设置中配置 novelAssistant.apiKey / apiBase / model',
        '去配置'
      );
      if (action === '去配置') {
        vscode.commands.executeCommand('workbench.action.openSettings', 'novelAssistant');
      }
      return;
    }

    const doc = editor.document;
    const fullText = doc.getText();

    const fileName = doc.fileName.split(/[\\/]/).pop() || '未命名';

    // 从文件名提取章节号
    let chapterNumber = extractChapterNumber(fileName);
    if (!chapterNumber) {
      // 如果文件名无法提取，让用户输入
      const input = await vscode.window.showInputBox({
        prompt: '无法从文件名提取章节号，请手动输入',
        placeHolder: '例如: 1',
        validateInput: (value) => {
          if (!value || isNaN(Number(value)) || Number(value) <= 0) {
            return '请输入有效的章节号(正整数)';
          }
          return null;
        }
      });

      if (!input) {
        logger.log('❌ 用户取消输入章节号');
        return;
      }

      chapterNumber = parseInt(input, 10);
    }

    const title = fileName.replace(/\.(md|txt)$/i, '');
    logger.log(`📝 分析第${chapterNumber}章《${title}》`);

    const result = await analysisService.analyzeChapter(chapterNumber, title, fullText);

    if (!result) {
      vscode.window.showErrorMessage('章节分析失败，请查看输出面板：小说创作助手');
      return;
    }

    const summaryMsg =
      `分析完成！\n` +
      `钩子: ${result.hooks.length} 个 | ` +
      `伏笔: ${result.foreshadows.length} 个 | ` +
      `情节点: ${result.plotPoints.length} 个 | ` +
      `评分: ${result.scores.overall}/10`;

    vscode.window.showInformationMessage(summaryMsg);

    // 自动保存章节摘要 - 确保每个分析的章节都有摘要
    const paceLevel: 'slow' | 'moderate' | 'fast' =
      result.scores.pacing >= 7 ? 'fast' : result.scores.pacing >= 4 ? 'moderate' : 'slow';

    // 如果AI没有返回摘要，自动生成一个简单摘要
    const chapterSummary = result.summary ||
      `第${chapterNumber}章${title}主要讲述了${result.plotPoints.slice(0, 2).map(p => p.content).join('，')}。`;

    const summaryData = {
      id: dataStorage.generateSummaryId(),
      chapterNumber,
      chapterTitle: title,
      summary: chapterSummary,
      wordCount: fullText.length,
      keyCharacters: result.characterStates.map((c) => c.character_name),
      keyEvents: result.plotPoints.slice(0, 3).map((p) => p.content),
      mainConflict: result.conflict?.description || '',
      emotionalTone: result.emotionalArc?.primary_emotion || '',
      paceLevel,
      createdAt: new Date().toISOString()
    };

    dataStorage.addSummary(summaryData);

    // 刷新摘要面板
    summaryPanel.refresh();

    logger.log(`📝 保存章节摘要: 第${chapterNumber}章`);

    // 自动保存伏笔
    const planted = result.foreshadows.filter((f) => f.type === 'planted');
    if (planted.length > 0) {
      logger.log(`🎭 检测到 ${planted.length} 个新埋伏笔`);

      // 先删除同一章节的旧伏笔
      const allForeshadows = dataStorage.loadForeshadows();
      const filtered = allForeshadows.filter((f: any) => f.plantedChapter !== chapterNumber);
      dataStorage.saveForeshadows(filtered);
      logger.log(`🗑️ 清理第${chapterNumber}章的旧伏笔`);

      // 添加新伏笔
      for (const fs of planted) {
        const importance: 'high' | 'medium' | 'low' = fs.strength >= 7 ? 'high' : fs.strength >= 5 ? 'medium' : 'low';
        const foreshadow = {
          id: dataStorage.generateForeshadowId(),
          description: fs.content,
          status: 'pending' as const,
          importance,
          plantedChapter: chapterNumber,
          relatedCharacters: [],
          keyword: fs.keyword,
          notes: [`强度: ${fs.strength}/10`, `隐藏度: ${fs.subtlety}/10`],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        dataStorage.addForeshadow(foreshadow);
      }

      logger.log(`✅ 保存 ${planted.length} 个新伏笔`);
    }
  });

  context.subscriptions.push(testApiCmd, genCmd, analyzeCmd, logger.channel);

  // 清理资源
  context.subscriptions.push({
    dispose() {
      panelRefreshService.stopWatching();
    }
  });

  // 查看伏笔列表
  const foreshadowListPanel = ForeshadowListPanel.getInstance(context.extensionUri);
  const showForeshadowsCmd = vscode.commands.registerCommand('novelAssistant.showForeshadows', () => {
    logger.log('▶ 执行命令：查看伏笔列表');
    foreshadowListPanel.show();
  });

  // 编辑伏笔
  const foreshadowEditPanel = ForeshadowEditPanel.getInstance(context.extensionUri);
  const editForeshadowCmd = vscode.commands.registerCommand('novelAssistant.editForeshadow', (foreshadowId: string) => {
    logger.log(`▶ 执行命令：编辑伏笔 - ${foreshadowId || '新建'}`);
    foreshadowEditPanel.show(foreshadowId);
  });

  // 查看章节摘要
  const showSummariesCmd = vscode.commands.registerCommand('novelAssistant.showSummaries', () => {
    logger.log('▶ 执行命令：查看章节摘要');
    const summaries = dataStorage.loadSummaries();

    if (summaries.length === 0) {
      vscode.window.showInformationMessage('当前没有保存的章节摘要');
      return;
    }

    logger.log(`📚 章节摘要统计：共 ${summaries.length} 个章节`);

    for (const s of summaries) {
      logger.log(`  📖 第${s.chapterNumber}章《${s.chapterTitle}》(${s.wordCount}字)`);
      logger.log(`     ${s.summary.slice(0, 100)}...`);
    }

    vscode.window.showInformationMessage(`已保存 ${summaries.length} 个章节摘要，详情查看输出面板`);
  });

  context.subscriptions.push(showForeshadowsCmd, editForeshadowCmd, showSummariesCmd);

  const characterPanel = CharacterPanel.getInstance(context.extensionUri);
  const characterListPanel = CharacterListPanel.getInstance(context.extensionUri);

  const showCharacterListCmd = vscode.commands.registerCommand('novelAssistant.showCharacterList', () => {
    logger.log('▶ 执行命令：查看人物列表');
    characterListPanel.show();
  });

  const showCharacterDetailCmd = vscode.commands.registerCommand('novelAssistant.showCharacterDetail', async (characterId: string) => {
    logger.log(`▶ 执行命令：查看角色详情 - ${characterId}`);
    characterPanel.show(characterId);
  });

  const editCharacterCmd = vscode.commands.registerCommand('novelAssistant.editCharacter', async (characterId: string) => {
    logger.log(`▶ 执行命令：编辑角色 - ${characterId}`);
    const characterEditPanel = CharacterEditPanel.getInstance(context.extensionUri);
    characterEditPanel.show(characterId);
  });

  const editOutlineCmd = vscode.commands.registerCommand('novelAssistant.editOutline', async (outlineId: string) => {
    logger.log(`▶ 执行命令：编辑大纲 - ${outlineId}`);
    const outlineEditPanel = OutlineEditPanel.getInstance(context.extensionUri);
    outlineEditPanel.show(outlineId);
  });

  const editSummaryCmd = vscode.commands.registerCommand('novelAssistant.editSummary', async (summaryId: string) => {
    logger.log(`▶ 执行命令：编辑章节摘要 - ${summaryId}`);
    const summaryEditPanel = SummaryEditPanel.getInstance(context.extensionUri);
    summaryEditPanel.show(summaryId);
  });

  const editWorldSettingCmd = vscode.commands.registerCommand('novelAssistant.editWorldSetting', async () => {
    logger.log(`▶ 执行命令：编辑世界观设定`);
    const worldSettingEditPanel = WorldSettingEditPanel.getInstance(context.extensionUri);
    worldSettingEditPanel.show();
  });

  const foreshadowDetailPanel = ForeshadowDetailPanel.getInstance(context.extensionUri);

  const showForeshadowDetailCmd = vscode.commands.registerCommand('novelAssistant.showForeshadowDetail', async (foreshadowId: string) => {
    logger.log(`▶ 执行命令：查看伏笔详情 - ${foreshadowId}`);
    foreshadowDetailPanel.show(foreshadowId);
  });

  context.subscriptions.push(showCharacterListCmd, showCharacterDetailCmd, editCharacterCmd, editOutlineCmd, editSummaryCmd, editWorldSettingCmd, showForeshadowDetailCmd);

  // 注册关系图谱面板
  const relationshipPanel = RelationshipPanel.getInstance(context.extensionUri);
  const showRelationshipGraphCmd = vscode.commands.registerCommand('novelAssistant.showRelationshipGraph', () => {
    logger.log('▶ 执行命令：查看角色关系图谱');
    relationshipPanel.show();
  });
  context.subscriptions.push(showRelationshipGraphCmd);

  // 注册风格实验室面板
  const styleLabPanel = StyleLabPanel.getInstance(context.extensionUri);
  const openStyleLabCmd = vscode.commands.registerCommand('novelAssistant.openStyleLab', (pkgId: string) => {
    logger.log(`▶ 执行命令：打开风格实验室 - ${pkgId}`);
    styleLabPanel.show(pkgId);
  });
  context.subscriptions.push(openStyleLabCmd);

  // 导入文档
  const importDocCmd = vscode.commands.registerCommand('novelAssistant.importDocument', async () => {
    logger.log('▶ 执行命令：导入文档');

    const fileUris = await vscode.window.showOpenDialog({
      canSelectMany: false,
      openLabel: '选择要导入的文档',
      filters: {
        '文档文件': ['md', 'txt']
      }
    });

    if (!fileUris || fileUris.length === 0) {
      return;
    }

    const result = await importService.importDocument(fileUris[0].fsPath);

    if (result.success) {
      vscode.window.showInformationMessage(
        `导入成功: ${result.type}, 共 ${result.itemsImported} 项`
      );
    } else {
      vscode.window.showErrorMessage(
        `导入失败: ${result.errors.join(', ')}`
      );
    }
  });

  // 批量导入文件夹
  const importFolderCmd = vscode.commands.registerCommand('novelAssistant.importFolder', async () => {
    logger.log('▶ 执行命令：批量导入文件夹');

    const folderUris = await vscode.window.showOpenDialog({
      canSelectMany: false,
      canSelectFolders: true,
      openLabel: '选择要导入的文件夹'
    });

    if (!folderUris || folderUris.length === 0) {
      return;
    }

    const results = await importService.importFolder(folderUris[0].fsPath);
    const successCount = results.filter((r) => r.success).length;
    const totalCount = results.length;

    vscode.window.showInformationMessage(
      `批量导入完成: ${successCount}/${totalCount} 成功`
    );
  });

  // 查看大纲
  const showOutlinesCmd = vscode.commands.registerCommand('novelAssistant.showOutlines', () => {
    logger.log('▶ 执行命令：查看大纲');
    const outlines = dataStorage.loadOutlines();

    if (outlines.length === 0) {
      vscode.window.showInformationMessage('当前没有保存的大纲');
      return;
    }

    logger.log(`📚 大纲统计：共 ${outlines.length} 个条目`);

    for (const outline of outlines) {
      const prefix =
        outline.type === 'volume'
          ? `📖 卷${outline.volumeNumber}`
          : `📝 第${outline.chapterNumber}章`;
      logger.log(`  ${prefix}: ${outline.title}`);
      logger.log(`     ${outline.content.slice(0, 100)}...`);
    }

    vscode.window.showInformationMessage(`已加载 ${outlines.length} 个大纲条目，详情查看输出面板`);
  });

  context.subscriptions.push(importDocCmd, importFolderCmd, showOutlinesCmd);

  // 运行集成测试
  const runIntegrationTestsCmd = vscode.commands.registerCommand('novelAssistant.runIntegrationTests', async () => {
    logger.log('▶ 执行命令：运行集成测试');

    const { runIntegrationTestsAndGenerateReport } = await import('./testRunner');

    try {
      await runIntegrationTestsAndGenerateReport();
    } catch (error) {
      logger.log(`❌ 集成测试执行失败: ${error}`);
      vscode.window.showErrorMessage('集成测试执行失败，请查看输出面板');
    }
  });

  // 运行UI测试
  const runUITestsCmd = vscode.commands.registerCommand('novelAssistant.runUITests', async () => {
    logger.log('▶ 执行命令：运行UI测试');

    const { runUITests } = await import('./test/uiTestRunnerExtension');

    try {
      await runUITests(context);
    } catch (error) {
      logger.log(`❌ UI测试执行失败: ${error}`);
      vscode.window.showErrorMessage('UI测试执行失败，请查看输出面板');
    }
  });

  // 运行端到端测试
  const runE2ETestsCmd = vscode.commands.registerCommand('novelAssistant.runE2ETests', async () => {
    logger.log('▶ 执行命令：运行端到端测试');

    const { runE2ETests } = await import('./test/e2eTestRunnerExtension');

    try {
      await runE2ETests(context);
    } catch (error) {
      logger.log(`❌ 端到端测试执行失败: ${error}`);
      vscode.window.showErrorMessage('端到端测试执行失败，请查看输出面板');
    }
  });

  // 阶段1：基础设定导入命令
  const importBasicSettingsCmd = vscode.commands.registerCommand('novelAssistant.importBasicSettings', async () => {
    logger.log('▶ 执行命令：基础设定导入');
    try {
      await importService.startBasicSettingsImport();
    } catch (error: any) {
      logger.log(`❌ 基础设定导入失败: ${error}`);
      vscode.window.showErrorMessage(`基础设定导入失败: ${error.message}`);
    }
  });

  // 阶段2：大纲卷纲导入命令
  const importOutlineCmd = vscode.commands.registerCommand('novelAssistant.importOutline', async () => {
    logger.log('▶ 执行命令：大纲卷纲导入');
    try {
      await importService.startOutlineImport();
    } catch (error: any) {
      logger.log(`❌ 大纲卷纲导入失败: ${error}`);
      vscode.window.showErrorMessage(`大纲卷纲导入失败: ${error.message}`);
    }
  });

  // 阶段3-1：章节快速导入命令
  const importChaptersQuickCmd = vscode.commands.registerCommand('novelAssistant.importChaptersQuick', async () => {
    logger.log('▶ 执行命令：章节快速导入');
    try {
      await importService.startChapterQuickImport();
    } catch (error: any) {
      logger.log(`❌ 章节快速导入失败: ${error}`);
      vscode.window.showErrorMessage(`章节快速导入失败: ${error.message}`);
    }
  });

  // 阶段3-2：章节深度分析命令
  const analyzeChaptersCmd = vscode.commands.registerCommand('novelAssistant.analyzeChapters', async () => {
    logger.log('▶ 执行命令：章节深度分析');
    try {
      vscode.window.showInformationMessage('章节深度分析功能开发中，敬请期待');
    } catch (error: any) {
      logger.log(`❌ 章节深度分析失败: ${error}`);
      vscode.window.showErrorMessage(`章节深度分析失败: ${error.message}`);
    }
  });

  context.subscriptions.push(runIntegrationTestsCmd, runUITestsCmd, runE2ETestsCmd,
    importBasicSettingsCmd, importOutlineCmd, importChaptersQuickCmd, analyzeChaptersCmd);
}

/**
 * 解析自定义模板Markdown文件
 */
function parseCustomTemplateMarkdown(content: string): {
  name: string;
  promptText: string;
  categories: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  estimatedTime?: number;
  errors: string[];
} {
  const result: {
    name: string;
    promptText: string;
    categories: string[];
    difficulty: 'easy' | 'medium' | 'hard';
    estimatedTime: number;
    errors: string[];
  } = {
    name: '',
    promptText: '',
    categories: [],
    difficulty: 'medium',
    estimatedTime: 120,
    errors: []
  };

  // 提取模板名称
  const nameMatch = content.match(/\*\*模板名称：\*\*\s*\[([^\]]*)\]/);
  if (nameMatch && nameMatch[1].trim()) {
    result.name = nameMatch[1].trim();
  } else {
    result.errors.push('❌ 模板名称未填写');
  }

  // 验证模板名称长度
  if (result.name.length === 0) {
    result.errors.push('❌ 模板名称不能为空');
  } else if (result.name.length > 50) {
    result.errors.push('❌ 模板名称过长（最多50字符）');
  }

  // 提取提示词
  const promptMatch = content.match(/\*\*精修提示词：\*\*\s*```\s*([\s\S]*?)\s*```/);
  if (promptMatch && promptMatch[1].trim()) {
    result.promptText = promptMatch[1].trim();
  } else {
    result.errors.push('❌ 精修提示词未填写');
  }

  // 验证提示词长度
  if (result.promptText.length === 0) {
    result.errors.push('❌ 精修提示词不能为空');
  } else if (result.promptText.length < 20) {
    result.errors.push('❌ 精修提示词过短（最少20字符）');
  }

  // 提取分类
  const categoryMatch = content.match(/\*\*分类选择：\*\*\s*`([^`]*)`/);
  if (categoryMatch && categoryMatch[1].trim()) {
    const cats = categoryMatch[1]
      .replace(/[\[\]]/g, '')  // 移除方括号
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0);
    
    const validCategories = ['history', 'fantasy', 'scifi', 'mystery', 'romance', 'web-novel', 'urban', 'action', 'general'];
    const invalidCats = cats.filter(c => !validCategories.includes(c));
    
    if (invalidCats.length > 0) {
      result.errors.push(`❌ 无效的分类: ${invalidCats.join(', ')}`);
    } else {
      result.categories = cats;
    }
  }

  // 验证至少选择一个分类
  if (result.categories.length === 0) {
    result.errors.push('❌ 至少需要选择一个分类');
  }

  // 提取难度等级（可选）
  const difficultyMatch = content.match(/\*\*难度级别（可选）：\*\*\s*(easy|medium|hard)/);
  if (difficultyMatch && difficultyMatch[1]) {
    const d = difficultyMatch[1] as 'easy' | 'medium' | 'hard';
    result.difficulty = d;
  }

  // 提取预估耗时（可选）
  const timeMatch = content.match(/\*\*预估耗时（可选）：\*\*\s*\[(\d+)\]/);
  if (timeMatch && timeMatch[1]) {
    const time = parseInt(timeMatch[1], 10);
    if (!isNaN(time) && time > 0) {
      result.estimatedTime = time;
    }
  }

  return result;
}

export function deactivate() {
  logger.log('📦 小说创作助手插件已停用');
}
