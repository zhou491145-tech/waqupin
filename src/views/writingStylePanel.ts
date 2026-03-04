import * as vscode from 'vscode';
import { writingStyleRepository } from '../repositories';
import { logger } from '../utils/logger';
import { PRESET_WRITING_STYLES } from '../services/writingStylePresets';
import { WritingStyle } from '../data/storage';

export class WritingStylePanel {
  public static readonly viewType = 'novelAssistant.writingStyles';

  private _view?: vscode.WebviewView;
  private _panel?: vscode.WebviewPanel;
  private static _instance: WritingStylePanel | undefined;

  private constructor(private readonly _extensionUri: vscode.Uri) {}

  /**
   * 获取或创建实例
   */
  public static getInstance(extensionUri: vscode.Uri): WritingStylePanel {
    if (!WritingStylePanel._instance) {
      WritingStylePanel._instance = new WritingStylePanel(extensionUri);
    }
    return WritingStylePanel._instance;
  }

  /**
   * 在编辑器区域创建或显示面板
   */
  public static createOrShow(extensionUri: vscode.Uri): vscode.WebviewPanel {
    // 创建新面板
    const panel = vscode.window.createWebviewPanel(
      WritingStylePanel.viewType,
      '🎨 写作风格',
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri]
      }
    );

    // 获取实例并初始化面板
    const instance = WritingStylePanel.getInstance(extensionUri);
    instance._panel = panel;
    instance._initializeWebviewPanel(panel);

    return panel;
  }

  /**
   * 初始化WebviewPanel
   */
  private _initializeWebviewPanel(panel: vscode.WebviewPanel): void {
    panel.webview.html = this._getHtmlForWebview(panel.webview);
    this._sendWritingStyles();

    // 监听来自 webview 的消息
    panel.webview.onDidReceiveMessage(async (data) => {
      await this._handleWebviewMessage(data);
    });

    // 监听面板关闭事件
    panel.onDidDispose(() => {
      this._panel = undefined;
    });
  }

  /**
   * 处理侧边栏WebviewView
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    this._sendWritingStyles();

    // 监听来自 webview 的消息
    webviewView.webview.onDidReceiveMessage(async (data) => {
      await this._handleWebviewMessage(data);
    });
  }

  /**
   * 向所有可用的Webview发送消息
   */
  private _sendMessageToWebview(message: any) {
    this._view?.webview.postMessage(message);
    this._panel?.webview.postMessage(message);
  }

  /**
   * 处理Webview消息
   */
  private async _handleWebviewMessage(data: any): Promise<void> {
    switch (data.command) {
      case 'log':
        logger.info(`📝 Webview log: ${data.message}`);
        break;
      case 'saveStyle':
        await this._saveStyle(data.style);
        break;
      case 'deleteStyle':
        await this._deleteStyle(data.styleId);
        break;
      case 'setDefaultStyle':
        await this._setDefaultStyle(data.styleId);
        break;
      case 'getWritingStyles':
        this._sendWritingStyles();
        break;
      case 'addPresetStyle':
        await this._addPresetStyle(data.presetKey);
        break;
      default:
        logger.debug(`⚠️ 未知命令: ${data.command}`);
    }
  }

  /**
   * 发送写作风格到Webview
   */
  private _sendWritingStyles() {
    const style = writingStyleRepository.load();
    this._sendMessageToWebview({
      command: 'updateWritingStyles',
      styles: style ? [style] : [],
      presets: PRESET_WRITING_STYLES
    });
  }

  /**
   * 保存写作风格
   */
  private async _saveStyle(style: any): Promise<void> {
    try {
      writingStyleRepository.save(style);
      this._sendWritingStyles();
      this._sendMessageToWebview({
        command: 'saveSuccess',
        message: '写作风格保存成功'
      });
      vscode.window.showInformationMessage('写作风格保存成功');
    } catch (error) {
      logger.error(`❌ 保存写作风格失败: ${error}`);
      this._sendMessageToWebview({
        command: 'saveError',
        message: `保存失败: ${error}`
      });
      vscode.window.showErrorMessage(`保存写作风格失败: ${error}`);
    }
  }

  /**
   * 删除写作风格
   */
  private async _deleteStyle(styleId: string): Promise<void> {
    try {
      writingStyleRepository.delete();
      this._sendWritingStyles();
      this._sendMessageToWebview({
        command: 'deleteSuccess',
        message: '写作风格删除成功'
      });
      vscode.window.showInformationMessage('写作风格删除成功');
    } catch (error) {
      logger.error(`❌ 删除写作风格失败: ${error}`);
      this._sendMessageToWebview({
        command: 'deleteError',
        message: `删除失败: ${error}`
      });
      vscode.window.showErrorMessage(`删除写作风格失败: ${error}`);
    }
  }

  /**
   * 设置默认写作风格
   */
  private async _setDefaultStyle(styleId: string): Promise<void> {
    try {
      // 获取当前风格
      const style = writingStyleRepository.load();
      if (style) {
        // 更新默认状态
        const updatedStyle = {
          ...style,
          isDefault: style.id === styleId,
          updatedAt: new Date().toISOString()
        };
        writingStyleRepository.save(updatedStyle);
        
        this._sendWritingStyles();
        this._sendMessageToWebview({
          command: 'setDefaultSuccess',
          message: '默认风格设置成功'
        });
        vscode.window.showInformationMessage('默认风格设置成功');
      }
    } catch (error) {
      logger.error(`❌ 设置默认风格失败: ${error}`);
      this._sendMessageToWebview({
        command: 'setDefaultError',
        message: `设置默认风格失败: ${error}`
      });
      vscode.window.showErrorMessage(`设置默认风格失败: ${error}`);
    }
  }

  /**
   * 添加预设风格
   */
  private async _addPresetStyle(presetKey: string): Promise<void> {
    try {
      const preset = PRESET_WRITING_STYLES.find(style => style.id === presetKey);
      if (!preset) {
        throw new Error(`找不到预设风格: ${presetKey}`);
      }

      // 创建符合WritingStyle接口的对象
      const newStyle: WritingStyle = {
        id: `custom-${Date.now()}`,
        name: preset.name,
        description: preset.description,
        characteristics: [],
        writingRules: preset.styleContent.split('\n').filter(line => line.trim() !== ''),
        exampleSentences: [],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      writingStyleRepository.save(newStyle);
      this._sendWritingStyles();
      this._sendMessageToWebview({
        command: 'addPresetSuccess',
        message: '预设风格添加成功'
      });
      vscode.window.showInformationMessage('预设风格添加成功');
    } catch (error) {
      logger.error(`❌ 添加预设风格失败: ${error}`);
      this._sendMessageToWebview({
        command: 'addPresetError',
        message: `添加失败: ${error}`
      });
      vscode.window.showErrorMessage(`添加预设风格失败: ${error}`);
    }
  }

  /**
   * 获取Webview的HTML内容
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>写作风格管理</title>
  <style>
    body {
      padding: 16px;
      color: var(--vscode-foreground);
      font-size: 13px;
      line-height: 1.6;
    }
    
    h1 {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 20px 0;
      color: var(--vscode-editor-foreground);
    }
    
    .section {
      margin-bottom: 24px;
    }
    
    .section-title {
      font-weight: 600;
      margin-bottom: 12px;
      color: var(--vscode-editor-foreground);
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .section-title::before {
      content: '';
      display: inline-block;
      width: 4px;
      height: 16px;
      background: var(--vscode-textLink-foreground);
      border-radius: 2px;
    }
    
    /* 网格布局 */
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }
    
    .card {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 6px;
      padding: 16px;
      transition: all 0.2s ease;
    }
    
    .card:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transform: translateY(-1px);
    }
    
    /* 按钮样式 */
    button {
      padding: 8px 16px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s ease;
    }
    
    button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    
    button:active {
      transform: translateY(1px);
    }
    
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    /* 表单样式 */
    .form-row {
      margin-bottom: 16px;
    }
    
    label {
      display: block;
      margin-bottom: 6px;
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }
    
    input[type="text"], textarea, select {
      width: 100%;
      padding: 8px 12px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      font-size: 13px;
      box-sizing: border-box;
    }
    
    textarea {
      resize: vertical;
      min-height: 80px;
      font-family: var(--vscode-font-family);
    }
    
    input:focus, textarea:focus, select:focus {
      outline: 1px solid var(--vscode-focusBorder);
    }
    
    /* 风格列表 */
    .styles-list {
      max-height: 400px;
      overflow-y: auto;
      border: 1px solid var(--vscode-input-border);
      border-radius: 6px;
      padding: 8px;
      background: var(--vscode-editor-background);
      margin-bottom: 20px;
    }
    
    .style-item {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 12px;
      transition: all 0.2s ease;
    }
    
    .style-item:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .style-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .style-title {
      font-weight: 600;
      font-size: 14px;
      color: var(--vscode-editor-foreground);
    }
    
    .style-actions {
      display: flex;
      gap: 8px;
    }
    
    .style-actions button {
      padding: 4px 8px;
      font-size: 12px;
    }
    
    .style-meta {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 8px;
    }
    
    .style-content {
      background: var(--vscode-input-background);
      padding: 8px;
      border-radius: 4px;
      font-size: 12px;
      margin-bottom: 8px;
    }
    
    /* 模态框样式 */
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      align-items: center;
      justify-content: center;
    }
    
    .modal.show {
      display: flex;
    }
    
    .modal-content {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 8px;
      padding: 20px;
      max-width: 500px;
      width: 100%;
      max-height: 80vh;
      overflow-y: auto;
    }
    
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    
    .modal-title {
      font-size: 16px;
      font-weight: 600;
    }
    
    .close-btn {
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      padding: 4px;
      color: var(--vscode-foreground);
    }
    
    /* 预设风格 */
    .presets-section {
      margin-top: 20px;
    }
    
    .presets-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 12px;
      margin-top: 12px;
    }
    
    .preset-item {
      background: var(--vscode-input-background);
      padding: 12px;
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .preset-item:hover {
      background: var(--vscode-list-hoverBackground);
      transform: translateY(-1px);
    }
    
    /* 状态消息 */
    .status {
      padding: 10px;
      margin-bottom: 16px;
      border-radius: 4px;
      font-size: 12px;
      display: none;
    }
    
    .status.show {
      display: block;
    }
    
    .status.success {
      background: rgba(65, 185, 131, 0.1);
      color: #41b983;
      border: 1px solid rgba(65, 185, 131, 0.3);
    }
    
    .status.error {
      background: var(--vscode-error-background);
      color: var(--vscode-errorForeground);
      border: 1px solid var(--vscode-error-border);
    }
    
    /* 标签样式 */
    .tag {
      display: inline-block;
      padding: 2px 8px;
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 10px;
      font-size: 11px;
      margin-right: 4px;
    }
    
    /* 响应式设计 */
    @media (max-width: 768px) {
      .grid {
        grid-template-columns: 1fr;
      }
      
      .presets-list {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <h1>🎨 写作风格管理</h1>
  
  <!-- 状态消息 -->
  <div class="status" id="status"></div>
  
  <!-- 快速操作 -->
  <div class="section">
    <div class="section-title">快速操作</div>
    <div class="grid">
      <div class="card">
        <h3 style="margin-top: 0; margin-bottom: 12px;">创建自定义风格</h3>
        <button id="createStyleBtn" onclick="logToExtension('createStyle button clicked'); window.createStyle()">+ 新建风格</button>
      </div>
      <div class="card">
        <h3 style="margin-top: 0; margin-bottom: 12px;">预设风格库</h3>
        <button id="showPresetsBtn" onclick="logToExtension('openPresetsModal button clicked'); window.openPresetsModal()">📚 查看预设</button>
      </div>
    </div>
  </div>
  
  <!-- 风格列表 -->
  <div class="section">
    <div class="section-title">我的风格</div>
    <div id="stylesList" class="styles-list">
      <div style="text-align: center; color: var(--vscode-descriptionForeground); padding: 40px;">加载中...</div>
    </div>
  </div>
  
  <!-- 预设风格模态框 -->
  <div id="presetsModal" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">📚 预设风格库</h3>
        <button class="close-btn" onclick="window.closePresetsModal()">×</button>
      </div>
      <div class="presets-section">
        <div class="presets-list" id="presetsList">
          <!-- 预设风格将通过JavaScript动态加载 -->
        </div>
      </div>
      <div style="margin-top: 16px; text-align: right;">
        <button onclick="window.closePresetsModal()">关闭</button>
      </div>
    </div>
  </div>
  
  <!-- 创建/编辑风格模态框 -->
  <div id="styleModal" class="modal">
    <div class="modal-content" style="max-width: 600px;">
      <div class="modal-header">
        <h3 class="modal-title" id="styleModalTitle">创建写作风格</h3>
        <button class="close-btn" onclick="window.closeStyleModal()">×</button>
      </div>
      
      <form id="styleForm">
        <input type="hidden" id="styleId">
        
        <div class="form-row">
          <label for="styleName">风格名称</label>
          <input type="text" id="styleName" placeholder="请输入风格名称" required>
        </div>
        
        <div class="form-row">
          <label for="styleDescription">风格描述</label>
          <textarea id="styleDescription" placeholder="简要描述这个风格的特点"></textarea>
        </div>
        
        <div class="form-row">
          <label for="stylePrompt">提示词内容</label>
          <textarea id="stylePrompt" placeholder="请输入AI提示词模板，用于指导AI生成对应风格的内容" required></textarea>
        </div>
        
        <div class="form-row">
          <label for="styleType">风格类型</label>
          <select id="styleType">
            <option value="custom">自定义</option>
            <option value="preset">预设</option>
          </select>
        </div>
        
        <div style="margin-top: 20px; display: flex; gap: 8px; justify-content: flex-end;">
          <button type="button" onclick="window.closeStyleModal()">取消</button>
          <button type="submit">保存</button>
        </div>
      </form>
    </div>
  </div>
  
  <script>
    const VERBOSE_LOG = false;

    const debugLog = (...args) => {
      if (VERBOSE_LOG) {
        console.log(...args);
      }
    };

    debugLog('WritingStylePanel script loaded');
    
    // 全局错误捕获
    window.onerror = function(message, source, lineno, colno, error) {
      console.error('Global error:', message, 'at', source, lineno, colno, error);
      try {
        const vscode = window.vscode || acquireVsCodeApi();
        vscode.postMessage({
          command: 'log',
          message: 'ERROR: ' + message + ' at ' + source + ':' + lineno
        });
      } catch (e) {
        console.error('Failed to log error to extension:', e);
      }
      return false;
    };
    
    // 初始化vscode对象
    let vscode;
    try {
      vscode = acquireVsCodeApi();
      window.vscode = vscode;
      debugLog('vscode API initialized');
    } catch (e) {
      console.error('Failed to initialize vscode API:', e);
      alert('初始化失败，请刷新页面');
    }
    
    let currentEditingStyle = null;
    let presetStyles = {};
    debugLog('Global variables initialized');
    
    function logToExtension(message, level = 'info') {
      const isError = level === 'error' || (typeof message === 'string' && message.toUpperCase().startsWith('ERROR'));
      if (!VERBOSE_LOG && !isError) {
        return;
      }

      if (isError) {
        console.error(message);
      } else {
        debugLog(message);
      }

      try {
        if (vscode) {
          vscode.postMessage({
            command: 'log',
            message: message
          });
        } else if (isError) {
          console.error('vscode API not available');
        }
      } catch (e) {
        console.error('Failed to log to extension:', e);
      }
    }
    
    // 显示状态消息
    function showStatus(message, type) {
      const status = document.getElementById('status');
      status.textContent = message;
      status.className = 'status show ' + type;
      setTimeout(() => {
        status.classList.remove('show');
      }, 3000);
    }
    
    // 加载写作风格列表
    function loadWritingStyles() {
      vscode.postMessage({ command: 'getWritingStyles' });
    }
    
    // 渲染写作风格列表
    function renderWritingStyles(styles) {
      try {
        logToExtension('renderWritingStyles called with styles: ' + JSON.stringify(styles));
        const container = document.getElementById('stylesList');
        
        if (!container) {
          console.error('stylesList container not found');
          return;
        }
        
        if (!styles || styles.length === 0) {
          container.innerHTML = '<div style="text-align: center; color: var(--vscode-descriptionForeground); padding: 40px;">暂无写作风格，请点击上方按钮创建</div>';
          return;
        }
        
        container.innerHTML = styles.map(style => {
          let defaultTag = '';
          if (style.isDefault) {
            defaultTag = '<span class="tag" style="background: var(--vscode-textLink-background); color: var(--vscode-textLink-foreground);">默认</span>';
          }
          
          return '<div class="style-item">' +
            '<div class="style-header">' +
              '<div class="style-title">' + (style.name || '未命名风格') + '</div>' +
              '<div class="style-actions">' +
                '<button onclick="window.editStyle(\'' + style.id + '\')">编辑</button>' +
                '<button onclick="window.deleteStyle(\'' + style.id + '\')">删除</button>' +
                '<button onclick="window.setDefaultStyle(\'' + style.id + '\')">设为默认</button>' +
              '</div>' +
            '</div>' +
            '<div class="style-meta">' +
              '<span class="tag">' + (style.type || 'custom') + '</span>' +
              defaultTag +
            '</div>' +
            '<div class="style-content">' + (style.writingRules ? style.writingRules.join('；') : (style.promptContent || style.prompt || '暂无提示词')) + '</div>' +
          '</div>';
        }).join('');
        
        logToExtension('renderWritingStyles completed successfully');
      } catch (error) {
        console.error('Error in renderWritingStyles:', error);
        logToExtension('ERROR in renderWritingStyles: ' + error.message);
      }
    }
    
    // 创建新风格
    window.createStyle = function() {
      logToExtension('createStyle function called');
      currentEditingStyle = null;
      document.getElementById('styleModalTitle').textContent = '创建写作风格';
      document.getElementById('styleForm').reset();
      document.getElementById('styleId').value = '';
      logToExtension('Calling openStyleModal');
      window.openStyleModal();
    };
    
    // 编辑风格
    window.editStyle = function(styleId) {
      window.openStyleModal();
    };
    
    // 删除风格
    window.deleteStyle = function(styleId) {
      if (confirm('确定要删除这个写作风格吗？')) {
        vscode.postMessage({ command: 'deleteStyle', styleId: styleId });
      }
    };
    
    // 设置默认风格
    window.setDefaultStyle = function(styleId) {
      vscode.postMessage({ command: 'setDefaultStyle', styleId: styleId });
    };
    
    // 打开风格模态框
    window.openStyleModal = function() {
      try {
        debugLog('openStyleModal function called');
        logToExtension('openStyleModal function called');
        const modal = document.getElementById('styleModal');
        debugLog('styleModal element:', modal);
        if (modal) {
          modal.classList.add('show');
          debugLog('Added show class to styleModal');
          logToExtension('styleModal opened successfully');
        } else {
          console.error('styleModal element not found!');
          logToExtension('ERROR: styleModal element not found!');
        }
      } catch (error) {
        console.error('Error in openStyleModal:', error);
        logToExtension('ERROR in openStyleModal: ' + error.message);
      }
    };
    
    // 关闭风格模态框
    window.closeStyleModal = function() {
      try {
        const modal = document.getElementById('styleModal');
        if (modal) {
          modal.classList.remove('show');
        }
        currentEditingStyle = null;
      } catch (error) {
        console.error('Error in closeStyleModal:', error);
        logToExtension('ERROR in closeStyleModal: ' + error.message);
      }
    };
    
    // 打开预设风格模态框
    window.openPresetsModal = function() {
      try {
        logToExtension('openPresetsModal function called');
        const modal = document.getElementById('presetsModal');
        logToExtension('presetsModal element: ' + modal);
        if (modal) {
          modal.classList.add('show');
          logToExtension('Added show class to presetsModal');
          logToExtension('Calling renderPresets');
          window.renderPresets();
        } else {
          logToExtension('ERROR: presetsModal element not found!');
        }
      } catch (error) {
        console.error('Error in openPresetsModal:', error);
        logToExtension('ERROR in openPresetsModal: ' + error.message);
      }
    };
    
    // 关闭预设风格模态框
    window.closePresetsModal = function() {
      try {
        const modal = document.getElementById('presetsModal');
        if (modal) {
          modal.classList.remove('show');
        }
      } catch (error) {
        console.error('Error in closePresetsModal:', error);
        logToExtension('ERROR in closePresetsModal: ' + error.message);
      }
    };
    
    // 渲染预设风格
    window.renderPresets = function() {
      try {
        logToExtension('renderPresets function called');
        logToExtension('presetStyles: ' + JSON.stringify(presetStyles));
        const container = document.getElementById('presetsList');
        logToExtension('presetsList element: ' + container);
        
        if (!container) {
          logToExtension('ERROR: presetsList container not found!');
          return;
        }
        
        if (!presetStyles || Object.keys(presetStyles).length === 0) {
          logToExtension('No preset styles available');
          container.innerHTML = '<div style="text-align: center; color: var(--vscode-descriptionForeground); padding: 20px;">暂无预设风格</div>';
          return;
        }
        
        logToExtension('Rendering preset styles: ' + JSON.stringify(Object.keys(presetStyles)));
        container.innerHTML = Object.entries(presetStyles).map(([key, preset]) => {
          return '<div class="preset-item" onclick="logToExtension(\'Adding preset: ' + key + '\'); window.addPresetStyle(\'' + key + '\')">' +
            '<div class="preset-info">' +
              '<div style="font-weight: 600;">' + preset.name + '</div>' +
              '<div style="font-size: 11px; color: var(--vscode-descriptionForeground);">' + preset.description + '</div>' +
            '</div>' +
            '<button style="padding: 4px 8px;">添加</button>' +
          '</div>';
        }).join('');
        logToExtension('Presets rendered successfully');
      } catch (error) {
        console.error('Error in renderPresets:', error);
        logToExtension('ERROR in renderPresets: ' + error.message);
      }
    };
    
    // 添加预设风格
    window.addPresetStyle = function(presetKey) {
      vscode.postMessage({ command: 'addPresetStyle', presetKey: presetKey });
      window.closePresetsModal();
    };
    
    // 表单提交处理
    document.getElementById('styleForm').addEventListener('submit', (e) => {
      e.preventDefault();
      
      const style = {
        id: document.getElementById('styleId').value || 'style-' + Date.now(),
        name: document.getElementById('styleName').value,
        description: document.getElementById('styleDescription').value,
        promptContent: document.getElementById('stylePrompt').value,
        type: document.getElementById('styleType').value,
        isDefault: false
      };
      
      vscode.postMessage({ command: 'saveStyle', style: style });
      window.closeStyleModal();
    });
    
    // 移除重复的事件监听器，避免冲突
    
    // 点击模态框外部关闭
    window.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
      }
    });
    
    // 监听来自扩展的消息
    window.addEventListener('message', (event) => {
      const message = event.data;
      debugLog('Received message:', message.command);
      switch (message.command) {
        case 'updateWritingStyles':
          debugLog('updateWritingStyles - styles:', message.styles);
          debugLog('updateWritingStyles - presets:', message.presets);
          renderWritingStyles(message.styles);
          if (message.presets) {
            presetStyles = {};
            message.presets.forEach(preset => {
              presetStyles[preset.id] = {
                name: preset.name,
                description: preset.description,
                prompt: preset.styleContent
              };
            });
            debugLog('presetStyles updated:', Object.keys(presetStyles));
          }
          break;
        case 'saveSuccess':
        case 'deleteSuccess':
        case 'setDefaultSuccess':
        case 'addPresetSuccess':
          showStatus(message.message, 'success');
          loadWritingStyles();
          break;
        case 'saveError':
        case 'deleteError':
        case 'setDefaultError':
        case 'addPresetError':
          showStatus(message.message, 'error');
          break;
      }
    });
    
    // 初始化加载
    loadWritingStyles();
    
    debugLog('WritingStylePanel initialization complete');
    debugLog('window.createStyle:', typeof window.createStyle);
    debugLog('window.openPresetsModal:', typeof window.openPresetsModal);
  </script>
</body>
</html>`;
  }
}