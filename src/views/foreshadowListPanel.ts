import * as vscode from 'vscode';
import { foreshadowRepository } from '../repositories';
import { logger } from '../utils/logger';

const STATUS_LABELS: { [key: string]: string } = {
  'pending': '⏳ 待回收',
  'resolved': '✅ 已回收',
  'abandoned': '❌ 已废弃'
};

const STATUS_COLORS: { [key: string]: string } = {
  'pending': '#f39c12',
  'resolved': '#27ae60',
  'abandoned': '#e74c3c'
};

const IMPORTANCE_LABELS: { [key: string]: string } = {
  'high': '🔴 高',
  'medium': '🟡 中',
  'low': '🟢 低'
};

const IMPORTANCE_COLORS: { [key: string]: string } = {
  'high': '#e74c3c',
  'medium': '#f39c12',
  'low': '#27ae60'
};

export class ForeshadowListPanel {
  public static readonly viewType = 'novelAssistant.foreshadowList';

  private _panel?: vscode.WebviewPanel;
  private static _instance: ForeshadowListPanel | undefined;

  private constructor(private readonly _extensionUri: vscode.Uri) {}

  public static getInstance(extensionUri: vscode.Uri): ForeshadowListPanel {
    if (!ForeshadowListPanel._instance) {
      ForeshadowListPanel._instance = new ForeshadowListPanel(extensionUri);
    }
    return ForeshadowListPanel._instance;
  }

