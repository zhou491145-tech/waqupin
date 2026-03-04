import * as vscode from 'vscode';
import { aiService } from '../services/aiService';
import { logger } from '../utils/logger';

export class ToolbarPanel {
  public static readonly viewType = 'novelAssistant.toolbar';

  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

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

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.command) {
        case 'testApi':
          await this._handleTestApi();
          break;
        case 'importDocument':
          await vscode.commands.executeCommand('novelAssistant.importDocumentFromPanel');
          break;
        case 'importFolder':
          await vscode.commands.executeCommand('novelAssistant.importFolderFromPanel');
          break;
        case 'openSettings':
          await vscode.commands.executeCommand('workbench.action.openSettings', 'novelAssistant');
          break;
        case 'openHelp':
          await vscode.commands.executeCommand('novelAssistant.showHelp');
          break;
        case 'checkApiStatus':
          this._sendApiStatus();
          break;
      }
    });

    this._sendApiStatus();
  }

  private async _handleTestApi() {
    logger.log('▶ 执行命令：测试 API 连接（工具栏）');
    
    this._view?.webview.postMessage({ command: 'testStarted' });

    const ok = aiService.loadConfig();
    if (!ok) {
      this._view?.webview.postMessage({ 
        command: 'testFailed', 
        error: '请先配置 API Key 和 Base URL' 
      });
      return;
    }

    const startTime = Date.now();
    
    try {
      const result = await aiService.testConnection();
      const responseTime = Date.now() - startTime;

      if (result) {
        this._view?.webview.postMessage({ 
          command: 'testSuccess', 
          responseTime,
          apiVersion: 'v1.0.0',
          message: 'API 连接成功'
        });
        logger.log(`✅ API 测试成功，响应时间: ${responseTime}ms`);
      } else {
        this._view?.webview.postMessage({ 
          command: 'testFailed', 
          error: 'API 连接失败，请检查配置' 
        });
        logger.log('❌ API 测试失败');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      this._view?.webview.postMessage({ 
        command: 'testFailed', 
        error: errorMessage 
      });
      logger.log(`❌ API 测试异常: ${errorMessage}`);
    }
  }

  private _sendApiStatus() {
    const ok = aiService.loadConfig();
    this._view?.webview.postMessage({
      command: 'updateApiStatus',
      configured: ok
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>小说助手工具栏</title>
  <style>
    body {
      padding: 12px;
      color: var(--vscode-foreground);
      font-size: 13px;
      line-height: 1.6;
    }
    .header {
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--vscode-panel-border);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .status-bar {
      padding: 8px 12px;
      margin-bottom: 16px;
      background: var(--vscode-editor-background);
      border-radius: 4px;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--vscode-descriptionForeground);
    }
    .status-indicator.connected {
      background: var(--vscode-testing-iconPassed);
      box-shadow: 0 0 4px var(--vscode-testing-iconPassed);
    }
    .status-indicator.disconnected {
      background: var(--vscode-errorForeground);
    }
    .status-indicator.testing {
      background: var(--vscode-textLink-foreground);
      animation: pulse 1s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .section {
      margin-bottom: 16px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 600;
      color: var(--vscode-descriptionForeground);
      text-transform: uppercase;
      margin-bottom: 8px;
      letter-spacing: 0.5px;
    }
    .button-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .button {
      padding: 10px 12px;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: 1px solid var(--vscode-button-border);
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      text-align: left;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .button:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    .button:active {
      transform: translateY(1px);
    }
    .button.primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-color: var(--vscode-button-background);
    }
    .button.primary:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .button-icon {
      font-size: 14px;
    }
    .button-text {
      flex: 1;
    }
    .test-result {
      padding: 12px;
      margin-top: 12px;
      background: var(--vscode-editor-background);
      border-radius: 4px;
      font-size: 12px;
      display: none;
    }
    .test-result.show {
      display: block;
    }
    .test-result.success {
      border-left: 3px solid var(--vscode-testing-iconPassed);
    }
    .test-result.error {
      border-left: 3px solid var(--vscode-errorForeground);
    }
    .test-result-title {
      font-weight: 600;
      margin-bottom: 8px;
    }
    .test-result-item {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    .test-result-item:last-child {
      border-bottom: none;
    }
    .test-result-label {
      color: var(--vscode-descriptionForeground);
    }
    .test-result-value {
      font-weight: 600;
    }
    .last-update {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      text-align: center;
      margin-top: 16px;
      padding-top: 8px;
      border-top: 1px solid var(--vscode-panel-border);
    }
  </style>
</head>
<body>
  <div class="header">
    <span>🛠️</span>
    <span>小说助手工具栏</span>
  </div>

  <div class="status-bar">
    <div class="status-indicator" id="statusIndicator"></div>
    <span id="statusText">检查中...</span>
  </div>

  <div class="section">
    <div class="section-title">API 连接</div>
    <div class="button-grid">
      <button class="button primary" id="testApiBtn">
        <span class="button-icon">🔌</span>
        <span class="button-text">测试连接</span>
      </button>
      <button class="button" id="settingsBtn">
        <span class="button-icon">⚙️</span>
        <span class="button-text">API 设置</span>
      </button>
    </div>
    <div class="test-result" id="testResult"></div>
  </div>

  <div class="section">
    <div class="section-title">文档导入</div>
    <div class="button-grid">
      <button class="button" id="importDocBtn">
        <span class="button-icon">📄</span>
        <span class="button-text">导入文档</span>
      </button>
      <button class="button" id="importFolderBtn">
        <span class="button-icon">📁</span>
        <span class="button-text">导入文件夹</span>
      </button>
    </div>
  </div>

  <div class="section">
    <div class="section-title">其他</div>
    <div class="button-grid">
      <button class="button" id="helpBtn">
        <span class="button-icon">❓</span>
        <span class="button-text">帮助文档</span>
      </button>
    </div>
  </div>

  <div class="last-update" id="lastUpdate">最后更新: --</div>

  <script>
    const vscode = acquireVsCodeApi();
    let lastUpdateTime = new Date();

    document.getElementById('testApiBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'testApi' });
    });

    document.getElementById('importDocBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'importDocument' });
    });

    document.getElementById('importFolderBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'importFolder' });
    });

    document.getElementById('settingsBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'openSettings' });
    });

    document.getElementById('helpBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'openHelp' });
    });

    window.addEventListener('message', event => {
      const message = event.data;
      switch (message.command) {
        case 'updateApiStatus':
          updateApiStatus(message.configured);
          break;
        case 'testStarted':
          updateStatus('testing');
          break;
        case 'testSuccess':
          updateStatus('connected');
          showTestResult(true, message);
          break;
        case 'testFailed':
          updateStatus('disconnected');
          showTestResult(false, message);
          break;
      }
    });

    function updateApiStatus(configured) {
      if (configured) {
        updateStatus('connected');
      } else {
        updateStatus('disconnected');
      }
    }

    function updateStatus(status) {
      const indicator = document.getElementById('statusIndicator');
      const text = document.getElementById('statusText');
      
      indicator.className = 'status-indicator ' + status;
      
      switch (status) {
        case 'connected':
          text.textContent = 'API 已连接';
          break;
        case 'disconnected':
          text.textContent = 'API 未配置';
          break;
        case 'testing':
          text.textContent = '测试中...';
          break;
        default:
          text.textContent = '未知状态';
      }
      
      lastUpdateTime = new Date();
      updateLastUpdate();
    }

    function showTestResult(success, data) {
      const result = document.getElementById('testResult');
      result.className = 'test-result show ' + (success ? 'success' : 'error');
      
      if (success) {
        result.innerHTML = \`
          <div class="test-result-title">✅ \${data.message}</div>
          <div class="test-result-item">
            <span class="test-result-label">响应时间</span>
            <span class="test-result-value">\${data.responseTime}ms</span>
          </div>
          <div class="test-result-item">
            <span class="test-result-label">API 版本</span>
            <span class="test-result-value">\${data.apiVersion}</span>
          </div>
        \`;
      } else {
        result.innerHTML = \`
          <div class="test-result-title">❌ 测试失败</div>
          <div class="test-result-item">
            <span class="test-result-label">错误信息</span>
            <span class="test-result-value">\${data.error}</span>
          </div>
        \`;
      }
      
      lastUpdateTime = new Date();
      updateLastUpdate();
    }

    function updateLastUpdate() {
      const time = lastUpdateTime.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });
      document.getElementById('lastUpdate').textContent = '最后更新: ' + time;
    }

    vscode.postMessage({ command: 'checkApiStatus' });
  </script>
</body>
</html>`;
  }
}
