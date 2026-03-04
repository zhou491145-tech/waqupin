import * as vscode from 'vscode';
import { projectConfigRepository } from '../repositories';
import { logger } from '../utils/logger';

export class ProjectConfigPanel {
  public static readonly viewType = 'novelAssistant.projectConfig';

  private _view?: vscode.WebviewView;
  private _panel?: vscode.WebviewPanel;
  private static _instance: ProjectConfigPanel | undefined;

  private constructor(private readonly _extensionUri: vscode.Uri) {}

  public static getInstance(extensionUri: vscode.Uri): ProjectConfigPanel {
    if (!ProjectConfigPanel._instance) {
      ProjectConfigPanel._instance = new ProjectConfigPanel(extensionUri);
    }
    return ProjectConfigPanel._instance;
  }

  public show() {
    if (this._panel) {
      this._panel.reveal(vscode.ViewColumn.Active);
      return;
    }

    this._panel = vscode.window.createWebviewPanel(
      ProjectConfigPanel.viewType,
      '⚙️ 项目配置',
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        localResourceRoots: [this._extensionUri],
        retainContextWhenHidden: true
      }
    );

    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
    this._sendProjectConfig();

    this._panel.webview.onDidReceiveMessage(async (data) => {
      await this._handleWebviewMessage(data);
    });

