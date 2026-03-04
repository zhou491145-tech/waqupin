import * as vscode from 'vscode';
import { foreshadowRepository, characterRepository } from '../repositories';
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

export class ForeshadowDetailPanel {
  public static readonly viewType = 'novelAssistant.foreshadowDetail';

  private _panel?: vscode.WebviewPanel;
  private static _instance: ForeshadowDetailPanel | undefined;

  private constructor(private readonly _extensionUri: vscode.Uri) {}

  public static getInstance(extensionUri: vscode.Uri): ForeshadowDetailPanel {
    if (!ForeshadowDetailPanel._instance) {
      ForeshadowDetailPanel._instance = new ForeshadowDetailPanel(extensionUri);
    }
    return ForeshadowDetailPanel._instance;
  }

  public show(foreshadowId: string) {
    if (this._panel) {
      this._panel.dispose();
    }

    const foreshadow = foreshadowRepository.findById(foreshadowId);
    if (!foreshadow) {
      vscode.window.showErrorMessage('伏笔不存在');
      return;
    }

    this._panel = vscode.window.createWebviewPanel(
      ForeshadowDetailPanel.viewType,
      `🎭 ${foreshadow.keyword}`,
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        localResourceRoots: [this._extensionUri]
      }
    );

    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, foreshadow);

    this._panel.webview.onDidReceiveMessage(
      message => {
        switch (message.command) {
          case 'viewCharacter':
            logger.log(`▶ 从伏笔详情查看角色 - ${message.characterId}`);
            vscode.commands.executeCommand('novelAssistant.showCharacterDetail', message.characterId);
            break;
        }
      }
    );

    this._panel.onDidDispose(() => {
      this._panel = undefined;
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview, foreshadow: any): string {
    const statusColor = STATUS_COLORS[foreshadow.status] || '#95a5a6';
    const statusLabel = STATUS_LABELS[foreshadow.status] || foreshadow.status;
    const importanceLabel = IMPORTANCE_LABELS[foreshadow.importance] || foreshadow.importance;

    const relatedCharacters = foreshadow.relatedCharacters || [];
    const characterDetails = relatedCharacters.map((charName: string) => {
      const character = characterRepository.loadAll().find(c => c.name === charName);
      return {
        name: charName,
        id: character?.id || null,
        exists: !!character
      };
    });

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${foreshadow.keyword} - 伏笔详情</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      padding: 20px;
      background-color: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      line-height: 1.6;
    }
    
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    
    .header {
      display: flex;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid var(--vscode-panel-border);
    }
    
    .icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: linear-gradient(135deg, ${statusColor}, #9b59b6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      margin-right: 20px;
      color: white;
      font-weight: bold;
    }
    
    .title {
      flex: 1;
    }
    
    .keyword {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    
    .status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      background-color: ${statusColor};
      color: white;
      font-size: 14px;
      font-weight: bold;
    }
    
    .section {
      margin-bottom: 30px;
      background-color: var(--vscode-editor-inactiveSelectionBackground);
      border-radius: 8px;
      padding: 20px;
    }
    
    .section-title {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 15px;
      color: var(--vscode-textLink-foreground);
      display: flex;
      align-items: center;
    }
    
    .section-title::before {
      content: '';
      display: inline-block;
      width: 4px;
      height: 18px;
      background-color: var(--vscode-textLink-foreground);
      margin-right: 10px;
      border-radius: 2px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 15px;
    }
    
    .info-item {
      background-color: var(--vscode-editor-background);
      padding: 12px;
      border-radius: 6px;
    }
    
    .info-label {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 4px;
    }
    
    .info-value {
      font-size: 14px;
      font-weight: 500;
    }
    
    .description-text {
      white-space: pre-wrap;
      line-height: 1.8;
    }
    
    .notes {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    
    .note-item {
      padding: 10px;
      background-color: var(--vscode-editor-background);
      border-radius: 6px;
      border-left: 3px solid var(--vscode-textLink-foreground);
    }
    
    .characters-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    
    .character-item {
      display: flex;
      align-items: center;
      padding: 12px;
      background-color: var(--vscode-editor-background);
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .character-item:hover {
      background-color: var(--vscode-editor-selectionBackground);
    }
    
    .character-item.missing {
      opacity: 0.6;
    }
    
    .character-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3498db, #9b59b6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      margin-right: 12px;
      color: white;
      font-weight: bold;
    }
    
    .character-info {
      flex: 1;
    }
    
    .character-name {
      font-size: 14px;
      font-weight: 500;
    }
    
    .character-status {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }
    
    .character-action {
      padding: 6px 12px;
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }
    
    .character-action:hover {
      background-color: var(--vscode-button-hoverBackground);
    }
    
    .character-action:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .timestamps {
      display: flex;
      gap: 20px;
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-top: 10px;
    }
    
    .empty {
      color: var(--vscode-descriptionForeground);
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="icon">🎭</div>
      <div class="title">
        <div class="keyword">${foreshadow.keyword}</div>
        <div class="status">${statusLabel}</div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">基本信息</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">重要性</div>
          <div class="info-value">${importanceLabel}</div>
        </div>
        <div class="info-item">
          <div class="info-label">埋下章节</div>
          <div class="info-value">第${foreshadow.plantedChapter}章</div>
        </div>
        ${foreshadow.resolvedChapter ? `
        <div class="info-item">
          <div class="info-label">回收章节</div>
          <div class="info-value">第${foreshadow.resolvedChapter}章</div>
        </div>
        ` : ''}
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">伏笔描述</div>
      <div class="description-text">${foreshadow.description}</div>
    </div>
    
    ${relatedCharacters.length > 0 ? `
    <div class="section">
      <div class="section-title">相关角色 (${relatedCharacters.length})</div>
      <div class="characters-list">
        ${characterDetails.map((char: any) => `
        <div class="character-item ${char.exists ? '' : 'missing'}">
          <div class="character-icon">${char.name.charAt(0)}</div>
          <div class="character-info">
            <div class="character-name">${char.name}</div>
            <div class="character-status">${char.exists ? '✓ 角色存在' : '✗ 角色不存在'}</div>
          </div>
          ${char.exists ? `
          <button class="character-action" onclick="viewCharacter('${char.id}')">
            查看详情
          </button>
          ` : `
          <button class="character-action" disabled>
            角色不存在
          </button>
          `}
        </div>
        `).join('')}
      </div>
    </div>
    ` : `
    <div class="section">
      <div class="section-title">相关角色</div>
      <div class="empty">暂无相关角色</div>
    </div>
    `}
    
    ${foreshadow.notes && foreshadow.notes.length > 0 ? `
    <div class="section">
      <div class="section-title">备注信息</div>
      <div class="notes">
        ${foreshadow.notes.map((note: string) => `
        <div class="note-item">${note}</div>
        `).join('')}
      </div>
    </div>
    ` : ''}
    
    <div class="timestamps">
      <div>创建时间: ${new Date(foreshadow.createdAt).toLocaleString('zh-CN')}</div>
      <div>更新时间: ${new Date(foreshadow.updatedAt).toLocaleString('zh-CN')}</div>
    </div>
  </div>
  
  <script>
    function viewCharacter(characterId) {
      const vscode = acquireVsCodeApi();
      vscode.postMessage({
        command: 'viewCharacter',
        characterId: characterId
      });
    }
  </script>
</body>
</html>`;
  }
}
