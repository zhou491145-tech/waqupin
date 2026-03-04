import * as vscode from 'vscode';
import { summaryRepository } from '../repositories';
import { logger } from '../utils/logger';
import { ChapterSummary } from '../data/storage';

const PACE_OPTIONS = [
  { value: 'slow', label: '慢节奏' },
  { value: 'moderate', label: '中等' },
  { value: 'fast', label: '快节奏' }
];

export class SummaryEditPanel {
  public static readonly viewType = 'novelAssistant.summaryEdit';

  private _panel?: vscode.WebviewPanel;
  private static _instance: SummaryEditPanel | undefined;
  private _currentSummaryId?: string;

  private constructor(private readonly _extensionUri: vscode.Uri) {}

  public static getInstance(extensionUri: vscode.Uri): SummaryEditPanel {
    if (!SummaryEditPanel._instance) {
      SummaryEditPanel._instance = new SummaryEditPanel(extensionUri);
    }
    return SummaryEditPanel._instance;
  }

  public show(summaryId: string) {
    if (this._panel) {
      this._panel.dispose();
    }

    const summary = summaryRepository.findById(summaryId);
    if (!summary) {
      vscode.window.showErrorMessage('章节摘要不存在');
      return;
    }

    this._currentSummaryId = summaryId;

    this._panel = vscode.window.createWebviewPanel(
      SummaryEditPanel.viewType,
      `✏️ 编辑章节摘要 - 第${summary.chapterNumber}章`,
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this._extensionUri]
      }
    );

    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, summary);

    this._panel.webview.onDidReceiveMessage(async (data) => {
      switch (data.command) {
        case 'saveSummary':
          await this._handleSaveSummary(data.summary);
          break;
        case 'deleteSummary':
          await this._handleDeleteSummary();
          break;
      }
    });

    this._panel.onDidDispose(() => {
      this._panel = undefined;
      this._currentSummaryId = undefined;
    });
  }

  private async _handleSaveSummary(summaryData: Partial<ChapterSummary>) {
    if (!this._currentSummaryId) return;

    const success = summaryRepository.update(this._currentSummaryId, summaryData);

    if (success) {
      logger.log(`✅ 章节摘要更新成功: ${this._currentSummaryId}`);
      vscode.window.showInformationMessage('章节摘要保存成功');

      if (this._panel) {
        const summary = summaryRepository.findById(this._currentSummaryId);
        if (summary) {
          this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, summary);
        }
      }
    } else {
      logger.log(`❌ 章节摘要更新失败: ${this._currentSummaryId}`);
      vscode.window.showErrorMessage('章节摘要保存失败');
    }
  }

  private async _handleDeleteSummary() {
    if (!this._currentSummaryId) return;

    const confirm = await vscode.window.showWarningMessage(
      '确定要删除这个章节摘要吗？此操作不可恢复。',
      '确定',
      '取消'
    );

    if (confirm === '确定') {
      const success = summaryRepository.delete(this._currentSummaryId);

      if (success) {
        logger.log(`✅ 章节摘要删除成功: ${this._currentSummaryId}`);
        vscode.window.showInformationMessage('章节摘要删除成功');
        this._panel?.dispose();
      } else {
        logger.log(`❌ 章节摘要删除失败: ${this._currentSummaryId}`);
        vscode.window.showErrorMessage('章节摘要删除失败');
      }
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview, summary: ChapterSummary): string {
    const paceOptions = PACE_OPTIONS.map(pace =>
      `<option value="${pace.value}" ${summary.paceLevel === pace.value ? 'selected' : ''}>${pace.label}</option>`
    ).join('');

    const keyCharactersValue = summary.keyCharacters.join(', ');

    const keyEventsValue = summary.keyEvents.join('\n');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>编辑章节摘要 - 第${summary.chapterNumber}章</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 20px;
      line-height: 1.6;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    .title {
      font-size: 20px;
      font-weight: bold;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: var(--vscode-textLink-foreground);
    }

    .form-input,
    .form-select,
    .form-textarea {
      width: 100%;
      padding: 10px;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      font-size: 14px;
    }

    .form-textarea {
      min-height: 100px;
      resize: vertical;
    }

    .form-row {
      display: flex;
      gap: 15px;
    }

    .form-row .form-group {
      flex: 1;
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-primary {
      background: var(--vscode-textLink-foreground);
      color: white;
    }

    .btn-primary:hover {
      opacity: 0.9;
    }

    .btn-danger {
      background: var(--vscode-errorForeground);
      color: white;
    }

    .btn-danger:hover {
      opacity: 0.9;
    }

    .btn-secondary {
      background: var(--vscode-editor-inactiveSelectionBackground);
      color: var(--vscode-editor-foreground);
    }

    .btn-secondary:hover {
      background: var(--vscode-panel-border);
    }

    .actions {
      display: flex;
      gap: 10px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid var(--vscode-panel-border);
    }

    .status-message {
      margin-top: 10px;
      padding: 10px;
      border-radius: 4px;
      font-size: 14px;
      display: none;
    }

    .status-message.success {
      background: var(--vscode-testing-iconPassed);
      color: white;
      display: block;
    }

    .status-message.error {
      background: var(--vscode-errorForeground);
      color: white;
      display: block;
    }

    .info-box {
      background: var(--vscode-editor-inactiveSelectionBackground);
      border-left: 3px solid var(--vscode-textLink-foreground);
      padding: 12px;
      margin-bottom: 20px;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">✏️ 编辑章节摘要</h1>
    </div>

    <div class="info-box">
      <strong>章节信息：</strong>第${summary.chapterNumber}章《${summary.chapterTitle}》
    </div>

    <div class="form-group">
      <label class="form-label">章节标题</label>
      <input type="text" class="form-input" id="chapterTitle" value="${summary.chapterTitle}" placeholder="输入章节标题">
    </div>

    <div class="form-group">
      <label class="form-label">章节摘要</label>
      <textarea class="form-textarea" id="summary" placeholder="输入章节摘要">${summary.summary}</textarea>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">字数</label>
        <input type="number" class="form-input" id="wordCount" value="${summary.wordCount}" placeholder="章节字数">
      </div>

      <div class="form-group">
        <label class="form-label">节奏</label>
        <select class="form-select" id="paceLevel">
          ${paceOptions}
        </select>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">主要角色 (用逗号分隔)</label>
      <input type="text" class="form-input" id="keyCharacters" value="${keyCharactersValue}" placeholder="例如: 张三, 李四, 王五">
    </div>

    <div class="form-group">
      <label class="form-label">情绪基调</label>
      <input type="text" class="form-input" id="emotionalTone" value="${summary.emotionalTone || ''}" placeholder="例如: 紧张, 温馨, 悲伤">
    </div>

    <div class="form-group">
      <label class="form-label">主要冲突</label>
      <input type="text" class="form-input" id="mainConflict" value="${summary.mainConflict || ''}" placeholder="输入章节主要冲突">
    </div>

    <div class="form-group">
      <label class="form-label">关键事件 (每行一个)</label>
      <textarea class="form-textarea" id="keyEvents" placeholder="输入关键事件，每行一个">${keyEventsValue}</textarea>
    </div>

    <div class="actions">
      <button class="btn btn-primary" id="saveBtn">💾 保存</button>
      <button class="btn btn-danger" id="deleteBtn">🗑️ 删除</button>
      <button class="btn btn-secondary" id="cancelBtn">取消</button>
    </div>

    <div class="status-message" id="statusMessage"></div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const statusMessage = document.getElementById('statusMessage');

    function showStatus(message, isSuccess) {
      statusMessage.textContent = message;
      statusMessage.className = 'status-message ' + (isSuccess ? 'success' : 'error');
      setTimeout(() => {
        statusMessage.className = 'status-message';
      }, 3000);
    }

    document.getElementById('saveBtn').addEventListener('click', () => {
      const summary = {
        chapterTitle: document.getElementById('chapterTitle').value.trim(),
        summary: document.getElementById('summary').value.trim(),
        wordCount: parseInt(document.getElementById('wordCount').value) || 0,
        paceLevel: document.getElementById('paceLevel').value,
        keyCharacters: document.getElementById('keyCharacters').value
          .split(',')
          .map(s => s.trim())
          .filter(s => s),
        emotionalTone: document.getElementById('emotionalTone').value.trim(),
        mainConflict: document.getElementById('mainConflict').value.trim(),
        keyEvents: document.getElementById('keyEvents').value
          .split('\n')
          .map(s => s.trim())
          .filter(s => s)
      };

      if (!summary.chapterTitle) {
        showStatus('请输入章节标题', false);
        return;
      }

      if (!summary.summary) {
        showStatus('请输入章节摘要', false);
        return;
      }

      vscode.postMessage({ command: 'saveSummary', summary });
    });

    document.getElementById('deleteBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'deleteSummary' });
    });

    document.getElementById('cancelBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'cancel' });
    });

    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.command === 'saveSuccess') {
        showStatus('保存成功', true);
      } else if (message.command === 'saveError') {
        showStatus('保存失败', false);
      } else if (message.command === 'deleteSuccess') {
        showStatus('删除成功', true);
      } else if (message.command === 'deleteError') {
        showStatus('删除失败', false);
      }
    });
  </script>
</body>
</html>`;
  }
}
