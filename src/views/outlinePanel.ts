import * as vscode from 'vscode';
import { outlineRepository } from '../repositories';
import { logger } from '../utils/logger';

export class OutlinePanel {
  public static readonly viewType = 'novelAssistant.outline';
  
  private _view?: vscode.WebviewView;
  private _panel?: vscode.WebviewPanel;
  private static _instance: OutlinePanel | undefined;

  private constructor(private readonly _extensionUri: vscode.Uri) {}

  /**
   * 获取或创建实例
   */
  public static getInstance(extensionUri: vscode.Uri): OutlinePanel {
    if (!OutlinePanel._instance) {
      OutlinePanel._instance = new OutlinePanel(extensionUri);
    }
    return OutlinePanel._instance;
  }

  public show() {
    if (this._panel) {
      this._panel.reveal(vscode.ViewColumn.Active);
      return;
    }

    this._panel = vscode.window.createWebviewPanel(
      OutlinePanel.viewType,
      '📋 大纲管理',
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
          this._sendOutlines(this._panel!.webview);
          break;
        case 'editOutline':
          logger.log(`▶ 编辑大纲 - ${data.outlineId}`);
          vscode.commands.executeCommand('novelAssistant.editOutline', data.outlineId);
          break;
      }
    });

    this._panel.onDidDispose(() => {
      this._panel = undefined;
    });
  }

  /**
   * 在编辑器区域创建或显示面板 (Deprecated: use show() instead)
   */
  public static createOrShow(extensionUri: vscode.Uri): vscode.WebviewPanel {
    const instance = OutlinePanel.getInstance(extensionUri);
    instance.show();
    return instance._panel!;
  }

  /**
   * 初始化WebviewPanel (Deprecated: logic moved to show())
   */
  private _initializeWebviewPanel(panel: vscode.WebviewPanel): void {
    // Logic moved to show()
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
          this._sendOutlines(webviewView.webview);
          break;
        case 'editOutline':
          logger.log(`▶ 编辑大纲 - ${data.outlineId}`);
          vscode.commands.executeCommand('novelAssistant.editOutline', data.outlineId);
          break;
      }
    });
  }

  public refresh() {
    const outlines = outlineRepository.loadAll();
    const message = {
      command: 'update',
      data: outlines
    };
    
    if (this._view) {
      this._view.webview.postMessage(message);
    }
    if (this._panel) {
      this._panel.webview.postMessage(message);
    }
  }

  private _sendOutlines(webview: vscode.Webview) {
    const outlines = outlineRepository.loadAll();
    const message = {
      command: 'update',
      data: outlines
    };
    
    // 发送给特定的webview（可能是view或panel）
    webview.postMessage(message);
    
    // 同时确保另一个也更新（如果存在）
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
  <title>大纲</title>
  <style>
    body {
      padding: 10px;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
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
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    .outline-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .outline-item {
      padding: 10px;
      background: var(--vscode-editor-background);
      border-radius: 4px;
    }
    .outline-item.volume {
      border-left: 4px solid var(--vscode-terminal-ansiYellow);
      font-weight: bold;
    }
    .outline-item.chapter {
      border-left: 4px solid var(--vscode-textLink-foreground);
      margin-left: 12px;
    }
    .outline-item.scene {
      border-left: 4px solid var(--vscode-descriptionForeground);
      margin-left: 24px;
      font-size: 12px;
    }
    .outline-title {
      font-weight: bold;
      margin-bottom: 6px;
    }
    .outline-content {
      font-size: 12px;
      line-height: 1.5;
      opacity: 0.9;
    }
    .outline-status {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      margin-left: 8px;
    }
    .status-draft {
      background: var(--vscode-terminal-ansiYellow);
      color: black;
    }
    .status-finalized {
      background: var(--vscode-terminal-ansiGreen);
      color: white;
    }
    .outline-actions {
      margin-top: 8px;
      display: flex;
      gap: 8px;
    }
    .outline-btn {
      padding: 4px 8px;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
      transition: all 0.2s;
    }
    .outline-btn-edit {
      background: var(--vscode-textLink-foreground);
      color: white;
    }
    .outline-btn-edit:hover {
      opacity: 0.9;
    }
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      opacity: 0.6;
    }
  </style>
</head>
<body>
  <div class="header">
    <h3>📋 大纲</h3>
    <div style="display: flex; align-items: center;">
      <button class="refresh-button" id="refreshBtn">
        <span id="refreshText">刷新</span>
        <div class="refresh-spinner" id="refreshSpinner" style="display: none;"></div>
      </button>
      <span class="refresh-status" id="refreshStatus"></span>
    </div>
  </div>
  <div class="outline-list" id="list"></div>

  <script>
    const vscode = acquireVsCodeApi();
    
    // 刷新按钮逻辑
    const refreshBtn = document.getElementById('refreshBtn');
    const refreshText = document.getElementById('refreshText');
    const refreshSpinner = document.getElementById('refreshSpinner');
    const refreshStatus = document.getElementById('refreshStatus');
    
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        // 显示加载状态
        refreshBtn.disabled = true;
        refreshText.textContent = '刷新中';
        refreshSpinner.style.display = 'block';
        refreshStatus.textContent = '';
        
        try {
          // 发送刷新请求
          vscode.postMessage({ command: 'refreshPanel' });
          
          // 模拟刷新过程
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
          console.error('刷新失败:', error);
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
    }
    
    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.command === 'update') {
        renderOutlines(message.data);
      }
    });

    function renderOutlines(outlines) {
      const listEl = document.getElementById('list');
      
      if (outlines.length === 0) {
        listEl.innerHTML = '<div class="empty-state">暂无大纲<br>执行"导入文档"可导入大纲</div>';
        return;
      }

      // 按orderIndex排序
      const sorted = [...outlines].sort((a, b) => a.orderIndex - b.orderIndex);

      listEl.innerHTML = sorted.map(outline => {
        const prefix = outline.type === 'volume' 
          ? \`卷\${outline.volumeNumber}\`
          : outline.type === 'chapter'
          ? \`第\${outline.chapterNumber}章\`
          : '场景';
        
        return \`
          <div class="outline-item \${outline.type}">
            <div class="outline-title">
              \${prefix}: \${outline.title}
              <span class="outline-status status-\${outline.status}">\${getStatusLabel(outline.status)}</span>
            </div>
            <div class="outline-content">\${truncate(outline.content, 100)}</div>
            <div class="outline-actions">
              <button class="outline-btn outline-btn-edit" data-id="\${outline.id}">✏️ 编辑</button>
            </div>
          </div>
        \`;
      }).join('');

      // 绑定编辑按钮事件
      document.querySelectorAll('.outline-btn-edit').forEach(btn => {
        btn.addEventListener('click', () => {
          const outlineId = btn.getAttribute('data-id');
          vscode.postMessage({ command: 'editOutline', outlineId });
        });
      });
    }

    function getStatusLabel(status) {
      return status === 'draft' ? '草稿' : '已定稿';
    }

    function truncate(text, maxLen) {
      if (!text || text.length <= maxLen) return text || '';
      return text.slice(0, maxLen) + '...';
    }

    // 初始加载
    vscode.postMessage({ command: 'load' });
  </script>
</body>
</html>`;
  }
}
