import * as vscode from 'vscode';
import { worldSettingRepository } from '../repositories';
import { logger } from '../utils/logger';

export class WorldSettingPanel {
  public static readonly viewType = 'novelAssistant.worldSetting';
  
  private _view?: vscode.WebviewView;
  private _panel?: vscode.WebviewPanel;
  private static _instance: WorldSettingPanel | undefined;

  private constructor(private readonly _extensionUri: vscode.Uri) {}

  public static getInstance(extensionUri: vscode.Uri): WorldSettingPanel {
    if (!WorldSettingPanel._instance) {
      WorldSettingPanel._instance = new WorldSettingPanel(extensionUri);
    }
    return WorldSettingPanel._instance;
  }

  public show() {
    if (this._panel) {
      this._panel.reveal(vscode.ViewColumn.Active);
      return;
    }

    this._panel = vscode.window.createWebviewPanel(
      WorldSettingPanel.viewType,
      '🌍 世界观设定',
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        localResourceRoots: [this._extensionUri],
        retainContextWhenHidden: true
      }
    );

    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);

    this._panel.webview.onDidReceiveMessage(async (data) => {
      switch (data.command) {
        case 'load':
        case 'refreshPanel':
          this._sendWorldSetting(this._panel!.webview);
          break;
        case 'editWorldSetting':
          logger.log(`▶ 编辑世界观设定`);
          vscode.commands.executeCommand('novelAssistant.editWorldSetting');
          break;
      }
    });

    this._panel.onDidDispose(() => {
      this._panel = undefined;
    });
  }

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
        case 'load':
        case 'refreshPanel':
          this._sendWorldSetting(webviewView.webview);
          break;
        case 'editWorldSetting':
          logger.log(`▶ 编辑世界观设定`);
          vscode.commands.executeCommand('novelAssistant.editWorldSetting');
          break;
      }
    });
  }

  public refresh() {
    if (this._view) {
      this._sendWorldSetting(this._view.webview);
    }
    if (this._panel) {
      this._sendWorldSetting(this._panel.webview);
    }
  }

  private _sendWorldSetting(webview: vscode.Webview) {
    const worldSetting = worldSettingRepository.load();
    const message = {
      command: 'update',
      data: worldSetting
    };

    webview.postMessage(message);

    if (webview === this._view?.webview && this._panel) {
      this._panel.webview.postMessage(message);
    } else if (webview === this._panel?.webview && this._view) {
      this._view.webview.postMessage(message);
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>世界观设定</title>
  <style>
    body {
      padding: 10px;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
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
    .setting-content {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .setting-item {
      padding: 12px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      border-left: 4px solid var(--vscode-textLink-foreground);
    }
    .setting-label {
      font-weight: bold;
      font-size: 13px;
      margin-bottom: 8px;
      color: var(--vscode-textLink-foreground);
    }
    .setting-value {
      line-height: 1.6;
      font-size: 13px;
      white-space: pre-wrap;
      opacity: 0.9;
    }
    .rules-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .rules-list li {
      padding: 4px 0;
      padding-left: 20px;
      position: relative;
      font-size: 13px;
    }
    .rules-list li:before {
      content: "•";
      position: absolute;
      left: 0;
      color: var(--vscode-textLink-foreground);
      font-weight: bold;
    }
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      opacity: 0.6;
      font-style: italic;
    }
    .edit-btn {
      padding: 4px 12px;
      background: var(--vscode-textLink-foreground);
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
    }
    .edit-btn:hover {
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="header">
    <h3>🌍 世界观设定</h3>
    <div style="display: flex; align-items: center; gap: 10px;">
      <button class="edit-btn" id="editBtn">✏️ 编辑</button>
      <button class="refresh-button" id="refreshBtn">
        <span id="refreshText">刷新</span>
        <div class="refresh-spinner" id="refreshSpinner" style="display: none;"></div>
      </button>
      <span class="refresh-status" id="refreshStatus"></span>
    </div>
  </div>
  <div class="setting-content" id="content"></div>

  <script>
    const vscode = acquireVsCodeApi();
    
    const refreshBtn = document.getElementById('refreshBtn');
    const refreshText = document.getElementById('refreshText');
    const refreshSpinner = document.getElementById('refreshSpinner');
    const refreshStatus = document.getElementById('refreshStatus');
    const editBtn = document.getElementById('editBtn');
    
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        refreshBtn.disabled = true;
        refreshText.textContent = '刷新中';
        refreshSpinner.style.display = 'block';
        refreshStatus.textContent = '';
        
        try {
          vscode.postMessage({ command: 'refreshPanel' });
          await new Promise(resolve => setTimeout(resolve, 500));
          
          refreshText.textContent = '刷新';
          refreshSpinner.style.display = 'none';
          refreshStatus.textContent = '刷新成功';
          refreshStatus.className = 'refresh-status success';
          refreshBtn.disabled = false;
          
          setTimeout(() => {
            refreshStatus.textContent = '';
          }, 3000);
        } catch (error) {
          console.error('刷新失败:', error);
          refreshText.textContent = '刷新';
          refreshSpinner.style.display = 'none';
          refreshStatus.textContent = '刷新失败';
          refreshStatus.className = 'refresh-status error';
          refreshBtn.disabled = false;
          
          setTimeout(() => {
            refreshStatus.textContent = '';
          }, 3000);
        }
      });
    }
    
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        vscode.postMessage({ command: 'editWorldSetting' });
      });
    }
    
    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.command === 'update') {
        renderWorldSetting(message.data);
      }
    });

    function renderWorldSetting(setting) {
      const contentEl = document.getElementById('content');
      
      if (!setting) {
        contentEl.innerHTML = '<div class="empty-state">暂无世界观设定<br>点击右上角"编辑"按钮开始创建</div>';
        return;
      }

      let html = '';
      
      if (setting.title) {
        html += '<div class="setting-item"><div class="setting-label">标题</div><div class="setting-value">' + escapeHtml(setting.title) + '</div></div>';
      }
      
      if (setting.timePeriod) {
        html += '<div class="setting-item"><div class="setting-label">时代背景</div><div class="setting-value">' + escapeHtml(setting.timePeriod) + '</div></div>';
      }
      
      if (setting.location) {
        html += '<div class="setting-item"><div class="setting-label">地点设定</div><div class="setting-value">' + escapeHtml(setting.location) + '</div></div>';
      }
      
      if (setting.atmosphere) {
        html += '<div class="setting-item"><div class="setting-label">氛围基调</div><div class="setting-value">' + escapeHtml(setting.atmosphere) + '</div></div>';
      }
      
      if (setting.rules && setting.rules.length > 0) {
        html += '<div class="setting-item"><div class="setting-label">世界规则</div><ul class="rules-list">';
        setting.rules.forEach(rule => {
          html += '<li>' + escapeHtml(rule) + '</li>';
        });
        html += '</ul></div>';
      }
      
      if (setting.additionalInfo) {
        html += '<div class="setting-item"><div class="setting-label">补充信息</div><div class="setting-value">' + escapeHtml(setting.additionalInfo) + '</div></div>';
      }
      
      if (html === '') {
        html = '<div class="empty-state">暂无世界观设定<br>点击右上角"编辑"按钮开始创建</div>';
      }
      
      contentEl.innerHTML = html;
    }

    function escapeHtml(text) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    vscode.postMessage({ command: 'load' });
  </script>
</body>
</html>`;
  }
}
