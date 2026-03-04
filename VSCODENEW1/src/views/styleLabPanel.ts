import * as vscode from 'vscode';
import { writingStylesService, UserStylePackage } from '../services/writingStylesService';
import { logger } from '../utils/logger';

export class StyleLabPanel {
  public static readonly viewType = 'novelAssistant.styleLab';
  private static _instance: StyleLabPanel | undefined;
  private _panel?: vscode.WebviewPanel;
  private _currentPkgId?: string;

  private constructor(private readonly _extensionUri: vscode.Uri) {}

  public static getInstance(extensionUri: vscode.Uri): StyleLabPanel {
    if (!StyleLabPanel._instance) {
      StyleLabPanel._instance = new StyleLabPanel(extensionUri);
    }
    return StyleLabPanel._instance;
  }

  public show(pkgId: string) {
    this._currentPkgId = pkgId;
    
    if (this._panel) {
      this._panel.reveal(vscode.ViewColumn.Active);
      this._updateContent();
      return;
    }

    this._panel = vscode.window.createWebviewPanel(
      StyleLabPanel.viewType,
      '🧪 风格实验室',
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
        case 'refresh':
          this._updateContent();
          break;
        case 'save':
          this._saveStyle(data.content);
          break;
        case 'preview':
          await this._previewStyle(data.content, data.sampleText);
          break;
      }
    });

    this._panel.onDidDispose(() => {
      this._panel = undefined;
      this._currentPkgId = undefined;
    });

    this._updateContent();
  }

  private _updateContent() {
    if (!this._panel || !this._currentPkgId) return;

    const allPkgs = writingStylesService.getAllPackages();
    const pkg = allPkgs.find(p => p.id === this._currentPkgId);

    if (pkg) {
      this._panel.webview.postMessage({
        command: 'loadData',
        pkg: pkg
      });
    }
  }

  private _saveStyle(content: string) {
    if (this._currentPkgId) {
      writingStylesService.updateCustomPackage(this._currentPkgId, {
        styleContent: content
      });
      vscode.window.showInformationMessage('风格已保存');
    }
  }

  private async _previewStyle(content: string, sampleText: string) {
    if (!this._panel) return;

    this._panel.webview.postMessage({ command: 'previewStart' });

    try {
      await writingStylesService.previewStyle(content, sampleText, (chunk) => {
        this._panel?.webview.postMessage({
          command: 'previewChunk',
          chunk: chunk
        });
      });
      this._panel.webview.postMessage({ command: 'previewEnd' });
    } catch (error) {
      this._panel.webview.postMessage({ 
        command: 'previewError', 
        error: String(error) 
      });
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <style>
    :root {
      --card-bg: var(--vscode-editor-background);
      --card-border: var(--vscode-panel-border);
      --header-bg: var(--vscode-sideBar-background);
    }
    body { 
      height: 100vh; 
      margin: 0; 
      padding: 0; 
      background-color: var(--vscode-editor-background); 
      color: var(--vscode-editor-foreground); 
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      display: flex;
      flex-direction: column;
    }
    .top-header {
      padding: 12px 24px;
      background: var(--header-bg);
      border-bottom: 1px solid var(--card-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .top-header h2 { margin: 0; font-size: 18px; font-weight: 600; }
    
    .main-container {
      display: flex;
      flex: 1;
      overflow: hidden;
    }
    
    .left-panel, .right-panel {
      width: 50%;
      display: flex;
      flex-direction: column;
      padding: 20px;
      gap: 20px;
      overflow-y: auto;
    }
    
    .left-panel {
      border-right: 1px solid var(--card-border);
    }
    
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .card-title {
      font-weight: 600;
      font-size: 14px;
      color: var(--vscode-textLink-foreground);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    textarea { 
      width: 100%; 
      background: var(--vscode-input-background); 
      color: var(--vscode-input-foreground); 
      border: 1px solid var(--vscode-input-border); 
      border-radius: 4px;
      padding: 12px; 
      font-family: var(--vscode-editor-font-family); 
      resize: vertical;
      box-sizing: border-box;
      line-height: 1.5;
    }
    textarea:focus { outline: 1px solid var(--vscode-focusBorder); }
    
    .hint { font-size: 12px; color: var(--vscode-descriptionForeground); line-height: 1.4; }
    
    .button-primary { 
      background: var(--vscode-button-background); 
      color: var(--vscode-button-foreground); 
      border: none; 
      padding: 10px 20px; 
      cursor: pointer; 
      border-radius: 4px; 
      font-weight: 500;
      transition: opacity 0.2s;
    }
    .button-primary:hover { background: var(--vscode-button-hoverBackground); }
    .button-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    
    .preview-box { 
      flex: 1; 
      border: 1px solid var(--card-border); 
      border-radius: 4px;
      padding: 16px; 
      overflow-y: auto; 
      background: var(--vscode-editor-inactiveSelectionBackground); 
      white-space: pre-wrap; 
      line-height: 1.7;
      font-size: 14px;
    }
    
    .status-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 8px;
    }
    
    .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .dot-idle { background: var(--vscode-descriptionForeground); }
    .dot-running { background: var(--vscode-testing-iconPassed); animation: pulse 1s infinite; }
    
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.4; }
      100% { opacity: 1; }
    }
  </style>
</head>
<body>
  <div class="top-header">
    <h2 id="pkg-name">🧪 风格实验室</h2>
    <button class="button-primary" onclick="saveStyle()">💾 保存配置</button>
  </div>

  <div class="main-container">
    <div class="left-panel">
      <div class="card">
        <div class="card-title">📝 风格提示词 (Style Instructions)</div>
        <textarea id="style-content" style="height: 350px;" placeholder="描述您想要的写作风格..."></textarea>
        <div class="hint">
          <b>建议包含：</b><br>
          • 句式特征（如：多用短句、排比、倒装）<br>
          • 叙事节奏（如：快节奏、细腻铺垫、大量留白）<br>
          • 用词偏好（如：词藻华丽、平实有力、古风古韵）<br>
          • 氛围营造（如：阴冷诡异、热血激昂）
        </div>
      </div>
    </div>

    <div class="right-panel">
      <div class="card">
        <div class="card-title">🧪 试运行测试</div>
        <div class="hint">输入一段简单的原稿，测试风格转换效果：</div>
        <textarea id="sample-text" style="height: 100px;">主角走进酒馆，点了一杯酒，发现有人在盯着他。</textarea>
        
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <button class="button-primary" onclick="startPreview()" id="preview-btn">▶ 开始测试 (Run Test)</button>
          <div class="status-bar" id="status-container">
            <span class="dot dot-idle" id="status-dot"></span>
            <span class="hint" id="status-text">就绪</span>
          </div>
        </div>
      </div>

      <div class="card" style="flex: 1;">
        <div class="card-title">✨ 效果预览</div>
        <div id="preview-result" class="preview-box">结果将在这里实时流式输出...</div>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const styleInput = document.getElementById('style-content');
    const sampleInput = document.getElementById('sample-text');
    const previewBox = document.getElementById('preview-result');
    const statusText = document.getElementById('status-text');
    const statusDot = document.getElementById('status-dot');
    const previewBtn = document.getElementById('preview-btn');
    const pkgName = document.getElementById('pkg-name');

    window.addEventListener('message', event => {
      const msg = event.data;
      switch (msg.command) {
        case 'loadData':
          styleInput.value = msg.pkg.styleContent;
          pkgName.textContent = '🧪 正在编辑: ' + msg.pkg.name;
          break;
        case 'previewStart':
          previewBox.textContent = '';
          statusText.textContent = '正在生成流式反馈...';
          statusDot.className = 'dot dot-running';
          previewBtn.disabled = true;
          break;
        case 'previewChunk':
          if (previewBox.textContent === '结果将在这里实时流式输出...') previewBox.textContent = '';
          previewBox.textContent += msg.chunk;
          previewBox.scrollTop = previewBox.scrollHeight;
          break;
        case 'previewEnd':
          statusText.textContent = '生成完成';
          statusDot.className = 'dot dot-idle';
          previewBtn.disabled = false;
          break;
        case 'previewError':
          statusText.textContent = '错误: ' + msg.error;
          statusDot.className = 'dot';
          statusDot.style.background = 'var(--vscode-errorForeground)';
          previewBtn.disabled = false;
          break;
      }
    });

    function saveStyle() {
      vscode.postMessage({
        command: 'save',
        content: styleInput.value
      });
    }

    function startPreview() {
      vscode.postMessage({
        command: 'preview',
        content: styleInput.value,
        sampleText: sampleInput.value
      });
    }

    // 初始加载
    vscode.postMessage({ command: 'refresh' });
  </script>
</body>
</html>`;
  }
}
