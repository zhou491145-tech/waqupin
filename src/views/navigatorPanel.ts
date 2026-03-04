import * as vscode from 'vscode';
import { logger } from '../utils/logger';

/**
 * 导航面板 - 侧边栏入口
 * 负责统一管理所有功能的入口导航
 */
export class NavigatorPanel implements vscode.WebviewViewProvider {
  public static readonly viewType = 'aiNovelAssistant.navigator';

  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

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
      logger.debug(`📨 收到导航面板消息: ${JSON.stringify(data)}`);
      
      switch (data.command) {
        case 'runCommand':
          await this._runCommand(data.commandName, data.args);
          break;
        default:
          logger.debug(`⚠️ 未知命令: ${data.command}`);
      }
    });
  }

  private async _runCommand(commandName: string, args?: any): Promise<void> {
    logger.log(`▶ 导航执行命令: ${commandName}`);
    try {
      if (args) {
        await vscode.commands.executeCommand(commandName, args);
      } else {
        await vscode.commands.executeCommand(commandName);
      }
    } catch (error) {
      logger.error(`❌ 执行命令失败: ${error}`);
      vscode.window.showErrorMessage(`执行命令失败: ${commandName}`);
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'webview-styles', 'globals.css'));

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>小说助手导航</title>
  <link rel="stylesheet" href="${styleUri}">
  <style>
    body {
      padding: 12px;
      color: var(--vscode-foreground);
      font-size: 13px;
      line-height: 1.6;
      font-family: var(--font-family-sans);
    }

    .page-enter {
      animation: fadeInUp 0.4s var(--ease-out);
    }

    .section {
      margin-bottom: 16px;
      animation: fadeInLeft 0.3s var(--ease-out) both;
    }

    .section:nth-child(1) { animation-delay: 0ms; }
    .section:nth-child(2) { animation-delay: 50ms; }
    .section:nth-child(3) { animation-delay: 100ms; }
    .section:nth-child(4) { animation-delay: 150ms; }

    .section-title {
      font-weight: var(--font-weight-semibold);
      margin-bottom: 8px;
      color: var(--vscode-sideBarTitle-foreground);
      font-size: 11px;
      letter-spacing: var(--letter-spacing-wide);
      text-transform: uppercase;
      padding-left: 8px;
      border-left: 3px solid var(--module-nav-primary);
    }

    .nav-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      padding: 6px 12px;
      cursor: pointer;
      border-radius: var(--radius-md);
      background: transparent;
      color: var(--vscode-sideBar-foreground);
      text-decoration: none;
      transition: all var(--duration-fast) var(--ease-out);
      border: 1px solid transparent;
      position: relative;
      overflow: hidden;
    }

    .nav-item::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 3px;
      height: 100%;
      background: var(--module-nav-primary);
      transform: scaleY(0);
      transition: transform var(--duration-fast) var(--ease-out);
    }

    .nav-item:hover {
      background: var(--vscode-list-hoverBackground);
      border-color: var(--color-primary-200);
      transform: translateX(4px);
    }

    .nav-item:hover::before {
      transform: scaleY(1);
    }

    .nav-icon {
      margin-right: 10px;
      font-size: 15px;
      width: 20px;
      text-align: center;
      transition: transform var(--duration-fast) var(--ease-out);
    }

    .nav-item:hover .nav-icon {
      transform: scale(1.2);
    }

    .nav-label {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-weight: var(--font-weight-normal);
    }

    .divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--vscode-sideBarSectionHeader-border), transparent);
      margin: 12px 0;
      opacity: 0.6;
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes fadeInLeft {
      from {
        opacity: 0;
        transform: translateX(-10px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
  </style>
</head>
<body>

  <div class="page-enter">
    <div class="section">
      <div class="section-title">🚀 创作中心</div>
      <div class="nav-list">
        <div class="nav-item" onclick="sendMessage('novelAssistant.generateChapter')">
          <span class="nav-icon">✨</span>
          <span class="nav-label">章节生成</span>
        </div>
        <div class="nav-item" onclick="sendMessage('novelAssistant.analyzeChapter')">
          <span class="nav-icon">🔍</span>
          <span class="nav-label">分析当前章节</span>
        </div>
      </div>
    </div>

    <div class="divider"></div>

    <div class="section">
      <div class="section-title">📋 核心管理</div>
      <div class="nav-list">
        <div class="nav-item" onclick="sendMessage('novelAssistant.openWorldSetting')">
          <span class="nav-icon">🌍</span>
          <span class="nav-label">世界观设定</span>
        </div>
        <div class="nav-item" onclick="sendMessage('novelAssistant.openOutline')">
          <span class="nav-icon">📑</span>
          <span class="nav-label">大纲编排</span>
        </div>
        <div class="nav-item" onclick="sendMessage('novelAssistant.showRelationshipGraph')">
          <span class="nav-icon">🕸️</span>
          <span class="nav-label">关系图谱</span>
        </div>
        <div class="nav-item" onclick="sendMessage('novelAssistant.openWritingStyles')">
          <span class="nav-icon">🧪</span>
          <span class="nav-label">风格实验室</span>
        </div>
      </div>
    </div>

    <div class="divider"></div>

    <div class="section">
      <div class="section-title">📂 项目数据</div>
      <div class="nav-list">
        <div class="nav-item" onclick="sendMessage('novelAssistant.showCharacterList')">
          <span class="nav-icon">👥</span>
          <span class="nav-label">人物卡片</span>
        </div>
        <div class="nav-item" onclick="sendMessage('novelAssistant.showForeshadows')">
          <span class="nav-icon">🎭</span>
          <span class="nav-label">伏笔看板</span>
        </div>
        <div class="nav-item" onclick="sendMessage('novelAssistant.openSummary')">
          <span class="nav-icon">📝</span>
          <span class="nav-label">章节摘要</span>
        </div>
      </div>
    </div>

    <div class="divider"></div>

    <div class="section">
      <div class="section-title">⚙️ 配置</div>
      <div class="nav-list">
        <div class="nav-item" onclick="sendMessage('novelAssistant.openProjectConfig')">
          <span class="nav-icon">🛠️</span>
          <span class="nav-label">项目配置</span>
        </div>
        <div class="nav-item" onclick="sendMessage('novelAssistant.showActivationPanel')">
          <span class="nav-icon">🔐</span>
          <span class="nav-label">激活验证</span>
        </div>
         <div class="nav-item" onclick="sendMessage('workbench.action.openSettings', 'novelAssistant')">
          <span class="nav-icon">⚙️</span>
          <span class="nav-label">API 设置</span>
        </div>
        <div class="nav-item" onclick="sendMessage('novelAssistant.testApi')">
          <span class="nav-icon">🔌</span>
          <span class="nav-label">测试 API 连接</span>
        </div>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function sendMessage(command, args) {
      vscode.postMessage({
        command: 'runCommand',
        commandName: command,
        args: args
      });
    }
  </script>
</body>
</html>`;
  }
}
