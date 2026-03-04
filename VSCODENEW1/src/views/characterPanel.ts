import * as vscode from 'vscode';
import { characterRepository } from '../repositories';
import { logger } from '../utils/logger';

const MBTI_COLORS: { [key: string]: string } = {
  'INTJ': '#9b59b6',
  'INTP': '#3498db',
  'ENTJ': '#e74c3c',
  'ENTP': '#e67e22',
  'INFJ': '#27ae60',
  'INFP': '#f1c40f',
  'ENFJ': '#e91e63',
  'ENFP': '#ff9800',
  'ISTJ': '#00bcd4',
  'ISFJ': '#9e9e9e',
  'ESTJ': '#607d8b',
  'ESFJ': '#795548',
  'ISTP': '#212121',
  'ISFP': '#8d6e63',
  'ESTP': '#c62828',
  'ESFP': '#ef6c00'
};

const MBTI_DESCRIPTIONS: { [key: string]: string } = {
  'INTJ': '战略家 - 善于规划和执行长远目标',
  'INTP': '逻辑学家 - 善于分析和理解复杂系统',
  'ENTJ': '指挥官 - 天生的领导者，善于组织和决策',
  'ENTP': '辩论家 - 善于创新和挑战现状',
  'INFJ': '提倡者 - 富有洞察力，追求意义和价值',
  'INFP': '调停者 - 富有想象力，追求和谐与理想',
  'ENFJ': '主人公 - 富有魅力，善于激励和引导他人',
  'ENFP': '竞选者 - 充满热情，善于激发他人潜能',
  'ISTJ': '物流师 - 值得信赖，注重细节和传统',
  'ISFJ': '守卫者 - 忠诚可靠，关心他人福祉',
  'ESTJ': '总经理 - 高效务实，善于组织和执行',
  'ESFJ': '执政官 - 热心助人，善于营造和谐氛围',
  'ISTP': '鉴赏家 - 动手能力强，善于解决实际问题',
  'ISFP': '探险家 - 艺术气质，追求自由和美感',
  'ESTP': '企业家 - 行动导向，善于把握机会',
  'ESFP': '表演者 - 充满活力，善于娱乐和社交'
};

export class CharacterPanel {
  public static readonly viewType = 'novelAssistant.character';

  private _panel?: vscode.WebviewPanel;
  private static _instance: CharacterPanel | undefined;
  private _currentCharacterId?: string;

  private constructor(private readonly _extensionUri: vscode.Uri) {}

  public static getInstance(extensionUri: vscode.Uri): CharacterPanel {
    if (!CharacterPanel._instance) {
      CharacterPanel._instance = new CharacterPanel(extensionUri);
    }
    return CharacterPanel._instance;
  }

