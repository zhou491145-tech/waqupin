import * as vscode from 'vscode';
import { summaryRepository } from '../repositories';
import { logger } from '../utils/logger';

export class SummaryPanel {
  public static readonly viewType = 'novelAssistant.summary';
  
  private _view?: vscode.WebviewView;
  private _panel?: vscode.WebviewPanel;
  private static _instance: SummaryPanel | undefined;

  private constructor(private readonly _extensionUri: vscode.Uri) {}

  /**
   * 获取或创建实例
   */
  public static getInstance(extensionUri: vscode.Uri): SummaryPanel {
    if (!SummaryPanel._instance) {
      SummaryPanel._instance = new SummaryPanel(extensionUri);
    }
    return SummaryPanel._instance;
  }

  public show() {
    if (this._panel) {
      this._panel.reveal(vscode.ViewColumn.Active);
      return;
    }

    this._panel = vscode.window.createWebviewPanel(
      SummaryPanel.viewType,
      '📚 章节摘要',
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
          this._sendSummaries(this._panel!.webview);
          break;
        case 'delete':
          await this._delete(data.chapterNumber);
          break;
        case 'editSummary':
          logger.log(`▶ 编辑章节摘要 - ${data.summaryId}`);
          vscode.commands.executeCommand('novelAssistant.editSummary', data.summaryId);
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
    const instance = SummaryPanel.getInstance(extensionUri);
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
          this._sendSummaries(webviewView.webview);
          break;
        case 'delete':
          await this._delete(data.chapterNumber);
          break;
        case 'editSummary':
          logger.log(`▶ 编辑章节摘要 - ${data.summaryId}`);
          vscode.commands.executeCommand('novelAssistant.editSummary', data.summaryId);
          break;
      }
    });
  }

  public refresh() {
    if (this._view) {
      this._sendSummaries(this._view.webview);
    }
    if (this._panel) {
      this._sendSummaries(this._panel.webview);
    }
  }

  private _sendSummaries(webview: vscode.Webview) {
    const summaries = summaryRepository.loadAll();
    const message = {
      command: 'update',
      data: summaries
    };

    // 发送给特定的webview
    webview.postMessage(message);

    // 同时确保另一个也更新
    if (webview === this._view?.webview && this._panel) {
      this._panel.webview.postMessage(message);
    } else if (webview === this._panel?.webview && this._view) {
      this._view.webview.postMessage(message);
    }
  }

  private async _delete(chapterNumber: number) {
    const confirm = await vscode.window.showWarningMessage(
      `确定要删除第${chapterNumber}章的摘要吗?`,
      '删除',
      '取消'
    );

    if (confirm === '删除') {
      const summary = summaryRepository.findByChapter(chapterNumber);
      if (summary) {
        summaryRepository.delete(summary.id);
        logger.log(`🗑️ 删除第${chapterNumber}章摘要`);
        // 向所有打开的面板发送更新
        if (this._view) {
          this._sendSummaries(this._view.webview);
        }
        if (this._panel) {
          this._sendSummaries(this._panel.webview);
        }
        vscode.window.showInformationMessage('摘要已删除');
      }
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>章节摘要</title>
  <style>
    body {
      padding: 10px;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
    }
    .header {
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--vscode-panel-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .summary-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .summary-item {
      padding: 12px;
      background: var(--vscode-editor-background);
      border-left: 4px solid var(--vscode-textLink-foreground);
      border-radius: 4px;
    }
    .summary-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .summary-title {
      font-weight: bold;
      font-size: 14px;
    }
    .summary-content {
      margin-bottom: 8px;
      line-height: 1.5;
      font-size: 13px;
    }
    .summary-meta {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      font-size: 12px;
      opacity: 0.8;
      margin-bottom: 8px;
    }
    .summary-meta-item {
      display: flex;
      gap: 4px;
    }
    .summary-meta-label {
      font-weight: bold;
    }
    .summary-actions {
      display: flex;
      gap: 8px;
      margin-top: 10px;
    }
    button {
      padding: 4px 12px;
      border: 1px solid var(--vscode-button-border);
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      cursor: pointer;
      border-radius: 3px;
      font-size: 12px;
    }
    button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .btn-danger {
      background: var(--vscode-errorForeground);
      color: white;
    }
    .btn-edit {
      background: var(--vscode-textLink-foreground);
      color: white;
    }
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      opacity: 0.6;
    }
    .pace-badge {
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      margin-left: 8px;
    }
    .pace-slow {
      background: var(--vscode-terminal-ansiBlue);
      color: white;
    }
    .pace-moderate {
      background: var(--vscode-terminal-ansiYellow);
      color: black;
    }
    .pace-fast {
      background: var(--vscode-errorForeground);
      color: white;
    }
  </style>
</head>
<body>
  <div class="header">
    <h3>章节摘要</h3>
    <button onclick="refreshSummaries()">刷新</button>
  </div>
  <div class="summary-list" id="list"></div>

  <script>
    const vscode = acquireVsCodeApi();

    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.command === 'update') {
        renderSummaries(message.data);
      }
    });

    function renderSummaries(summaries) {
      const listEl = document.getElementById('list');
      
      if (summaries.length === 0) {
        listEl.innerHTML = '<div class="empty-state">暂无章节摘要<br>执行"分析章节"可自动提取摘要</div>';
        return;
      }

      // 按章节号排序
      const sorted = [...summaries].sort((a, b) => a.chapterNumber - b.chapterNumber);

      listEl.innerHTML = sorted.map(sum => \`
        <div class="summary-item">
          <div class="summary-header">
            <div class="summary-title">
              第\${sum.chapterNumber}章《\${sum.chapterTitle}》
              <span class="pace-badge pace-\${sum.paceLevel}">\${getPaceLabel(sum.paceLevel)}</span>
            </div>
          </div>
          <div class="summary-content">\${sum.summary}</div>
          <div class="summary-meta">
            <div class="summary-meta-item">
              <span class="summary-meta-label">字数:</span>
              <span>\${sum.wordCount}</span>
            </div>
            <div class="summary-meta-item">
              <span class="summary-meta-label">情绪:</span>
              <span>\${sum.emotionalTone || '-'}</span>
            </div>
            <div class="summary-meta-item">
              <span class="summary-meta-label">主要角色:</span>
              <span>\${sum.keyCharacters.slice(0, 3).join(', ') || '-'}</span>
            </div>
            <div class="summary-meta-item">
              <span class="summary-meta-label">主要冲突:</span>
              <span>\${truncate(sum.mainConflict, 20)}</span>
            </div>
          </div>
          \${sum.keyEvents.length > 0 ? \`
            <div style="font-size: 12px; opacity: 0.8; margin-top: 6px;">
              关键事件: \${sum.keyEvents.slice(0, 2).join('; ')}
            </div>
          \` : ''}
          <div class="summary-actions">
            <button onclick="editSummary('\${sum.id}')" class="btn-edit">编辑</button>
            <button onclick="deleteSummary(\${sum.chapterNumber})" class="btn-danger">删除</button>
          </div>
        </div>
      \`).join('');
    }

    function editSummary(summaryId) {
      vscode.postMessage({
        command: 'editSummary',
        summaryId: summaryId
      });
    }

    function getPaceLabel(pace) {
      const labels = { slow: '慢节奏', moderate: '中等', fast: '快节奏' };
      return labels[pace] || pace;
    }

    function truncate(text, maxLen) {
      if (!text || text.length <= maxLen) return text || '-';
      return text.slice(0, maxLen) + '...';
    }

    function deleteSummary(chapterNumber) {
      vscode.postMessage({
        command: 'delete',
        chapterNumber: chapterNumber
      });
    }

    function refreshSummaries() {
      vscode.postMessage({ command: 'load' });
    }

    // 初始加载
    vscode.postMessage({ command: 'load' });
  </script>
</body>
</html>`;
  }
}
