import * as vscode from 'vscode';
import { worldSettingRepository } from '../repositories';
import { logger } from '../utils/logger';
import { WorldSetting } from '../data/storage';

export class WorldSettingEditPanel {
  public static readonly viewType = 'novelAssistant.worldSettingEdit';

  private _panel?: vscode.WebviewPanel;
  private static _instance: WorldSettingEditPanel | undefined;

  private constructor(private readonly _extensionUri: vscode.Uri) {}

  public static getInstance(extensionUri: vscode.Uri): WorldSettingEditPanel {
    if (!WorldSettingEditPanel._instance) {
      WorldSettingEditPanel._instance = new WorldSettingEditPanel(extensionUri);
    }
    return WorldSettingEditPanel._instance;
  }

  public show() {
    if (this._panel) {
      this._panel.reveal(vscode.ViewColumn.Active);
      return;
    }

    const worldSetting = worldSettingRepository.load();

    this._panel = vscode.window.createWebviewPanel(
      WorldSettingEditPanel.viewType,
      '✏️ 编辑世界观设定',
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this._extensionUri]
      }
    );

    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, worldSetting);

    this._panel.webview.onDidReceiveMessage(async (data) => {
      switch (data.command) {
        case 'saveWorldSetting':
          await this._handleSaveWorldSetting(data.worldSetting);
          break;
      }
    });

    this._panel.onDidDispose(() => {
      this._panel = undefined;
    });
  }

  private async _handleSaveWorldSetting(worldSettingData: Partial<WorldSetting>) {
    const worldSetting: WorldSetting = {
      id: 'WORLD001',
      title: '世界观设定',
      timePeriod: worldSettingData.timePeriod || '',
      location: worldSettingData.location || '',
      atmosphere: worldSettingData.atmosphere || '',
      rules: worldSettingData.rules || [],
      additionalInfo: worldSettingData.additionalInfo || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const success = worldSettingRepository.save(worldSetting);

    if (success) {
      logger.log(`✅ 世界观设定保存成功`);
      vscode.window.showInformationMessage('世界观设定保存成功');
      this._panel?.dispose();
    } else {
      logger.log(`❌ 世界观设定保存失败`);
      vscode.window.showErrorMessage('世界观设定保存失败');
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview, worldSetting: WorldSetting | null): string {
    const timePeriod = worldSetting?.timePeriod || '';
    const location = worldSetting?.location || '';
    const atmosphere = worldSetting?.atmosphere || '';
    const rules = worldSetting?.rules || [];
    const additionalInfo = worldSetting?.additionalInfo || '';

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>编辑世界观设定</title>
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

    .form-textarea {
      width: 100%;
      padding: 10px;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      font-size: 14px;
      min-height: 100px;
      resize: vertical;
    }

    .form-textarea:focus {
      outline: 1px solid var(--vscode-focusBorder);
      border-color: var(--vscode-focusBorder);
    }

    .hint {
      font-size: 12px;
      opacity: 0.7;
      margin-top: 4px;
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
      <h1 class="title">✏️ 编辑世界观设定</h1>
    </div>

    <div class="form-group">
      <label class="form-label">时代背景</label>
      <textarea class="form-textarea" id="timePeriod" placeholder="例如：古代修仙、赛博朋克、未来星际...">${timePeriod}</textarea>
      <div class="hint">描述故事发生的时代背景，如历史时期、科技水平、社会形态等</div>
    </div>

    <div class="form-group">
      <label class="form-label">地点设定</label>
      <textarea class="form-textarea" id="location" placeholder="例如：大荒世界、新都、外星殖民地...">${location}</textarea>
      <div class="hint">描述故事发生的主要地点，包括地理环境、城市布局等</div>
    </div>

    <div class="form-group">
      <label class="form-label">氛围基调</label>
      <textarea class="form-textarea" id="atmosphere" placeholder="例如：沉重压抑、轻松幽默、热血奋斗...">${atmosphere}</textarea>
      <div class="hint">描述整体故事的情感氛围和基调</div>
    </div>

    <div class="form-group">
      <label class="form-label">世界规则</label>
      <textarea class="form-textarea" id="rules" placeholder="每行一个规则，例如：
1. 灵气是唯一的能量来源
2. 禁用法术在城市中使用
3. 机器人必须遵守三原则">${rules.join('\n')}</textarea>
      <div class="hint">每行一条规则，描述这个世界的基本规则和限制</div>
    </div>

    <div class="form-group">
      <label class="form-label">补充信息</label>
      <textarea class="form-textarea" id="additionalInfo" placeholder="其他需要补充的世界观细节...">${additionalInfo}</textarea>
      <div class="hint">其他需要补充的世界观细节</div>
    </div>

    <div class="actions">
      <button class="btn btn-primary" id="saveBtn">💾 保存</button>
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
      const rulesText = document.getElementById('rules').value;
      const rulesArray = rulesText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      const worldSettingData = {
        timePeriod: document.getElementById('timePeriod').value.trim(),
        location: document.getElementById('location').value.trim(),
        atmosphere: document.getElementById('atmosphere').value.trim(),
        rules: rulesArray,
        additionalInfo: document.getElementById('additionalInfo').value.trim()
      };

      vscode.postMessage({ command: 'saveWorldSetting', worldSetting });
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
      }
    });
  </script>
</body>
</html>`;
  }
}