  public show(characterId: string) {
    if (this._panel) {
      this._panel.dispose();
    }

    const character = characterRepository.findById(characterId);
    if (!character) {
      vscode.window.showErrorMessage('角色不存在');
      return;
    }

    this._currentCharacterId = characterId;

    this._panel = vscode.window.createWebviewPanel(
      CharacterPanel.viewType,
      `👤 ${character.name}`,
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        localResourceRoots: [this._extensionUri]
      }
    );

    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, character);

    this._panel.webview.onDidReceiveMessage(async (data) => {
      switch (data.command) {
        case 'editCharacter':
          const { CharacterEditPanel } = await import('./characterEditPanel');
          const editPanel = CharacterEditPanel.getInstance(this._extensionUri);
          editPanel.show(this._currentCharacterId!);
          break;
      }
    });

    this._panel.onDidDispose(() => {
      this._panel = undefined;
      this._currentCharacterId = undefined;
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview, character: any): string {
    const mbtiPrimaryColor = MBTI_COLORS[character.mbtiPrimary?.toUpperCase()] || '#95a5a6';
    const mbtiSecondaryColor = MBTI_COLORS[character.mbtiSecondary?.toUpperCase()] || '#95a5a6';
    const mbtiPrimaryDesc = MBTI_DESCRIPTIONS[character.mbtiPrimary?.toUpperCase()] || '';
    const mbtiSecondaryDesc = MBTI_DESCRIPTIONS[character.mbtiSecondary?.toUpperCase()] || '';

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${character.name} - 角色详情</title>
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
    
    .avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: linear-gradient(135deg, ${mbtiPrimaryColor}, ${mbtiSecondaryColor});
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
    
    .name {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    
    .role {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      background-color: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      font-size: 14px;
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
    
    .mbti-tags {
      display: flex;
      gap: 15px;
      margin-bottom: 15px;
    }
    
    .mbti-tag {
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: bold;
      font-size: 16px;
      color: white;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .mbti-tag.primary {
      background-color: ${mbtiPrimaryColor};
    }
    
    .mbti-tag.secondary {
      background-color: ${mbtiSecondaryColor};
    }
    
    .mbti-description {
      color: var(--vscode-descriptionForeground);
      font-style: italic;
      margin-top: 10px;
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
    
    .aliases {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    
    .alias-tag {
      padding: 4px 10px;
      background-color: var(--vscode-badge-background);
      border-radius: 12px;
      font-size: 12px;
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
    
    .edit-button {
      padding: 10px 20px;
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .edit-button:hover {
      background-color: var(--vscode-button-hoverBackground);
    }
    
    .header-actions {
      display: flex;
      gap: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="avatar">${character.name.charAt(0)}</div>
      <div class="title">
        <div class="name">${character.name}</div>
        <div class="role">${this._getRoleLabel(character.role)}</div>
      </div>
      <div class="header-actions">
        <button class="edit-button" onclick="editCharacter()">✏️ 编辑角色</button>
      </div>
    </div>
    
    ${character.mbtiPrimary || character.mbtiSecondary ? `
    <div class="section">
      <div class="section-title">性格标签 (MBTI)</div>
      <div class="mbti-tags">
        ${character.mbtiPrimary ? `
        <div class="mbti-tag primary">
          <span>🎯</span>
          <span>${character.mbtiPrimary}</span>
        </div>
        ` : ''}
        ${character.mbtiSecondary ? `
        <div class="mbti-tag secondary">
          <span>✨</span>
          <span>${character.mbtiSecondary}</span>
        </div>
        ` : ''}
      </div>
      ${mbtiPrimaryDesc ? `<div class="mbti-description">📌 ${mbtiPrimaryDesc}</div>` : ''}
      ${mbtiSecondaryDesc ? `<div class="mbti-description">📌 ${mbtiSecondaryDesc}</div>` : ''}
    </div>
    ` : ''}
    
    <div class="section">
      <div class="section-title">基本信息</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">角色类型</div>
          <div class="info-value">${this._getRoleLabel(character.role)}</div>
        </div>
        ${character.aliases && character.aliases.length > 0 ? `
        <div class="info-item">
          <div class="info-label">别名</div>
          <div class="aliases">
            ${character.aliases.map((alias: string) => `<span class="alias-tag">${alias}</span>`).join('')}
          </div>
        </div>
        ` : ''}
      </div>
    </div>
    
    ${character.description ? `
    <div class="section">
      <div class="section-title">外貌特征</div>
      <div class="description-text">${character.description}</div>
    </div>
    ` : ''}
    
    ${character.personality ? `
    <div class="section">
      <div class="section-title">性格特征</div>
      <div class="description-text">${character.personality}</div>
    </div>
    ` : ''}
    
    ${character.background ? `
    <div class="section">
      <div class="section-title">背景故事</div>
      <div class="description-text">${character.background}</div>
    </div>
    ` : ''}
    
    <div class="timestamps">
      <div>创建时间: ${new Date(character.createdAt).toLocaleString('zh-CN')}</div>
      <div>更新时间: ${new Date(character.updatedAt).toLocaleString('zh-CN')}</div>
    </div>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    function editCharacter() {
      vscode.postMessage({
        command: 'editCharacter'
      });
    }
  </script>
</body>
</html>`;
  }

  private _getRoleLabel(role: string): string {
    const roleLabels: { [key: string]: string } = {
      'protagonist': '📕 主角',
      'antagonist': '📗 反派',
      'supporting': '📘 配角',
      'minor': '📙 龙套'
    };
    return roleLabels[role] || role;
  }
}