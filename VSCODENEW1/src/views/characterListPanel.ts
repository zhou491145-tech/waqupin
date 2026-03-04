import * as vscode from 'vscode';
import { characterRepository } from '../repositories';
import { logger } from '../utils/logger';

const ROLE_LABELS: { [key: string]: string } = {
  'protagonist': '👑 主角',
  'antagonist': '👿 反派',
  'supporting': '👥 配角',
  'minor': '👤 次要角色'
};

const ROLE_COLORS: { [key: string]: string } = {
  'protagonist': '#e74c3c',
  'antagonist': '#9b59b6',
  'supporting': '#3498db',
  'minor': '#95a5a6'
};

export class CharacterListPanel {
  public static readonly viewType = 'novelAssistant.characterList';

  private _panel?: vscode.WebviewPanel;
  private static _instance: CharacterListPanel | undefined;

  private constructor(private readonly _extensionUri: vscode.Uri) {}

  public static getInstance(extensionUri: vscode.Uri): CharacterListPanel {
    if (!CharacterListPanel._instance) {
      CharacterListPanel._instance = new CharacterListPanel(extensionUri);
    }
    return CharacterListPanel._instance;
  }

  public show() {
    if (this._panel) {
      this._panel.reveal(vscode.ViewColumn.Active);
      return;
    }

    this._panel = vscode.window.createWebviewPanel(
      CharacterListPanel.viewType,
      '👥 人物卡片',
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
          this._sendCharacters(this._panel!.webview);
          break;
        case 'viewCharacter':
          logger.log(`▶ 查看角色详情 - ${data.characterId}`);
          vscode.commands.executeCommand('novelAssistant.showCharacterDetail', data.characterId);
          break;
        case 'editCharacter':
          logger.log(`▶ 编辑角色 - ${data.characterId}`);
          vscode.commands.executeCommand('novelAssistant.editCharacter', data.characterId);
          break;
      }
    });

    this._panel.onDidDispose(() => {
      this._panel = undefined;
    });
  }

  private _sendCharacters(webview: vscode.Webview) {
    const characters = characterRepository.loadAll();
    logger.log(`📖 读取角色数据成功，共 ${characters.length} 个角色`);

    webview.postMessage({
      command: 'characters',
      characters: characters
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'webview-styles', 'globals.css'));

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>人物卡片</title>
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

    .header-content h1 {
      font-size: var(--font-size-2xl);
      font-weight: var(--font-weight-bold);
      margin-bottom: 8px;
      background: var(--gradient-primary);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .header-content p {
      color: var(--vscode-descriptionForeground);
      font-size: var(--font-size-base);
    }

    .character-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }

    .character-card {
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

    .character-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: var(--card-role-color, var(--color-primary));
      transform: scaleX(0);
      transition: transform var(--duration-fast) var(--ease-out);
    }

    .character-card:hover {
      background: var(--vscode-editor-selectionBackground);
      transform: translateY(-4px);
      box-shadow: var(--shadow-xl);
      border-color: var(--color-primary-300);
    }

    .character-card:hover::before {
      transform: scaleX(1);
    }

    .character-header {
      display: flex;
      align-items: center;
      margin-bottom: 16px;
    }

    .character-avatar {
      width: 56px;
      height: 56px;
      border-radius: var(--radius-full);
      background: var(--gradient-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: var(--font-weight-bold);
      color: white;
      margin-right: 16px;
      box-shadow: var(--shadow-md);
      transition: transform var(--duration-fast) var(--ease-out);
    }

    .character-card:hover .character-avatar {
      transform: scale(1.1) rotate(5deg);
    }

    .character-name {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-semibold);
      margin-bottom: 6px;
      color: var(--vscode-foreground);
    }

    .character-role {
      font-size: var(--font-size-sm);
      padding: 4px 12px;
      border-radius: var(--radius-full);
      display: inline-block;
      font-weight: var(--font-weight-medium);
    }

    .character-info {
      margin-top: 16px;
      font-size: var(--font-size-sm);
      color: var(--vscode-descriptionForeground);
      line-height: var(--line-height-normal);
    }

    .character-info p {
      margin-bottom: 8px;
      display: flex;
      align-items: flex-start;
    }

    .character-info p strong {
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
        <h1>👥 人物卡片</h1>
        <p>点击角色卡片查看详情或编辑</p>
      </div>
      <button class="refresh-button" onclick="refreshCharacters()">
        <span>🔄</span>
        <span>刷新</span>
      </button>
    </div>

    <div id="characterList" class="character-grid">
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
        case 'characters':
          renderCharacters(message.characters);
          break;
      }
    });

    function refreshCharacters() {
      vscode.postMessage({ command: 'load' });
    }

    function renderCharacters(characters) {
      const container = document.getElementById('characterList');

      if (!characters || characters.length === 0) {
        container.innerHTML = \`
          <div class="empty-state">
            <div class="icon">👤</div>
            <p>暂无角色数据</p>
            <p style="font-size: var(--font-size-base); opacity: 0.7;">请先创建角色</p>
          </div>
        \`;
        return;
      }

      container.innerHTML = characters.map((char, index) => {
        const roleLabel = ROLE_LABELS[char.role] || char.role;
        const roleColor = ROLE_COLORS[char.role] || '#95a5a6';

        return \`
          <div class="character-card" style="--card-role-color: \${roleColor}; animation-delay: \${index * 50}ms" onclick="viewCharacter('\${char.id}')">
            <div class="character-header">
              <div class="character-avatar">\${char.name.charAt(0)}</div>
              <div>
                <div class="character-name">\${char.name}</div>
                <div class="character-role" style="background: \${roleColor}20; color: \${roleColor}">
                  \${roleLabel}
                </div>
              </div>
            </div>
            <div class="character-info">
              \${char.age ? \`<p><strong>年龄:</strong> \${char.age}</p>\` : ''}
              \${char.gender ? \`<p><strong>性别:</strong> \${char.gender}</p>\` : ''}
              \${char.personality ? \`<p><strong>性格:</strong> \${char.personality.substring(0, 50)}\${char.personality.length > 50 ? '...' : ''}</p>\` : ''}
              \${char.background ? \`<p><strong>背景:</strong> \${char.background.substring(0, 50)}\${char.background.length > 50 ? '...' : ''}</p>\` : ''}
            </div>
          </div>
        \`;
      }).join('');
    }

    function viewCharacter(characterId) {
      vscode.postMessage({
        command: 'viewCharacter',
        characterId: characterId
      });
    }

    const ROLE_LABELS = {
      'protagonist': '👑 主角',
      'antagonist': '👿 反派',
      'supporting': '👥 配角',
      'minor': '👤 次要角色'
    };

    const ROLE_COLORS = {
      'protagonist': '#e74c3c',
      'antagonist': '#9b59b6',
      'supporting': '#3498db',
      'minor': '#95a5a6'
    };
  </script>
</body>
</html>`;
  }
}
