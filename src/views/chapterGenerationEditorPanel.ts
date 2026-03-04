import * as vscode from 'vscode';
import { chapterGenerationService } from '../services/chapterGenerationService';
import { outlineRepository, foreshadowRepository } from '../repositories';
import { logger, LogLevel } from '../utils/logger';
import { panelRefreshService } from '../services/panelRefreshService';

/**
 * 章节生成 - 全屏编辑器面板
 */
export class ChapterGenerationEditorPanel {
  public static readonly viewType = 'novelAssistant.chapterGenerationEditor';

  private _panel?: vscode.WebviewPanel;
  private static _instance: ChapterGenerationEditorPanel | undefined;

  private constructor(private readonly _extensionUri: vscode.Uri) {}

  /**
   * 获取或创建实例
   */
  public static getInstance(extensionUri: vscode.Uri): ChapterGenerationEditorPanel {
    if (!ChapterGenerationEditorPanel._instance) {
      ChapterGenerationEditorPanel._instance = new ChapterGenerationEditorPanel(extensionUri);
    }
    return ChapterGenerationEditorPanel._instance;
  }

  /**
   * 在编辑器区域创建或显示面板
   */
  public static createOrShow(extensionUri: vscode.Uri): vscode.WebviewPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // 如果已经有面板实例，则显示它
    if (ChapterGenerationEditorPanel._instance && ChapterGenerationEditorPanel._instance._panel) {
      ChapterGenerationEditorPanel._instance._panel.reveal(column);
      return ChapterGenerationEditorPanel._instance._panel;
    }

    // 否则创建新实例
    const instance = ChapterGenerationEditorPanel.getInstance(extensionUri);
    