  public show() {
    if (this._panel) {
      this._panel.reveal(vscode.ViewColumn.Active);
      return;
    }

    this._panel = vscode.window.createWebviewPanel(
      ForeshadowListPanel.viewType,
      '🎭 伏笔看板',
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
          this._sendForeshadows(this._panel!.webview);
          break;
        case 'viewForeshadow':
          logger.log(`▶ 查看伏笔详情 - ${data.foreshadowId}`);
          vscode.commands.executeCommand('novelAssistant.showForeshadowDetail', data.foreshadowId);
          break;
        case 'addForeshadow':
          logger.log('▶ 添加新伏笔');
          vscode.commands.executeCommand('novelAssistant.editForeshadow', '');
          break;
        case 'editForeshadow':
          logger.log(`▶ 编辑伏笔 - ${data.foreshadowId}`);
          vscode.commands.executeCommand('novelAssistant.editForeshadow', data.foreshadowId);
          break;
      }
    });

    this._panel.onDidDispose(() => {
      this._panel = undefined;
    });
  }

  private _sendForeshadows(webview: vscode.Webview) {
    const foreshadows = foreshadowRepository.loadAll();
    logger.log(`📖 读取伏笔数据成功，共 ${foreshadows.length} 个伏笔`);

    webview.postMessage({
      command: 'foreshadows',
      foreshadows: foreshadows
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'webview-styles', 'globals.css'));

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>伏笔看板</title>
  <link rel="stylesheet" href="${styleUri}">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: var(--font-family-sans);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 24px;
    }

    .page-enter {
      animation: fadeInUp 0.4s var(--ease-out);
    }

    .header {
      margin-bottom: 32px;
      padding-bottom: 20px;
      border-bottom: 2px solid var(--vscode-panel-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-content h1 {
      font-size: var(--font-size-2xl);
      font-weight: var(--font-weight-bold);
      margin-bottom: 8px;
      background: var(--gradient-core);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .header-content p {
      color: var(--vscode-descriptionForeground);
      font-size: var(--font-size-base);
    }

    .add-button {
      background: var(--gradient-primary);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-medium);
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all var(--duration-fast) var(--ease-out);
      box-shadow: var(--shadow-md);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .refresh-button {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: none;
      padding: 12px 16px;
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-medium);
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all var(--duration-fast) var(--ease-out);
    }

    .refresh-button:hover {
      background: var(--vscode-button-secondaryHoverBackground);
      transform: translateY(-1px);
    }

    .refresh-button:active {
      transform: translateY(0);
    }

    .add-button:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
      filter: brightness(1.1);
    }

    .add-button:active {
      transform: translateY(0);
    }

    .foreshadow-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 20px;
    }

    .foreshadow-card {
      background: var(--vscode-editor-inactiveSelectionBackground);
      border: 1px solid var(--vscode-panel-border);
      border-radius: var(--radius-lg);
      padding: 20px;
      cursor: pointer;
      transition: all var(--duration-normal) var(--ease-out);
      position: relative;
      overflow: hidden;
      animation: scaleIn 0.3s var(--ease-out) both;
    }

    .foreshadow-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: var(--card-status-color, var(--color-primary));
      transform: scaleX(0);
      transition: transform var(--duration-fast) var(--ease-out);
    }

    .foreshadow-card:hover {
      background: var(--vscode-editor-selectionBackground);
      transform: translateY(-4px);
      box-shadow: var(--shadow-xl);
      border-color: var(--color-primary-300);
    }

    .foreshadow-card:hover::before {
      transform: scaleX(1);
    }

    .foreshadow-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .foreshadow-keyword {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-semibold);
      margin-bottom: 4px;
      color: var(--vscode-foreground);
    }

    .card-actions {
      display: flex;
      gap: 8px;
    }

    .card-action-btn {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: none;
      padding: 8px 16px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      transition: all var(--duration-fast) var(--ease-out);
    }

    .card-action-btn:hover {
      background: var(--vscode-button-secondaryHoverBackground);
      transform: translateY(-1px);
    }

    .card-action-btn.edit {
      background: var(--color-info);
      color: white;
    }

    .card-action-btn.edit:hover {
      background: var(--color-info-dark);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }

    .foreshadow-badges {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .badge {
      font-size: var(--font-size-xs);
      padding: 4px 12px;
      border-radius: var(--radius-full);
      display: inline-block;
      font-weight: var(--font-weight-medium);
    }

    .foreshadow-info {
      margin-top: 16px;
      font-size: var(--font-size-sm);
      color: var(--vscode-descriptionForeground);
      line-height: var(--line-height-normal);
    }

    .foreshadow-info p {
      margin-bottom: 8px;
      display: flex;
      align-items: flex-start;
    }

    .foreshadow-info strong {
      color: var(--vscode-foreground);
      min-width: 50px;
      font-weight: var(--font-weight-medium);
    }

    .empty-state {
      text-align: center;
      padding: 80px 20px;
      color: var(--vscode-descriptionForeground);
      animation: fadeIn 0.5s var(--ease-out);
    }

    .empty-state .icon {
      font-size: 64px;
      margin-bottom: 20px;
      animation: bounce 2s infinite;
    }

    .empty-state p {
      font-size: var(--font-size-lg);
      margin-bottom: 8px;
    }

    .loading {
      text-align: center;
      padding: 60px;
      color: var(--vscode-descriptionForeground);
    }

    .spinner-container {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--border-default);
      border-top-color: var(--color-primary);
      border-radius: var(--radius-full);
      animation: spin 1s linear infinite;
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes scaleIn {
      from {
        opacity: 0;
        transform: scale(0.9);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    @keyframes bounce {
      0%, 20%, 50%, 80%, 100% {
        transform: translateY(0);
      }
      40% {
        transform: translateY(-20px);
      }
      60% {
        transform: translateY(-10px);
      }
    }
  </style>
</head>
<body>
  <div class="page-enter">
    <div class="header">
      <div class="header-content">
        <h1>🎭 伏笔看板</h1>
        <p>点击伏笔卡片查看详情</p>
      </div>
      <div class="header-actions">
        <button class="refresh-button" onclick="refreshForeshadows()">
          <span>🔄</span>
          <span>刷新</span>
        </button>
        <button class="add-button" onclick="addForeshadow()">
          <span>➕</span>
          <span>添加伏笔</span>
        </button>
      </div>
    </div>

    <div id="foreshadowList" class="foreshadow-grid">
      <div class="loading">
        <div class="spinner-container">
          <div class="spinner"></div>
          <span>加载中...</span>
        </div>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    window.addEventListener('load', () => {
      vscode.postMessage({ command: 'load' });
    });

    window.addEventListener('message', event => {
      const message = event.data;

      switch (message.command) {
        case 'foreshadows':
          renderForeshadows(message.foreshadows);
          break;
      }
    });

    function renderForeshadows(foreshadows) {
      const container = document.getElementById('foreshadowList');

      if (!foreshadows || foreshadows.length === 0) {
        container.innerHTML = \`
          <div class="empty-state">
            <div class="icon">🎭</div>
            <p>暂无伏笔数据</p>
            <p style="font-size: var(--font-size-base); opacity: 0.7;">请先创建伏笔</p>
          </div>
        \`;
        return;
      }

      container.innerHTML = foreshadows.map((f, index) => {
        const statusLabel = STATUS_LABELS[f.status] || f.status;
        const statusColor = STATUS_COLORS[f.status] || '#95a5a6';
        const importanceLabel = IMPORTANCE_LABELS[f.importance] || f.importance;
        const importanceColor = IMPORTANCE_COLORS[f.importance] || '#95a5a6';

        return \`
          <div class="foreshadow-card" style="--card-status-color: \${statusColor}; animation-delay: \${index * 50}ms" onclick="viewForeshadow('\${f.id}')">
            <div class="foreshadow-header">
              <div class="foreshadow-keyword">\${f.keyword}</div>
              <div class="card-actions">
                <button class="card-action-btn edit" onclick="event.stopPropagation(); editForeshadow('\${f.id}')">
                  ✏️ 编辑
                </button>
              </div>
            </div>
            <div class="foreshadow-badges">
              <span class="badge" style="background: \${statusColor}20; color: \${statusColor}">
                \${statusLabel}
              </span>
              <span class="badge" style="background: \${importanceColor}20; color: \${importanceColor}">
                \${importanceLabel}
              </span>
            </div>
            <div class="foreshadow-info">
              <p><strong>章节:</strong> 第\${f.plantedChapter}章</p>
              <p><strong>描述:</strong> \${f.description.substring(0, 80)}\${f.description.length > 80 ? '...' : ''}</p>
              \${f.resolution ? \`<p><strong>回收:</strong> \${f.resolution.substring(0, 60)}\${f.resolution.length > 60 ? '...' : ''}</p>\` : ''}
            </div>
          </div>
        \`;
      }).join('');
    }

    function viewForeshadow(foreshadowId) {
      vscode.postMessage({
        command: 'viewForeshadow',
        foreshadowId: foreshadowId
      });
    }

    function refreshForeshadows() {
      vscode.postMessage({ command: 'load' });
    }

    function addForeshadow() {
      vscode.postMessage({
        command: 'addForeshadow'
      });
    }

    function editForeshadow(foreshadowId) {
      vscode.postMessage({
        command: 'editForeshadow',
        foreshadowId: foreshadowId
      });
    }

    const STATUS_LABELS = {
      'pending': '⏳ 待回收',
      'resolved': '✅ 已回收',
      'abandoned': '❌ 已废弃'
    };

    const STATUS_COLORS = {
      'pending': '#f39c12',
      'resolved': '#27ae60',
      'abandoned': '#e74c3c'
    };

    const IMPORTANCE_LABELS = {
      'high': '🔴 高',
      'medium': '🟡 中',
      'low': '🟢 低'
    };

    const IMPORTANCE_COLORS = {
      'high': '#e74c3c',
      'medium': '#f39c12',
      'low': '#27ae60'
    };
  </script>
</body>
</html>`;
  }
}
