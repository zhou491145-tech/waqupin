import * as vscode from 'vscode';
import { foreshadowRepository } from '../repositories';
import { logger } from '../utils/logger';
import { Foreshadow } from '../data/storage';

const STATUS_OPTIONS = [
  { value: 'pending', label: '⏳ 待回收' },
  { value: 'resolved', label: '✅ 已回收' },
  { value: 'abandoned', label: '❌ 已废弃' }
];

const IMPORTANCE_OPTIONS = [
  { value: 'high', label: '🔴 高' },
  { value: 'medium', label: '🟡 中' },
  { value: 'low', label: '🟢 低' }
];

export class ForeshadowEditPanel {
  public static readonly viewType = 'novelAssistant.foreshadowEdit';

  private _panel?: vscode.WebviewPanel;
  private static _instance: ForeshadowEditPanel | undefined;
  private _currentForeshadowId?: string;

  private constructor(private readonly _extensionUri: vscode.Uri) {}

  public static getInstance(extensionUri: vscode.Uri): ForeshadowEditPanel {
    if (!ForeshadowEditPanel._instance) {
      ForeshadowEditPanel._instance = new ForeshadowEditPanel(extensionUri);
    }
    return ForeshadowEditPanel._instance;
  }

  public show(foreshadowId: string) {
    if (this._panel) {
      this._panel.dispose();
    }

    this._currentForeshadowId = foreshadowId;
    const foreshadow = foreshadowId ? foreshadowRepository.findById(foreshadowId) : null;

    const title = foreshadow ? `✏️ ${foreshadow.keyword} - 编辑` : '➕ 添加伏笔';

    this._panel = vscode.window.createWebviewPanel(
      ForeshadowEditPanel.viewType,
      title,
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this._extensionUri]
      }
    );

    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, foreshadow);

    this._panel.webview.onDidReceiveMessage(async (data) => {
      switch (data.command) {
        case 'saveForeshadow':
          await this._handleSaveForeshadow(data.foreshadow);
          break;
        case 'cancel':
          this._panel?.dispose();
          break;
      }
    });

    this._panel.onDidDispose(() => {
      this._panel = undefined;
    });
  }

  private async _handleSaveForeshadow(foreshadowData: any) {
    try {
      const now = new Date().toISOString();

      if (this._currentForeshadowId) {
        logger.log(`💾 更新伏笔 - ${foreshadowData.keyword}`);
        foreshadowRepository.update(this._currentForeshadowId, {
          ...foreshadowData,
          updatedAt: now
        });
        vscode.window.showInformationMessage('伏笔更新成功！');
      } else {
        logger.log(`💾 创建新伏笔 - ${foreshadowData.keyword}`);
        const newForeshadow: Foreshadow = {
          id: foreshadowRepository.generateId(),
          ...foreshadowData,
          createdAt: now,
          updatedAt: now
        };
        foreshadowRepository.add(newForeshadow);
        vscode.window.showInformationMessage('伏笔创建成功！');
      }

      this._panel?.dispose();
      vscode.commands.executeCommand('novelAssistant.showForeshadows');
    } catch (error) {
      logger.error(`❌ 保存伏笔失败: ${error}`);
      vscode.window.showErrorMessage('保存伏笔失败，请重试');
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview, foreshadow: Foreshadow | null): string {
    const isEdit = !!foreshadow;
    const formData = foreshadow || {
      keyword: '',
      description: '',
      status: 'pending',
      importance: 'medium',
      plantedChapter: 1,
      resolvedChapter: undefined,
      relatedCharacters: [],
      notes: []
    };

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isEdit ? '编辑伏笔' : '添加伏笔'}</title>
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
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid var(--vscode-panel-border);
    }

    .header h1 {
      font-size: 28px;
      margin-bottom: 8px;
    }

    .header p {
      color: var(--vscode-descriptionForeground);
      font-size: 14px;
    }

    .form-section {
      margin-bottom: 30px;
      background: var(--vscode-editor-inactiveSelectionBackground);
      border-radius: 8px;
      padding: 20px;
    }

    .form-section-title {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 15px;
      color: var(--vscode-textLink-foreground);
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
      color: var(--vscode-foreground);
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
      width: 100%;
      padding: 10px 12px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      color: var(--vscode-foreground);
      font-size: 14px;
      font-family: var(--vscode-font-family);
      transition: border-color 0.2s;
    }

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: var(--vscode-textLink-foreground);
    }

    .form-group textarea {
      min-height: 120px;
      resize: vertical;
    }

    .form-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
    }

    .form-hint {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-top: 6px;
    }

    .button-group {
      display: flex;
      gap: 12px;
      margin-top: 30px;
    }

    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .btn-primary:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    .btn-secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    .notes-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .note-item {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .note-item input {
      flex: 1;
    }

    .btn-small {
      padding: 6px 12px;
      font-size: 12px;
    }

    .btn-add {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      padding: 8px 16px;
      font-size: 13px;
    }

    .btn-add:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .btn-remove {
      background: #e74c3c;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      padding: 6px 10px;
      font-size: 12px;
    }

    .btn-remove:hover {
      background: #c0392b;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${isEdit ? '✏️ 编辑伏笔' : '➕ 添加伏笔'}</h1>
      <p>${isEdit ? '修改伏笔信息' : '创建新的伏笔'}</p>
    </div>

    <form id="foreshadowForm">
      <div class="form-section">
        <div class="form-section-title">基本信息</div>
        
        <div class="form-group">
          <label for="keyword">伏笔关键词 *</label>
          <input type="text" id="keyword" name="keyword" value="${formData.keyword}" required placeholder="例如：神秘的信件">
          <div class="form-hint">伏笔的简短标识，用于快速识别</div>
        </div>

        <div class="form-group">
          <label for="description">伏笔描述 *</label>
          <textarea id="description" name="description" required placeholder="详细描述这个伏笔的内容和意义">${formData.description}</textarea>
          <div class="form-hint">详细说明伏笔的具体内容、出现的场景和意义</div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="status">状态</label>
            <select id="status" name="status">
              ${STATUS_OPTIONS.map(opt => `
                <option value="${opt.value}" ${formData.status === opt.value ? 'selected' : ''}>${opt.label}</option>
              `).join('')}
            </select>
          </div>

          <div class="form-group">
            <label for="importance">重要性</label>
            <select id="importance" name="importance">
              ${IMPORTANCE_OPTIONS.map(opt => `
                <option value="${opt.value}" ${formData.importance === opt.value ? 'selected' : ''}>${opt.label}</option>
              `).join('')}
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="plantedChapter">埋下章节 *</label>
            <input type="number" id="plantedChapter" name="plantedChapter" value="${formData.plantedChapter}" required min="1">
            <div class="form-hint">伏笔首次出现的章节号</div>
          </div>

          <div class="form-group">
            <label for="resolvedChapter">回收章节</label>
            <input type="number" id="resolvedChapter" name="resolvedChapter" value="${formData.resolvedChapter || ''}" min="1" placeholder="可选">
            <div class="form-hint">伏笔被回收的章节号（如果已回收）</div>
          </div>
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-title">备注信息</div>
        <div id="notesList" class="notes-list">
          ${(formData.notes || []).map((note: string, index: number) => `
            <div class="note-item">
              <input type="text" name="notes" value="${note}" placeholder="添加备注...">
              <button type="button" class="btn-remove" onclick="removeNote(${index})">删除</button>
            </div>
          `).join('')}
        </div>
        <button type="button" class="btn-add" onclick="addNote()">+ 添加备注</button>
      </div>

      <div class="button-group">
        <button type="submit" class="btn btn-primary">💾 保存</button>
        <button type="button" class="btn btn-secondary" onclick="cancel()">取消</button>
      </div>
    </form>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    document.getElementById('foreshadowForm').addEventListener('submit', (e) => {
      e.preventDefault();
      saveForeshadow();
    });

    function saveForeshadow() {
      const form = document.getElementById('foreshadowForm');
      const formData = new FormData(form);

      const notes = [];
      form.querySelectorAll('input[name="notes"]').forEach(input => {
        if (input.value.trim()) {
          notes.push(input.value.trim());
        }
      });

      const foreshadow = {
        keyword: formData.get('keyword').trim(),
        description: formData.get('description').trim(),
        status: formData.get('status'),
        importance: formData.get('importance'),
        plantedChapter: parseInt(formData.get('plantedChapter')),
        resolvedChapter: formData.get('resolvedChapter') ? parseInt(formData.get('resolvedChapter')) : undefined,
        relatedCharacters: [],
        notes: notes
      };

      if (!foreshadow.keyword) {
        alert('请输入伏笔关键词');
        return;
      }

      if (!foreshadow.description) {
        alert('请输入伏笔描述');
        return;
      }

      vscode.postMessage({
        command: 'saveForeshadow',
        foreshadow: foreshadow
      });
    }

    function cancel() {
      vscode.postMessage({
        command: 'cancel'
      });
    }

    function addNote() {
      const notesList = document.getElementById('notesList');
      const noteItem = document.createElement('div');
      noteItem.className = 'note-item';
      noteItem.innerHTML = \`
        <input type="text" name="notes" placeholder="添加备注...">
        <button type="button" class="btn-remove" onclick="removeNote(this)">删除</button>
      \`;
      notesList.appendChild(noteItem);
    }

    function removeNote(element) {
      const noteItem = element.closest ? element.closest('.note-item') : element.parentElement;
      if (noteItem) {
        noteItem.remove();
      }
    }
  </script>
</body>
</html>`;
  }
}
