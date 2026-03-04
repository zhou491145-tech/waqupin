import * as vscode from 'vscode';
import { logger } from '../utils/logger';
import { getMachineId } from '../auth/machineId';
import { verifyLicense, initActivationStatus, isActivatedSync, activateLicense } from '../auth/verify';

/**
 * 激活验证面板
 * 用户可以查看设备标识、输入授权码（License Key）、验证授权状态
 */
export class ActivationPanel implements vscode.WebviewViewProvider {
  public static readonly viewType = 'novelAssistant.activation';

  private _view?: vscode.WebviewView;
  
  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext
  ) {}

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
      logger.debug(`📨 收到激活验证面板消息: ${JSON.stringify(data)}`);
      
      switch (data.command) {
        case 'getMachineId':
          await this._sendMachineId();
          break;
        case 'verifyActivation':
          await this._verifyActivation(data.activationCode, data.authUrl);
          break;
        case 'copyToClipboard':
          await this._copyToClipboard(data.text);
          break;
        case 'openWebsite':
          await vscode.env.openExternal(vscode.Uri.parse(data.url));
          break;
        default:
          logger.debug(`⚠️ 未知命令: ${data.command}`);
      }
    });
  }

  private async _sendMachineId() {
    try {
      const machineId = getMachineId();
      const activationStatus = await verifyLicense(this._context);

      // 获取当前配置的验证服务器地址
      const authUrl = vscode.workspace.getConfiguration('novelAssistant').get('authUrl', 'https://waqupin.com/api/license');

      this._view?.webview.postMessage({
        command: 'machineIdLoaded',
        machineId,
        isActivated: activationStatus.success,
        message: activationStatus.message,
        authUrl: authUrl
      });
    } catch (error) {
      logger.error(`❌ 获取机器码失败: ${error}`);
      this._view?.webview.postMessage({
        command: 'error',
        message: `获取机器码失败: ${error}`
      });
    }
  }

  private async _verifyActivation(activationCode: string, authUrl?: string) {
    try {
      if (!activationCode || activationCode.trim() === '') {
        this._view?.webview.postMessage({
          command: 'verificationResult',
          success: false,
          message: '请输入授权码'
        });
        return;
      }

      // 如果用户输入了authUrl，则更新配置
      if (authUrl && authUrl.trim() !== '') {
        const config = vscode.workspace.getConfiguration('novelAssistant');
        await config.update('authUrl', authUrl.trim(), vscode.ConfigurationTarget.Global);
      }

      // 保存激活码到 VSCode globalState
      await this._context.globalState.update('novelAssistant.licenseKey', activationCode.trim().toUpperCase());

      // 激活（在线优先，失败返回更明确原因）
      const result = await activateLicense(this._context);

      if (result.success) {
        // 更新全局激活状态
        await initActivationStatus(this._context);

        vscode.window.showInformationMessage('✅ 激活成功！感谢支持。');
        this._view?.webview.postMessage({
          command: 'verificationResult',
          success: true,
          message: '激活成功！授权已生效。'
        });
      } else {
        this._view?.webview.postMessage({
          command: 'verificationResult',
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      logger.error(`❌ 验证失败: ${error}`);
      this._view?.webview.postMessage({
        command: 'verificationResult',
        success: false,
        message: `验证失败: ${error}`
      });
    }
  }

  private async _copyToClipboard(text: string) {
    try {
      await vscode.env.clipboard.writeText(text);
      vscode.window.showInformationMessage('✅ 已复制到剪贴板');
    } catch (error) {
      logger.error(`❌ 复制失败: ${error}`);
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'webview-styles', 'globals.css'));

    return `<!DOCTYPE html>
  <html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>插件激活</title>
    <link rel="stylesheet" href="${styleUri}">
  <style>
    body {
      padding: 16px;
      color: var(--vscode-foreground);
      font-size: 13px;
      line-height: 1.6;
      font-family: var(--font-family-sans);
    }

    .activation-container {
      max-width: 400px;
      margin: 0 auto;
    }

    .activation-header {
      display: flex;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    .activation-header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--vscode-foreground);
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-left: 12px;
    }

    .status-badge.activated {
      background: rgba(76, 175, 80, 0.2);
      color: #4CAF50;
    }

    .status-badge.notactivated {
      background: rgba(244, 67, 54, 0.2);
      color: #F44336;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: var(--vscode-sideBarTitle-foreground);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .form-control {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      font-size: 13px;
      font-family: 'Monaco', 'Courier New', monospace;
      box-sizing: border-box;
      transition: border-color 0.2s;
    }

    .form-control:focus {
      outline: none;
      border-color: var(--vscode-focusBorder);
    }

    .form-control:disabled {
      background: var(--vscode-disabledForeground);
      opacity: 0.5;
      cursor: not-allowed;
    }

    .copy-button {
      margin-left: 8px;
      padding: 6px 10px;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
      transition: background 0.2s;
    }

    .icon {
      display: inline-block;
      margin-right: 4px;
    }

    .copy-button:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    .input-group {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }

    .input-group .form-control {
      flex: 1;
      margin-bottom: 0;
    }

    .button-group {
      display: flex;
      gap: 8px;
      margin-top: 20px;
    }

    .btn {
      flex: 1;
      padding: 10px 16px;
      border: none;
      border-radius: 4px;
      font-size: 13px;
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

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    .btn-secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    .alert {
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 16px;
      font-size: 12px;
    }

    .alert-success {
      background: rgba(76, 175, 80, 0.15);
      color: #4CAF50;
      border-left: 3px solid #4CAF50;
    }

    .alert-error {
      background: rgba(244, 67, 54, 0.15);
      color: #F44336;
      border-left: 3px solid #F44336;
    }

    .alert-info {
      background: rgba(33, 150, 243, 0.15);
      color: #2196F3;
      border-left: 3px solid #2196F3;
    }

    .loading {
      display: inline-block;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .info-box {
      background: var(--vscode-textCodeBlock-background);
      border-left: 3px solid var(--vscode-editor-findMatchBorder);
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 16px;
      font-size: 12px;
      line-height: 1.5;
    }

    .step {
      display: flex;
      margin-bottom: 16px;
      gap: 12px;
    }

    .step-number {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      border-radius: 50%;
      font-weight: 600;
      font-size: 12px;
      flex-shrink: 0;
    }

    .step-content {
      flex: 1;
    }

    .step-title {
      font-weight: 500;
      margin-bottom: 4px;
    }

    .step-desc {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }
  </style>
</head>
<body>
  <div class="activation-container">
    <div class="activation-header">
      <h2>🔐 激活验证</h2>
      <span id="statusBadge" class="status-badge notactivated">未激活</span>
    </div>

    <div id="messageContainer"></div>

    <div class="info-box">
      <strong>📖 激活步骤:</strong>
      <div class="step">
        <div class="step-number">1</div>
        <div class="step-content">
          <div class="step-title">确认设备标识</div>
          <div class="step-desc">设备标识用于服务端绑定设备，不会暴露隐私信息</div>
        </div>
      </div>
      <div class="step">
        <div class="step-number">2</div>
        <div class="step-content">
          <div class="step-title">获取授权码</div>
          <div class="step-desc">购买后会获得授权码（License Key）</div>
        </div>
      </div>
      <div class="step">
        <div class="step-number">3</div>
        <div class="step-content">
          <div class="step-title">粘贴并验证</div>
          <div class="step-desc">将授权码粘贴到下方输入框进行验证</div>
        </div>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">
        🖥️ 您的设备标识
      </label>
      <div class="input-group">
        <input type="text" id="machineId" class="form-control" disabled placeholder="加载中...">
        <button class="copy-button" id="copyMachineId">
          <span class="icon">📋</span> 复制
        </button>
      </div>
      <div style="margin-top: 6px; font-size: 11px; color: var(--vscode-descriptionForeground);">
        💡 这是您的唯一设备标识，基于硬件信息哈希生成
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">
        🔑 授权码 / License Key
      </label>
      <input type="text" id="activationCode" class="form-control" placeholder="请输入授权码">
      <div style="margin-top: 6px; font-size: 11px; color: var(--vscode-descriptionForeground);">
        📝 购买后获得的授权码（例如：LZW2-ABC123-DEF456）
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">
        🌐 验证服务器地址
      </label>
      <input type="text" id="authUrl" class="form-control" placeholder="例如：https://waqupin.com/api/license">
      <div style="margin-top: 6px; font-size: 11px; color: var(--vscode-descriptionForeground);">
        💡 默认使用内置服务器，也可自定义验证服务器
      </div>
    </div>

    <div class="button-group">
      <button class="btn btn-primary" id="verifyBtn">
        <span id="verifyBtnText">验证授权码</span>
      </button>
      <button class="btn btn-secondary" id="visitWebsiteBtn">
        <span class="icon">🌐</span> 访问官网
      </button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    // 页面加载时获取机器码
    document.addEventListener('DOMContentLoaded', () => {
      vscode.postMessage({ command: 'getMachineId' });
    });

    // 处理服务器消息
    window.addEventListener('message', (event) => {
      const data = event.data;
      
      switch (data.command) {
        case 'machineIdLoaded':
          handleMachineIdLoaded(data);
          break;
        case 'verificationResult':
          handleVerificationResult(data);
          break;
        case 'error':
          showAlert('error', data.message);
          break;
      }
    });

    function handleMachineIdLoaded(data) {
      document.getElementById('machineId').value = data.machineId;

      // 填充验证服务器地址
      if (data.authUrl) {
        document.getElementById('authUrl').value = data.authUrl;
      }

      const statusBadge = document.getElementById('statusBadge');
      if (data.isActivated) {
        statusBadge.textContent = '✅ 已激活';
        statusBadge.className = 'status-badge activated';
        showAlert('success', '✅ 您的插件已激活，所有功能可用！');
      } else {
        statusBadge.textContent = '❌ 未激活';
        statusBadge.className = 'status-badge notactivated';
      }
    }

    function handleVerificationResult(data) {
      const btn = document.getElementById('verifyBtn');
      btn.disabled = false;
      document.getElementById('verifyBtnText').textContent = '验证授权码';
      
      if (data.success) {
        showAlert('success', data.message);
        const statusBadge = document.getElementById('statusBadge');
        statusBadge.textContent = '✅ 已激活';
        statusBadge.className = 'status-badge activated';
      } else {
        showAlert('error', data.message);
      }
    }

    function showAlert(type, message) {
      const container = document.getElementById('messageContainer');
      container.innerHTML = \`<div class="alert alert-\${type}">\${message}</div>\`;
    }

    // 复制按钮
    document.getElementById('copyMachineId').addEventListener('click', () => {
      const machineId = document.getElementById('machineId').value;
      if (machineId) {
        vscode.postMessage({
          command: 'copyToClipboard',
          text: machineId
        });
      }
    });

    // 验证按钮
    document.getElementById('verifyBtn').addEventListener('click', () => {
      const activationCode = document.getElementById('activationCode').value;
      const authUrl = document.getElementById('authUrl').value;

      if (!activationCode.trim()) {
        showAlert('error', '请输入授权码');
        return;
      }

      const btn = document.getElementById('verifyBtn');
      btn.disabled = true;
      document.getElementById('verifyBtnText').innerHTML = '<span class="loading icon">🔄</span> 验证中...';

      vscode.postMessage({
        command: 'verifyActivation',
        activationCode: activationCode.trim(),
        authUrl: authUrl.trim()
      });
    });

    // 访问官网按钮
    document.getElementById('visitWebsiteBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'openWebsite', url: 'https://waqupin.com/' });
    });

    // 回车键验证
    document.getElementById('activationCode').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('verifyBtn').click();
      }
    });
  </script>
</body>
</html>`;
  }
}