    this._panel.onDidDispose(() => {
      this._panel = undefined;
    });
  }

  public static createOrShow(extensionUri: vscode.Uri): vscode.WebviewPanel {
    const instance = ProjectConfigPanel.getInstance(extensionUri);
    instance.show();
    return instance._panel!;
  }

  private _initializeWebviewPanel(panel: vscode.WebviewPanel): void {
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
    this._sendProjectConfig();

    webviewView.webview.onDidReceiveMessage(async (data) => {
      await this._handleWebviewMessage(data);
    });
  }

  private _sendMessageToWebview(message: any) {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
    if (this._panel) {
      this._panel.webview.postMessage(message);
    }
  }

  private async _handleWebviewMessage(data: any): Promise<void> {
    switch (data.command) {
      case 'saveProjectConfig':
        await this._saveProjectConfig(data.config);
        break;
      case 'getProjectConfig':
        this._sendProjectConfig();
        break;
      default:
        logger.debug(`⚠️ 未知命令: ${data.command}`);
    }
  }

  private _sendProjectConfig() {
    const config = projectConfigRepository.load();
    this._sendMessageToWebview({
      command: 'updateProjectConfig',
      config: config
    });
  }

  private async _saveProjectConfig(config: any): Promise<void> {
    try {
      projectConfigRepository.save(config);
      this._sendMessageToWebview({
        command: 'saveSuccess',
        message: '项目配置保存成功'
      });
      vscode.window.showInformationMessage('项目配置保存成功');
    } catch (error) {
      logger.error(`❌ 保存项目配置失败: ${error}`);
      this._sendMessageToWebview({
        command: 'saveError',
        message: `保存失败: ${error}`
      });
      vscode.window.showErrorMessage(`保存项目配置失败: ${error}`);
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>项目配置</title>
  <style>
    body {
      padding: 20px;
      color: var(--vscode-foreground);
      font-size: 14px;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      background-color: var(--vscode-editor-background);
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    .header h2 {
      margin: 0;
      font-size: 20px;
    }
    
    .section {
      margin-bottom: 24px;
      background: var(--vscode-editor-background);
      padding: 16px;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 8px;
    }
    
    .section-title {
      font-weight: 600;
      margin-bottom: 16px;
      color: var(--vscode-editor-foreground);
      font-size: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .section-title::before {
      content: '';
      display: inline-block;
      width: 4px;
      height: 16px;
      background: var(--vscode-textLink-foreground);
      border-radius: 2px;
    }
    
    .form-row {
      margin-bottom: 16px;
    }
    
    label {
      display: block;
      margin-bottom: 8px;
      font-size: 13px;
      font-weight: 500;
      color: var(--vscode-descriptionForeground);
    }
    
    input[type="text"], input[type="number"], textarea, select {
      width: 100%;
      padding: 10px 12px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      font-size: 14px;
      box-sizing: border-box;
      font-family: inherit;
    }
    
    input:focus, textarea:focus, select:focus {
      outline: 1px solid var(--vscode-focusBorder);
      border-color: var(--vscode-focusBorder);
    }
    
    textarea {
      resize: vertical;
      min-height: 80px;
    }
    
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    
    @media (max-width: 768px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
    }
    
    .button-group {
      display: flex;
      gap: 10px;
    }

    button {
      padding: 8px 16px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s ease;
    }
    
    button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    
    button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    button.secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    
    .status {
      padding: 12px;
      margin-bottom: 20px;
      border-radius: 4px;
      font-size: 13px;
      display: none;
    }
    
    .status.show {
      display: block;
    }
    
    .status.success {
      background: var(--vscode-testing-iconPassed-background);
      color: var(--vscode-testing-iconPassed);
      border: 1px solid var(--vscode-testing-iconPassed-border);
    }
    
    .status.error {
      background: var(--vscode-error-background);
      color: var(--vscode-errorForeground);
      border: 1px solid var(--vscode-error-border);
    }
    
    .hint {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-top: 6px;
      display: block;
      font-style: italic;
    }

    .view-row {
      display: flex;
      margin-bottom: 12px;
      border-bottom: 1px solid var(--vscode-panel-border);
      padding-bottom: 8px;
    }
    .view-label {
      width: 120px;
      font-weight: bold;
      color: var(--vscode-descriptionForeground);
    }
    .view-value {
      flex: 1;
    }
    .edit-mode {
      display: none;
    }
    .edit-mode.active {
      display: block;
    }
    .view-mode.hidden {
      display: none;
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>⚙️ 项目配置</h2>
    <div class="button-group">
      <button id="editBtn">编辑</button>
      <button id="saveBtn" class="edit-mode">保存配置</button>
      <button id="cancelBtn" class="edit-mode secondary">取消</button>
    </div>
  </div>
  
  <div class="status" id="status"></div>
  
  <div id="viewMode" class="view-mode">
    <div class="section">
      <div class="section-title">📋 基本信息</div>
      <div class="view-row"><div class="view-label">书名</div><div id="viewTitle" class="view-value">-</div></div>
      <div class="view-row"><div class="view-label">主题</div><div id="viewTheme" class="view-value">-</div></div>
      <div class="view-row"><div class="view-label">小说类型</div><div id="viewGenre" class="view-value">-</div></div>
    </div>

    <div class="section">
      <div class="section-title">✍️ 创作参数</div>
      <div class="view-row"><div class="view-label">目标字数</div><div id="viewTargetWordCount" class="view-value">-</div></div>
      <div class="view-row"><div class="view-label">叙述视角</div><div id="viewNarrativePerspective" class="view-value">-</div></div>
      <div class="view-row"><div class="view-label">目标读者</div><div id="viewTargetAudience" class="view-value">-</div></div>
    </div>

    <div class="section">
      <div class="section-title">📖 剧情设定</div>
      <div class="view-row"><div class="view-label">核心冲突</div><div id="viewCoreConflict" class="view-value">-</div></div>
      <div class="view-row"><div class="view-label">主要情节</div><div id="viewMainPlot" class="view-value">-</div></div>
    </div>
  </div>

  <div id="editMode" class="edit-mode">
    <div class="section">
      <div class="section-title">📋 基本信息</div>
      <div class="form-row">
        <label for="title">书名 *</label>
        <input type="text" id="title" placeholder="请输入小说书名">
      </div>
      <div class="form-row">
        <label for="theme">主题 *</label>
        <input type="text" id="theme" placeholder="例如：成长、复仇、爱情、冒险...">
      </div>
      <div class="form-row">
        <label for="genre">小说类型 *</label>
        <select id="genre">
          <option value="">请选择小说类型</option>
          <option value="玄幻">玄幻</option>
          <option value="都市">都市</option>
          <option value="言情">言情</option>
          <option value="科幻">科幻</option>
          <option value="武侠">武侠</option>
          <option value="仙侠">仙侠</option>
          <option value="历史">历史</option>
          <option value="军事">军事</option>
          <option value="悬疑">悬疑</option>
          <option value="恐怖">恐怖</option>
          <option value="其他">其他</option>
        </select>
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">✍️ 创作参数</div>
      <div class="form-grid">
        <div class="form-row">
          <label for="targetWordCount">每章目标字数 *</label>
          <input type="number" id="targetWordCount" min="100" max="50000" placeholder="请输入每章目标字数">
          <span class="hint">建议范围：1000-5000字</span>
        </div>
        <div class="form-row">
          <label for="narrativePerspective">叙述视角 *</label>
          <select id="narrativePerspective">
            <option value="">请选择叙述视角</option>
            <option value="第一人称">第一人称（我）</option>
            <option value="第三人称">第三人称（他/她）</option>
            <option value="混合视角">混合视角</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <label for="targetAudience">目标读者</label>
        <input type="text" id="targetAudience" placeholder="例如：青少年、成人、全年龄...">
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">📖 剧情设定</div>
      <div class="form-row">
        <label for="coreConflict">核心冲突</label>
        <textarea id="coreConflict" placeholder="描述故事的核心矛盾和冲突，例如：主角与反派的对抗、主角内心的挣扎..."></textarea>
        <span class="hint">核心冲突将指导章节生成的剧情推进方向</span>
      </div>
      <div class="form-row">
        <label for="mainPlot">主要情节</label>
        <textarea id="mainPlot" placeholder="描述故事的主要情节线和整体走向..."></textarea>
        <span class="hint">主要情节将作为章节创作的宏观指导</span>
      </div>
    </div>
  </div>
  
  <script>
    const vscode = acquireVsCodeApi();
    let currentConfig = {};

    const viewMode = document.getElementById('viewMode');
    const editMode = document.getElementById('editMode');
    const editBtn = document.getElementById('editBtn');
    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    
    editBtn.addEventListener('click', () => {
      viewMode.classList.add('hidden');
      editMode.classList.add('active');
      editBtn.style.display = 'none';
      saveBtn.style.display = 'block';
      cancelBtn.style.display = 'block';
    });

    cancelBtn.addEventListener('click', () => {
      viewMode.classList.remove('hidden');
      editMode.classList.remove('active');
      editBtn.style.display = 'block';
      saveBtn.style.display = 'none';
      cancelBtn.style.display = 'none';
      showStatus('', 'none');
    });

    saveBtn.addEventListener('click', () => {
      const config = {
        id: currentConfig.id || 'PROJECT001',
        title: document.getElementById('title').value.trim(),
        theme: document.getElementById('theme').value.trim(),
        genre: document.getElementById('genre').value,
        targetWordCount: parseInt(document.getElementById('targetWordCount').value) || 2500,
        narrativePerspective: document.getElementById('narrativePerspective').value,
        targetAudience: document.getElementById('targetAudience').value.trim(),
        coreConflict: document.getElementById('coreConflict').value.trim(),
        mainPlot: document.getElementById('mainPlot').value.trim(),
        createdAt: currentConfig.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      if (!config.title) {
        showStatus('请输入书名', 'error');
        return;
      }
      
      if (!config.theme) {
        showStatus('请输入主题', 'error');
        return;
      }
      
      if (!config.genre) {
        showStatus('请选择小说类型', 'error');
        return;
      }
      
      if (!config.targetWordCount || config.targetWordCount < 100) {
        showStatus('请输入有效的目标字数', 'error');
        return;
      }
      
      if (!config.narrativePerspective) {
        showStatus('请选择叙述视角', 'error');
        return;
      }
      
      showStatus('保存中...', 'info');
      saveBtn.disabled = true;
      
      vscode.postMessage({
        command: 'saveProjectConfig',
        config: config
      });
    });
    
    function showStatus(message, type) {
      const status = document.getElementById('status');
      if (type === 'none') {
        status.style.display = 'none';
        return;
      }
      status.textContent = message;
      status.className = 'status show ' + type;
    }
    
    window.addEventListener('message', (event) => {
      const message = event.data;
      switch (message.command) {
        case 'updateProjectConfig':
          const config = message.config || {};
          currentConfig = config;
          
          document.getElementById('viewTitle').textContent = config.title || '未设置';
          document.getElementById('viewTheme').textContent = config.theme || '未设置';
          document.getElementById('viewGenre').textContent = config.genre || '未设置';
          document.getElementById('viewTargetWordCount').textContent = config.targetWordCount || '2500';
          document.getElementById('viewNarrativePerspective').textContent = config.narrativePerspective || '未设置';
          document.getElementById('viewTargetAudience').textContent = config.targetAudience || '未设置';
          document.getElementById('viewCoreConflict').textContent = config.coreConflict || '未设置';
          document.getElementById('viewMainPlot').textContent = config.mainPlot || '未设置';

          document.getElementById('title').value = config.title || '';
          document.getElementById('theme').value = config.theme || '';
          document.getElementById('genre').value = config.genre || '';
          document.getElementById('targetWordCount').value = config.targetWordCount || 2500;
          document.getElementById('narrativePerspective').value = config.narrativePerspective || '';
          document.getElementById('targetAudience').value = config.targetAudience || '';
          document.getElementById('coreConflict').value = config.coreConflict || '';
          document.getElementById('mainPlot').value = config.mainPlot || '';
          break;
        case 'saveSuccess':
          showStatus(message.message, 'success');
          saveBtn.disabled = false;
          setTimeout(() => {
            viewMode.classList.remove('hidden');
            editMode.classList.remove('active');
            editBtn.style.display = 'block';
            saveBtn.style.display = 'none';
            cancelBtn.style.display = 'none';
            showStatus('', 'none');
          }, 1000);
          break;
        case 'saveError':
          showStatus(message.message, 'error');
          saveBtn.disabled = false;
          break;
      }
    });
    
    vscode.postMessage({ command: 'getProjectConfig' });
  </script>
</body>
</html>`;
  }
}