    // 创建新面板
    const panel = vscode.window.createWebviewPanel(
      ChapterGenerationEditorPanel.viewType,
      '🚀 章节生成',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri],
        retainContextWhenHidden: true // 保持上下文，避免切换tab时重置
      }
    );

    instance._panel = panel;
    instance._initializeWebviewPanel(panel);

    return panel;
  }

  /**
   * 初始化WebviewPanel
   */
  private _initializeWebviewPanel(panel: vscode.WebviewPanel): void {
    panel.webview.html = this._getHtmlForWebview(panel.webview);

    // 初始化数据
    this._initializeData();

    // 注册伏笔数据变化监听器
    const foreshadowDisposable = panelRefreshService.onForeshadowsChanged(() => {
      logger.debug('🎭 伏笔数据已更新，刷新章节生成面板');
      this._sendForeshadows();
    });

    // 监听来自 webview 的消息
    panel.webview.onDidReceiveMessage(async (data) => {
      logger.debug(`📨 收到 webview 消息: ${JSON.stringify(data)}`);
      await this._handleWebviewMessage(data);
    });

    // 监听面板关闭事件
    panel.onDidDispose(() => {
      this._panel = undefined;
      foreshadowDisposable.dispose();
    });
  }

  /**
   * 处理Webview消息
   */
  private async _handleWebviewMessage(data: any): Promise<void> {
    switch (data.command) {
      case 'generateChapter':
        logger.log('▶ 执行命令：生成章节（新界面）');
        await this._handleGenerateChapter(data);
        break;
      case 'analyzeChapter':
        logger.log('▶ 执行命令：分析章节（新界面）');
        await vscode.commands.executeCommand('novelAssistant.analyzeChapter');
        break;
      case 'getOutlines':
        this._sendOutlines();
        break;
      case 'getForeshadows':
        this._sendForeshadows();
        break;
      case 'refreshPanel':
        logger.debug('▶ 执行命令：刷新面板');
        this.refresh();
        break;
      default:
        logger.debug(`⚠️ 未知命令: ${data.command}`);
    }
  }

  /**
   * 向Webview发送消息
   */
  private _sendMessageToWebview(message: any) {
    this._panel?.webview.postMessage(message);
  }

  private async _initializeData() {
    const nextChapter = chapterGenerationService.getNextChapterNumber();
    this._sendMessageToWebview({
      command: 'updateNextChapter',
      nextChapter: nextChapter
    });
    this._sendForeshadows();
  }

  private async _handleGenerateChapter(data: any) {
    logger.log('▶ 执行命令：生成章节（新界面）');
    logger.debug(`📥 接收到的数据: ${JSON.stringify(data)}`);

    const chapterNum = data.chapterNumber ? parseInt(data.chapterNumber, 10) : chapterGenerationService.getNextChapterNumber();
    const chapterGoal = data.chapterGoal || '';
    const paceLevel = data.paceLevel || 3;
    const selectedForeshadows = data.selectedForeshadows || [];

    this._sendMessageToWebview({ command: 'generationStarted' });

    const result = await chapterGenerationService.generateChapter({
      chapterNumber: chapterNum,
      chapterGoal,
      paceLevel,
      selectedForeshadows
    });

    if (!result.success) {
      vscode.window.showErrorMessage(result.error || '生成失败，请查看输出面板');
      this._sendMessageToWebview({ command: 'generationFailed' });
      return;
    }

    vscode.window.showInformationMessage(`生成完成: ${result.wordCount} 字，已保存到 ${result.fileName}`);
    
    this._sendMessageToWebview({ 
      command: 'generationCompleted', 
      fileName: result.fileName, 
      wordCount: result.wordCount 
    });
  }

  private _sendOutlines() {
    const outlines = outlineRepository.loadAll();
    const chapterOutlines = outlines.filter(o => o.type === 'chapter').sort((a, b) => a.orderIndex - b.orderIndex);
    
    this._sendMessageToWebview({
      command: 'updateOutlines',
      outlines: chapterOutlines
    });
  }

  private _sendForeshadows() {
    const foreshadows = foreshadowRepository.loadAll();
    const pending = foreshadows.filter(f => f.status === 'pending');
    
    this._sendMessageToWebview({
      command: 'updateForeshadows',
      foreshadows: pending
    });
  }
  
  /**
   * 刷新面板数据
   */
  public refresh() {
    logger.debug('🔄 章节生成面板刷新被调用');
    this._initializeData();
    this._sendOutlines();
    this._sendForeshadows();
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    // 简单复用之前的HTML，后续可以针对全屏进行优化
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>章节生成</title>
  <style>
    body {
      padding: 20px;
      color: var(--vscode-foreground);
      font-size: 14px;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
    }
    /* 统一刷新按钮样式 */
    .refresh-button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s ease;
      min-width: 80px;
      justify-content: center;
    }
    
    .refresh-button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    
    .refresh-button:active {
      transform: translateY(1px);
    }
    
    .refresh-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
    
    /* 加载动画 */
    .refresh-spinner {
      width: 12px;
      height: 12px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: var(--vscode-button-foreground);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    
    /* 状态指示器 */
    .refresh-status {
      font-size: 11px;
      margin-left: 8px;
      opacity: 0.8;
    }
    
    .refresh-status.success {
      color: var(--vscode-testing-iconPassed);
    }
    
    .refresh-status.error {
      color: var(--vscode-errorForeground);
    }
    
    .section {
      margin-bottom: 24px;
      background: var(--vscode-editor-background);
      padding: 16px;
      border: 1px solid var(--vscode-widget-border);
      border-radius: 6px;
    }
    
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    
    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--vscode-editor-foreground);
    }
    label {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 500;
      color: var(--vscode-editor-foreground);
    }
    input[type="text"], input[type="number"], textarea, select {
      width: 100%;
      padding: 8px 12px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      font-size: 14px;
      box-sizing: border-box;
    }
    input:focus, textarea:focus, select:focus {
      outline: 1px solid var(--vscode-focusBorder);
      border-color: var(--vscode-focusBorder);
    }
    textarea {
      resize: vertical;
      min-height: 100px;
      font-family: var(--vscode-font-family);
    }
    .pace-selector {
      margin-top: 8px;
    }
    .pace-option {
      padding: 8px 12px;
      margin: 4px 0;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .pace-option:hover {
      background: var(--vscode-list-hoverBackground);
    }
    .pace-option.selected {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-color: var(--vscode-button-background);
    }
    .pace-level {
      font-weight: 600;
      margin-bottom: 4px;
    }
    .pace-desc {
      font-size: 11px;
      opacity: 0.8;
    }
    .foreshadow-list {
      max-height: 250px;
      overflow-y: auto;
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      padding: 8px;
      background: var(--vscode-editor-background);
    }
    .foreshadow-item {
      padding: 8px;
      margin: 4px 0;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid var(--vscode-widget-border);
    }
    .foreshadow-item:last-child {
      border-bottom: none;
    }
    .foreshadow-item input[type="checkbox"] {
      width: auto;
      transform: scale(1.2);
    }
    .foreshadow-info {
      flex: 1;
      font-size: 13px;
    }
    .foreshadow-keyword {
      font-weight: 600;
      color: var(--vscode-textLink-foreground);
      font-size: 14px;
    }
    button {
      padding: 10px 20px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      width: 100%;
      margin-top: 16px;
    }
    button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .hint {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-top: 6px;
      font-style: italic;
    }
    /* 进度显示 */
    .progress-container {
      margin: 16px 0;
    }
    
    .progress-bar {
      width: 100%;
      height: 8px;
      background: var(--vscode-input-background);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 8px;
    }
    
    .progress-fill {
      height: 100%;
      background: var(--vscode-textLink-foreground);
      border-radius: 4px;
      width: 0%;
      transition: width 0.3s ease;
    }
    
    .progress-text {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      display: flex;
      justify-content: space-between;
    }
    
    /* 生成日志 */
    .generation-logs {
      margin-top: 12px;
      max-height: 200px;
      overflow-y: auto;
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      padding: 12px;
      font-size: 12px;
      line-height: 1.5;
      font-family: var(--vscode-editor-font-family);
    }
    
    .log-item {
      margin-bottom: 6px;
      padding-left: 16px;
      position: relative;
    }
    
    .log-item:before {
      content: '•';
      position: absolute;
      left: 0;
      color: var(--vscode-descriptionForeground);
    }
    
    /* 状态显示 */
    .status {
      padding: 16px;
      margin-top: 20px;
      background: var(--vscode-editor-background);
      border-radius: 4px;
      font-size: 14px;
      display: none;
      border-left: 4px solid transparent;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .status.show {
      display: block;
    }
    
    .status.generating {
      color: var(--vscode-textLink-foreground);
      border-left-color: var(--vscode-textLink-foreground);
    }
    
    .status.success {
      color: var(--vscode-testing-iconPassed);
      border-left-color: var(--vscode-testing-iconPassed);
    }
    
    .status.error {
      color: var(--vscode-errorForeground);
      border-left-color: var(--vscode-errorForeground);
    }
    
    .status.warning {
      color: var(--vscode-editorWarningForeground);
      border-left-color: var(--vscode-editorWarningForeground);
    }
    
    /* 生成结果信息卡片 */
    .info-card {
      padding: 16px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 6px;
      margin-top: 20px;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 13px;
    }
    
    .info-row:last-child {
      margin-bottom: 0;
    }
    
    .info-label {
      color: var(--vscode-descriptionForeground);
    }
    
    .info-value {
      font-weight: 600;
    }
    
    /* 生成结果操作区 */
    .result-actions {
      margin-top: 20px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
    }
    
    .result-actions button {
      margin-top: 0;
      padding: 8px 16px;
      font-size: 13px;
    }
    .button-group {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 16px;
      margin-top: 24px;
    }
    .button-group button {
      margin-top: 0;
    }
  </style>
</head>
<body>
  <div class="section">
    <div class="section-header">
      <div class="section-title">✨ 章节生成控制台</div>
      <div style="display: flex; align-items: center;">
        <button class="refresh-button" id="refreshBtn">
          <span id="refreshText">刷新</span>
          <div class="refresh-spinner" id="refreshSpinner" style="display: none;"></div>
        </button>
        <span class="refresh-status" id="refreshStatus"></span>
      </div>
    </div>
  </div>

  <div class="section">
    <label>快捷生成</label>
    <input type="text" id="quickGen" placeholder="自动获取下一章" readonly>
    <div class="hint">系统自动检测当前进度，建议从此开始</div>
  </div>

  <div class="section">
    <label>章节编号</label>
    <input type="number" id="chapterNumber" placeholder="留空自动获取" min="1">
  </div>

  <div class="section">
    <label>本章目标</label>
    <textarea id="chapterGoal" placeholder="可填写：剧情推进/人物塑造/伏笔埋设/爽点设计等...
例如：主角在拍卖会上遇到了宿敌，决定故意抬价坑对方一把，最后发现拍品里藏着惊天秘密。"></textarea>
    <div class="hint">AI将围绕此目标进行创作，描述越具体，效果越好</div>
  </div>

  <div class="section">
    <label>节奏等级</label>
    <select id="paceLevel">
      <option value="1">1 - 极慢（细腻铺垫，为后续冲突蓄力）</option>
      <option value="2">2 - 较慢（稳步发展，伏笔埋设）</option>
      <option value="3" selected>3 - 适中（叙事平衡，节奏适中）</option>
      <option value="4">4 - 较快（节奏紧凑，爽点密集）</option>
      <option value="5">5 - 极快（高潮迭起，爽点爆发）</option>
    </select>
    <div class="hint">控制章节的节奏和叙事风格</div>
  </div>

  <div class="section">
    <label>选择伏笔（可选）</label>
    <div class="foreshadow-list" id="foreshadowList">
      <div style="text-align: center; padding: 20px; color: var(--vscode-descriptionForeground);">
        暂无待回收伏笔
      </div>
    </div>
    <div class="hint">选中的伏笔将在本章中进行处理或推进</div>
  </div>

  <div class="button-group">
    <button id="analyzeBtn" style="background-color: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground);">📝 分析当前章节</button>
    <button id="generateBtn">🚀 开始生成章节</button>
  </div>

  <!-- 进度显示 -->
  <div class="progress-container" id="progressContainer" style="display: none;">
    <div class="progress-bar">
      <div class="progress-fill" id="progressFill"></div>
    </div>
    <div class="progress-text">
      <span id="progressStage">准备生成...</span>
      <span id="progressPercentage">0%</span>
    </div>
    <!-- 生成日志 -->
    <div class="generation-logs" id="generationLogs"></div>
  </div>

  <!-- 状态显示 -->
  <div class="status" id="status"></div>

  <!-- 生成结果信息卡片 -->
  <div class="info-card" id="resultCard" style="display: none;">
    <div class="info-row">
      <span class="info-label">章节编号</span>
      <span class="info-value" id="resultChapterNumber"></span>
    </div>
    <div class="info-row">
      <span class="info-label">文件名称</span>
      <span class="info-value" id="resultFileName"></span>
    </div>
    <div class="info-row">
      <span class="info-label">字数统计</span>
      <span class="info-value" id="resultWordCount"></span>
    </div>
    <div class="info-row">
      <span class="info-label">生成时间</span>
      <span class="info-value" id="resultTime"></span>
    </div>
  </div>

  <!-- 生成结果操作按钮 -->
  <div class="result-actions" id="resultActions" style="display: none;">
    <button id="openFileBtn">📄 打开文件</button>
    <button id="generateNextBtn">➡️ 生成下一章</button>
    <button id="copyFilePathBtn">📋 复制路径</button>
    <button id="refreshForeshadowsBtn">🔄 更新伏笔</button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    let selectedPaceLevel = 3;
    let selectedForeshadows = [];

    console.log('🎬 章节生成面板脚本开始执行');

    // 节奏选择
    const paceSelect = document.getElementById('paceLevel');
    if (paceSelect) {
      console.log('✅ 节奏选择器已找到');
      paceSelect.addEventListener('change', function(e) {
        selectedPaceLevel = parseInt(e.target.value);
        console.log('⚡ 节奏等级已更新:', selectedPaceLevel);
      });
      selectedPaceLevel = parseInt(paceSelect.value);
    } else {
      console.error('❌ 找不到节奏选择器');
    }

    // 分析按钮
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
      console.log('✅ 分析按钮已找到');
      analyzeBtn.addEventListener('click', function() {
        console.log('📝 分析按钮被点击');
        showStatus('AI 正在分析章节...', 'generating');
        analyzeBtn.disabled = true;
        vscode.postMessage({ command: 'analyzeChapter' });
        console.log('✅ 分析消息已发送到扩展');
        
        // 由于分析章节是通过命令执行的，没有直接的回调机制
        // 我们设置一个定时器来模拟分析完成的提示，实际分析完成后会有系统提示
        setTimeout(function() {
          showStatus('✅ 分析完成！详情请查看系统提示', 'success');
          analyzeBtn.disabled = false;
        }, 2000);
      });
    } else {
      console.error('❌ 找不到分析按钮');
    }

    // 生成按钮
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) {
      console.log('✅ 生成按钮已找到');
      generateBtn.addEventListener('click', function() {
        console.log('🚀 生成按钮被点击');
        const chapterNumber = document.getElementById('chapterNumber').value;
        const chapterGoal = document.getElementById('chapterGoal').value;

        console.log('📝 发送生成请求:', { chapterNumber, chapterGoal, selectedPaceLevel, selectedForeshadows });

        document.getElementById('generateBtn').disabled = true;
        showStatus('正在生成章节，请稍候...', 'generating');

        vscode.postMessage({
          command: 'generateChapter',
          chapterNumber: chapterNumber,
          chapterGoal: chapterGoal,
          paceLevel: selectedPaceLevel,
          selectedForeshadows: selectedForeshadows
        });

        console.log('✅ 消息已发送到扩展');
      });
    } else {
      console.error('❌ 找不到生成按钮');
    }
    
    // 刷新按钮
    const refreshBtn = document.getElementById('refreshBtn');
    const refreshText = document.getElementById('refreshText');
    const refreshSpinner = document.getElementById('refreshSpinner');
    const refreshStatus = document.getElementById('refreshStatus');
    
    if (refreshBtn) {
      console.log('✅ 刷新按钮已找到');
      refreshBtn.addEventListener('click', async function() {
        console.log('🔄 刷新按钮被点击');
        
        // 显示加载状态
        refreshBtn.disabled = true;
        refreshText.textContent = '刷新中';
        refreshSpinner.style.display = 'block';
        refreshStatus.textContent = '';
        
        try {
          // 发送刷新请求
          vscode.postMessage({ command: 'refreshPanel' });
          
          // 模拟刷新过程（实际项目中会根据扩展返回的消息更新状态）
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // 显示成功状态
          refreshText.textContent = '刷新';
          refreshSpinner.style.display = 'none';
          refreshStatus.textContent = '刷新成功';
          refreshStatus.className = 'refresh-status success';
          refreshBtn.disabled = false;
          
          // 3秒后清除状态
          setTimeout(() => {
            refreshStatus.textContent = '';
          }, 3000);
        } catch (error) {
          // 显示错误状态
          console.error('❌ 刷新失败:', error);
          refreshText.textContent = '刷新';
          refreshSpinner.style.display = 'none';
          refreshStatus.textContent = '刷新失败';
          refreshStatus.className = 'refresh-status error';
          refreshBtn.disabled = false;
          
          // 3秒后清除状态
          setTimeout(() => {
            refreshStatus.textContent = '';
          }, 3000);
        }
      });
    } else {
      console.error('❌ 找不到刷新按钮');
    }

    // 监听来自扩展的消息
    window.addEventListener('message', function(event) {
      const message = event.data;
      console.log('📨 收到扩展消息:', message);
      switch (message.command) {
        case 'updateNextChapter':
          const quickGen = document.getElementById('quickGen');
          if (quickGen) {
            quickGen.value = '第' + message.nextChapter + '章';
            console.log('📝 章节编号已更新:', message.nextChapter);
          }
          break;
        case 'updateForeshadows':
          console.log('🎭 伏笔列表已更新:', message.foreshadows.length, '个');
          renderForeshadows(message.foreshadows);
          break;
        case 'generationStarted':
          console.log('⏳ 开始生成章节');
          showStatus('AI 正在创作中...', 'generating');
          break;
        case 'generationCompleted':
          console.log('✅ 章节生成完成');
          showStatus('✅ 生成完成！文件：' + message.fileName + '，字数：' + message.wordCount, 'success');
          document.getElementById('generateBtn').disabled = false;
          break;
        case 'generationFailed':
          console.error('❌ 章节生成失败');
          showStatus('❌ 生成失败，请查看输出面板', 'error');
          document.getElementById('generateBtn').disabled = false;
          break;
        case 'analysisCompleted':
          console.log('✅ 章节分析完成');
          showStatus('✅ 分析完成！' + (message.details || ''), 'success');
          document.getElementById('analyzeBtn').disabled = false;
          break;
        case 'analysisFailed':
          console.error('❌ 章节分析失败');
          showStatus('❌ 分析失败，请查看输出面板', 'error');
          document.getElementById('analyzeBtn').disabled = false;
          break;
      }
    });

    function renderForeshadows(foreshadows) {
      console.log('🎭 开始渲染伏笔列表:', foreshadows.length, '个');
      const container = document.getElementById('foreshadowList');
      if (foreshadows.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--vscode-descriptionForeground);">暂无待回收伏笔</div>';
        return;
      }

      container.innerHTML = foreshadows.map(function(f) {
        return '<div class="foreshadow-item">' +
          '<input type="checkbox" id="foreshadow-' + f.id + '" value="' + f.id + '">' +
          '<label for="foreshadow-' + f.id + '" class="foreshadow-info">' +
          '<span class="foreshadow-keyword">' + f.keyword + '</span>' +
          '<span>（第' + f.plantedChapter + '章）</span> - ' + f.description +
          '</label>' +
          '</div>';
      }).join('');

      // 监听复选框变化
      container.querySelectorAll('input[type="checkbox"]').forEach(function(cb) {
        cb.addEventListener('change', function(e) {
          const target = e.target;
          if (target.checked) {
            selectedForeshadows.push(target.value);
            console.log('✓ 选中伏笔:', target.value);
          } else {
            selectedForeshadows = selectedForeshadows.filter(function(id) { return id !== target.value; });
            console.log('✗ 取消选中伏笔:', target.value);
          }
        });
      });
    }

    function showStatus(message, type) {
      const status = document.getElementById('status');
      status.textContent = message;
      status.className = 'status show ' + type;
      console.log('📊 状态更新:', type, message);
    }

    console.log('✅ 章节生成面板脚本初始化完成');
  </script>
</body>
</html>`;
  }
}
