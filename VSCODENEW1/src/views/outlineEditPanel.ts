import * as vscode from 'vscode';
import { outlineRepository } from '../repositories';
import { logger } from '../utils/logger';
import { Outline } from '../data/storage';

const TYPE_OPTIONS = [
  { value: 'volume', label: '📘 卷' },
  { value: 'chapter', label: '📗 章' },
  { value: 'scene', label: '📙 场景' }
];

const STATUS_OPTIONS = [
  { value: 'draft', label: '草稿' },
  { value: 'finalized', label: '已定稿' }
];

export class OutlineEditPanel {
  public static readonly viewType = 'novelAssistant.outlineEdit';

  private _panel?: vscode.WebviewPanel;
  private static _instance: OutlineEditPanel | undefined;
  private _currentOutlineId?: string;

  private constructor(private readonly _extensionUri: vscode.Uri) {}

  public static getInstance(extensionUri: vscode.Uri): OutlineEditPanel {
    if (!OutlineEditPanel._instance) {
      OutlineEditPanel._instance = new OutlineEditPanel(extensionUri);
    }
    return OutlineEditPanel._instance;
  }

  public show(outlineId: string) {
    if (this._panel) {
      this._panel.dispose();
    }

    const outline = outlineRepository.findById(outlineId);
    if (!outline) {
      vscode.window.showErrorMessage('大纲不存在');
      return;
    }

    this._currentOutlineId = outlineId;

    this._panel = vscode.window.createWebviewPanel(
      OutlineEditPanel.viewType,
      `✏️ 编辑大纲 - ${outline.title}`,
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this._extensionUri]
      }
    );

    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, outline);

    this._panel.webview.onDidReceiveMessage(async (data) => {
      switch (data.command) {
        case 'saveOutline':
          await this._handleSaveOutline(data.outline);
          break;
        case 'loadData':
          await this._sendOutlineData(this._panel!.webview, outlineId);
          break;
        case 'deleteOutline':
          await this._handleDeleteOutline();
          break;
      }
    });

    this._panel.onDidDispose(() => {
      this._panel = undefined;
      this._currentOutlineId = undefined;
    });
  }

  private async _handleSaveOutline(outlineData: Partial<Outline>) {
    if (!this._currentOutlineId) return;

    const success = outlineRepository.update(this._currentOutlineId, outlineData);

    if (success) {
      logger.log(`✅ 大纲更新成功: ${this._currentOutlineId}`);
      vscode.window.showInformationMessage('大纲保存成功');

      if (this._panel) {
        const outline = outlineRepository.findById(this._currentOutlineId);
        if (outline) {
          this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, outline);
        }
      }
    } else {
      logger.log(`❌ 大纲更新失败: ${this._currentOutlineId}`);
      vscode.window.showErrorMessage('大纲保存失败');
    }
  }

  private async _handleDeleteOutline() {
    if (!this._currentOutlineId) return;

    const confirm = await vscode.window.showWarningMessage(
      '确定要删除这个大纲项吗？此操作不可恢复。',
      '确定',
      '取消'
    );

    if (confirm === '确定') {
      const success = outlineRepository.delete(this._currentOutlineId);

      if (success) {
        logger.log(`✅ 大纲删除成功: ${this._currentOutlineId}`);
        vscode.window.showInformationMessage('大纲删除成功');
        this._panel?.dispose();
      } else {
        logger.log(`❌ 大纲删除失败: ${this._currentOutlineId}`);
        vscode.window.showErrorMessage('大纲删除失败');
      }
    }
  }

  private async _sendOutlineData(webview: vscode.Webview, outlineId: string) {
    const outline = outlineRepository.findById(outlineId);
    if (outline) {
      webview.postMessage({
        command: 'outlineLoaded',
        data: outline
      });
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview, outline: Outline): string {
    const typeOptions = TYPE_OPTIONS.map(type =>
      `<option value="${type.value}" ${outline.type === type.value ? 'selected' : ''}>${type.label}</option>`
    ).join('');

    const statusOptions = STATUS_OPTIONS.map(status =>
      `<option value="${status.value}" ${outline.status === status.value ? 'selected' : ''}>${status.label}</option>`
    ).join('');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>编辑大纲 - ${outline.title}</title>
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
      min-height: 150px;
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
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">✏️ 编辑大纲</h1>
    </div>

    <div class="form-group">
      <label class="form-label">标题</label>
      <input type="text" class="form-input" id="title" value="${outline.title}" placeholder="输入大纲标题">
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">类型</label>
        <select class="form-select" id="type">
          ${typeOptions}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">状态</label>
        <select class="form-select" id="status">
          ${statusOptions}
        </select>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">卷号 (仅卷类型)</label>
        <input type="number" class="form-input" id="volumeNumber" value="${outline.volumeNumber || ''}" placeholder="卷号">
      </div>

      <div class="form-group">
        <label class="form-label">章节号 (仅章/场景类型)</label>
        <input type="number" class="form-input" id="chapterNumber" value="${outline.chapterNumber || ''}" placeholder="章节号">
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">排序索引</label>
      <input type="number" class="form-input" id="orderIndex" value="${outline.orderIndex}" placeholder="数字越小越靠前">
    </div>

    <div class="form-group">
      <label class="form-label">内容描述</label>
      <textarea class="form-textarea" id="content" placeholder="输入大纲内容描述">${outline.content}</textarea>
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
      const outline = {
        title: document.getElementById('title').value.trim(),
        type: document.getElementById('type').value,
        status: document.getElementById('status').value,
        volumeNumber: document.getElementById('volumeNumber').value ? parseInt(document.getElementById('volumeNumber').value) : undefined,
        chapterNumber: document.getElementById('chapterNumber').value ? parseInt(document.getElementById('chapterNumber').value) : undefined,
        orderIndex: parseInt(document.getElementById('orderIndex').value) || 0,
        content: document.getElementById('content').value.trim()
      };

      if (!outline.title) {
        showStatus('请输入标题', false);
        return;
      }

      vscode.postMessage({ command: 'saveOutline', outline });
    });

    document.getElementById('deleteBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'deleteOutline' });
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
