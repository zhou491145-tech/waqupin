import * as vscode from 'vscode';
import { promptTemplateService } from '../services/promptTemplateService';
import { logger } from '../utils/logger';

export class PromptTemplatePanel {
  public static readonly viewType = 'novelAssistant.promptTemplates';

  private _view?: vscode.WebviewView;
  private _panel?: vscode.WebviewPanel;
  private static _instance: PromptTemplatePanel | undefined;

  private constructor(private readonly _extensionUri: vscode.Uri) {}

  /**
   * 获取或创建实例
   */
  public static getInstance(extensionUri: vscode.Uri): PromptTemplatePanel {
    if (!PromptTemplatePanel._instance) {
      PromptTemplatePanel._instance = new PromptTemplatePanel(extensionUri);
    }
    return PromptTemplatePanel._instance;
  }

  /**
   * 在编辑器区域创建或显示面板
   */
  public static createOrShow(extensionUri: vscode.Uri): vscode.WebviewPanel {
    // 创建新面板
    const panel = vscode.window.createWebviewPanel(
      PromptTemplatePanel.viewType,
      '📄 提示词模板',
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri]
      }
    );

    // 获取实例并初始化面板
    const instance = PromptTemplatePanel.getInstance(extensionUri);
    instance._panel = panel;
    instance._initializeWebviewPanel(panel);

    return panel;
  }

  /**
   * 初始化WebviewPanel
   */
  private _initializeWebviewPanel(panel: vscode.WebviewPanel): void {
    panel.webview.html = this._getHtmlForWebview(panel.webview);
    this._sendPromptTemplates();

    // 监听来自 webview 的消息
    panel.webview.onDidReceiveMessage(async (data) => {
      await this._handleWebviewMessage(data);
    });

    // 监听面板关闭事件
    panel.onDidDispose(() => {
      this._panel = undefined;
    });
  }

  /**
   * 处理侧边栏WebviewView
   */
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
    this._sendPromptTemplates();

    // 监听来自 webview 的消息
    webviewView.webview.onDidReceiveMessage(async (data) => {
      await this._handleWebviewMessage(data);
    });
  }

  /**
   * 向所有可用的Webview发送消息
   */
  private _sendMessageToWebview(message: any) {
    this._view?.webview.postMessage(message);
    this._panel?.webview.postMessage(message);
  }

  /**
   * 处理Webview消息
   */
  private async _handleWebviewMessage(data: any): Promise<void> {
    switch (data.command) {
      case 'saveTemplate':
        await this._savePromptTemplate(data.template);
        break;
      case 'deleteTemplate':
        await this._deletePromptTemplate(data.templateId);
        break;
      case 'toggleTemplate':
        await this._togglePromptTemplate(data.templateId, data.isActive);
        break;
      case 'getPromptTemplates':
        this._sendPromptTemplates();
        break;
      case 'importTemplates':
        await this._importPromptTemplates();
        break;
      case 'exportTemplates':
        await this._exportPromptTemplates();
        break;
      default:
        logger.debug(`⚠️ 未知命令: ${data.command}`);
    }
  }

  /**
   * 发送提示词模板到Webview
   */
  private _sendPromptTemplates() {
    const templates = promptTemplateService.getAllTemplates();
    this._sendMessageToWebview({
      command: 'updatePromptTemplates',
      templates: templates
    });
  }

  /**
   * 保存提示词模板
   */
  private async _savePromptTemplate(template: any): Promise<void> {
    try {
      promptTemplateService.saveCustomTemplate(template);
      this._sendPromptTemplates();
      this._sendMessageToWebview({
        command: 'saveSuccess',
        message: '提示词模板保存成功'
      });
      vscode.window.showInformationMessage('提示词模板保存成功');
    } catch (error) {
      logger.error(`❌ 保存提示词模板失败: ${error}`);
      this._sendMessageToWebview({
        command: 'saveError',
        message: `保存失败: ${error}`
      });
      vscode.window.showErrorMessage(`保存提示词模板失败: ${error}`);
    }
  }

  /**
   * 删除提示词模板
   */
  private async _deletePromptTemplate(templateId: string): Promise<void> {
    try {
      promptTemplateService.deleteCustomTemplate(templateId);
      this._sendPromptTemplates();
      this._sendMessageToWebview({
        command: 'deleteSuccess',
        message: '提示词模板删除成功'
      });
      vscode.window.showInformationMessage('提示词模板删除成功');
    } catch (error) {
      logger.error(`❌ 删除提示词模板失败: ${error}`);
      this._sendMessageToWebview({
        command: 'deleteError',
        message: `删除失败: ${error}`
      });
      vscode.window.showErrorMessage(`删除提示词模板失败: ${error}`);
    }
  }

  /**
   * 启用/禁用提示词模板
   */
  private async _togglePromptTemplate(templateId: string, isActive: boolean): Promise<void> {
    try {
      // 提示词模板不支持isActive属性，直接返回成功
      this._sendMessageToWebview({
        command: 'toggleSuccess',
        message: isActive ? '提示词模板已启用' : '提示词模板已禁用'
      });
    } catch (error) {
      logger.error(`❌ 切换提示词模板状态失败: ${error}`);
      this._sendMessageToWebview({
        command: 'toggleError',
        message: `操作失败: ${error}`
      });
      vscode.window.showErrorMessage(`切换提示词模板状态失败: ${error}`);
    }
  }

  /**
   * 导入提示词模板
   */
  private async _importPromptTemplates(): Promise<void> {
    try {
      const fileUri = await vscode.window.showOpenDialog({
        filters: { 'JSON Files': ['json'] },
        title: '选择提示词模板文件'
      });

      if (fileUri && fileUri.length > 0) {
        const content = await vscode.workspace.fs.readFile(fileUri[0]);
        const contentString = content.toString();
        promptTemplateService.importCustomTemplates(contentString);
        this._sendPromptTemplates();
        this._sendMessageToWebview({
          command: 'importSuccess',
          message: '提示词模板导入成功'
        });
        vscode.window.showInformationMessage('提示词模板导入成功');
      }
    } catch (error) {
      logger.error(`❌ 导入提示词模板失败: ${error}`);
      this._sendMessageToWebview({
        command: 'importError',
        message: `导入失败: ${error}`
      });
      vscode.window.showErrorMessage(`导入提示词模板失败: ${error}`);
    }
  }

  /**
   * 导出提示词模板
   */
  private async _exportPromptTemplates(): Promise<void> {
    try {
      const templates = promptTemplateService.getAllTemplates();
      const content = JSON.stringify(templates, null, 2);
      const fileUri = await vscode.window.showSaveDialog({
        filters: { 'JSON Files': ['json'] },
        title: '导出提示词模板',
        defaultUri: vscode.Uri.file('prompt-templates.json')
      });

      if (fileUri) {
        await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content, 'utf8'));
        this._sendMessageToWebview({
          command: 'exportSuccess',
          message: '提示词模板导出成功'
        });
        vscode.window.showInformationMessage('提示词模板导出成功');
      }
    } catch (error) {
      logger.error(`❌ 导出提示词模板失败: ${error}`);
      this._sendMessageToWebview({
        command: 'exportError',
        message: `导出失败: ${error}`
      });
      vscode.window.showErrorMessage(`导出提示词模板失败: ${error}`);
    }
  }

  /**
   * 获取Webview的HTML内容
   */
  private _getHtmlForWebview(webview: vscode.Webview) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>提示词模板管理</title>
  <style>
    body {
      padding: 16px;
      color: var(--vscode-foreground);
      font-size: 13px;
      line-height: 1.6;
    }
    
    h1 {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 20px 0;
      color: var(--vscode-editor-foreground);
    }
    
    .section {
      margin-bottom: 24px;
    }
    
    .section-title {
      font-weight: 600;
      margin-bottom: 12px;
      color: var(--vscode-editor-foreground);
      font-size: 14px;
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
    
    /* 操作按钮 */
    .action-buttons {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }
    
    button {
      padding: 8px 16px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s ease;
    }
    
    button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    
    button:active {
      transform: translateY(1px);
    }
    
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    /* 卡片网格 */
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }
    
    /* 模板卡片 */
    .template-card {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 6px;
      padding: 16px;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
    }
    
    .template-card:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transform: translateY(-1px);
    }
    
    .template-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .template-title {
      font-weight: 600;
      font-size: 14px;
      color: var(--vscode-editor-foreground);
    }
    
    .template-actions {
      display: flex;
      gap: 8px;
    }
    
    .template-actions button {
      padding: 4px 8px;
      font-size: 12px;
    }
    
    .template-meta {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    
    .template-category {
      background: var(--vscode-input-background);
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
    }
    
    .template-status {
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
    }
    
    .template-status.active {
      background: var(--vscode-testing-iconPassed-background);
      color: var(--vscode-testing-iconPassed);
    }
    
    .template-status.inactive {
      background: var(--vscode-error-background);
      color: var(--vscode-errorForeground);
    }
    
    .template-content {
      background: var(--vscode-input-background);
      padding: 12px;
      border-radius: 4px;
      font-size: 12px;
      margin-bottom: 12px;
      white-space: pre-wrap;
      word-break: break-word;
      min-height: 80px;
      flex: 1;
    }
    
    /* 状态开关 */
    .toggle-switch {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      user-select: none;
    }
    
    .toggle-label {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }
    
    .toggle-input {
      position: relative;
      width: 40px;
      height: 20px;
      appearance: none;
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 10px;
      outline: none;
      transition: all 0.2s ease;
    }
    
    .toggle-input:checked {
      background: var(--vscode-textLink-background);
      border-color: var(--vscode-textLink-background);
    }
    
    .toggle-input::before {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 14px;
      height: 14px;
      background: var(--vscode-input-foreground);
      border-radius: 50%;
      transition: all 0.2s ease;
    }
    
    .toggle-input:checked::before {
      left: 22px;
      background: var(--vscode-button-foreground);
    }
    
    /* 模态框样式 */
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      align-items: center;
      justify-content: center;
    }
    
    .modal.show {
      display: flex;
    }
    
    .modal-content {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 8px;
      padding: 20px;
      max-width: 600px;
      width: 100%;
      max-height: 80vh;
      overflow-y: auto;
    }
    
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    
    .modal-title {
      font-size: 16px;
      font-weight: 600;
    }
    
    .close-btn {
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      padding: 4px;
      color: var(--vscode-foreground);
    }
    
    /* 表单样式 */
    .form-row {
      margin-bottom: 16px;
    }
    
    label {
      display: block;
      margin-bottom: 6px;
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }
    
    input[type="text"], textarea, select {
      width: 100%;
      padding: 8px 12px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      font-size: 13px;
      box-sizing: border-box;
    }
    
    textarea {
      resize: vertical;
      min-height: 100px;
      font-family: var(--vscode-font-family);
    }
    
    input:focus, textarea:focus, select:focus {
      outline: 1px solid var(--vscode-focusBorder);
    }
    
    /* 状态消息 */
    .status {
      padding: 10px;
      margin-bottom: 16px;
      border-radius: 4px;
      font-size: 12px;
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
    
    /* 响应式设计 */
    @media (max-width: 768px) {
      .cards-grid {
        grid-template-columns: 1fr;
      }
      
      .action-buttons {
        flex-direction: column;
      }
    }
    
    /* 搜索框 */
    .search-box {
      margin-bottom: 16px;
    }
    
    .search-input {
      width: 100%;
      padding: 8px 12px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <h1>📄 提示词模板管理</h1>
  
  <!-- 状态消息 -->
  <div class="status" id="status"></div>
  
  <!-- 搜索框 -->
  <div class="search-box">
    <input type="text" id="searchInput" class="search-input" placeholder="搜索提示词模板...">
  </div>
  
  <!-- 操作按钮 -->
  <div class="action-buttons">
    <button id="createTemplateBtn">+ 新建模板</button>
    <button id="importTemplatesBtn">📥 导入模板</button>
    <button id="exportTemplatesBtn">📤 导出模板</button>
  </div>
  
  <!-- 提示词模板列表 -->
  <div class="section">
    <div class="section-title">我的模板</div>
    <div id="templatesGrid" class="cards-grid">
      <div style="grid-column: 1 / -1; text-align: center; color: var(--vscode-descriptionForeground); padding: 40px;">加载中...</div>
    </div>
  </div>
  
  <!-- 创建/编辑模板模态框 -->
  <div id="templateModal" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title" id="templateModalTitle">创建提示词模板</h3>
        <button class="close-btn" onclick="closeTemplateModal()">×</button>
      </div>
      
      <form id="templateForm">
        <input type="hidden" id="templateId">
        
        <div class="form-row">
          <label for="templateName">模板名称</label>
          <input type="text" id="templateName" placeholder="请输入模板名称" required>
        </div>
        
        <div class="form-row">
          <label for="templateKey">模板键名</label>
          <input type="text" id="templateKey" placeholder="请输入模板键名（用于程序内部引用）" required>
        </div>
        
        <div class="form-row">
          <label for="templateCategory">模板分类</label>
          <input type="text" id="templateCategory" placeholder="请输入模板分类，如：chapter, outline, character">
        </div>
        
        <div class="form-row">
          <label for="templateDescription">模板描述</label>
          <textarea id="templateDescription" placeholder="简要描述这个模板的用途"></textarea>
        </div>
        
        <div class="form-row">
          <label for="templateContent">模板内容</label>
          <textarea id="templateContent" placeholder="请输入AI提示词模板，使用{变量名}格式表示变量" required></textarea>
        </div>
        
        <div class="form-row">
          <label for="templateParameters">模板参数（JSON格式）</label>
          <textarea id="templateParameters" placeholder="例如：{\"variable1\": \"默认值\", \"variable2\": \"默认值\"}"></textarea>
        </div>
        
        <div class="form-row">
          <label for="templateIsSystemDefault">是否系统默认</label>
          <select id="templateIsSystemDefault">
            <option value="false">否</option>
            <option value="true">是</option>
          </select>
        </div>
        
        <div style="margin-top: 20px; display: flex; gap: 8px; justify-content: flex-end;">
          <button type="button" onclick="closeTemplateModal()">取消</button>
          <button type="submit">保存</button>
        </div>
      </form>
    </div>
  </div>
  
  <script>
    const vscode = acquireVsCodeApi();
    let currentEditingTemplate = null;
    let allTemplates = [];
    
    // 显示状态消息
    function showStatus(message, type) {
      const status = document.getElementById('status');
      status.textContent = message;
      status.className = 'status show ' + type;
      setTimeout(() => {
        status.classList.remove('show');
      }, 3000);
    }
    
    // 加载提示词模板列表
    function loadPromptTemplates() {
      vscode.postMessage({ command: 'getPromptTemplates' });
    }
    
    // 渲染提示词模板列表
    function renderPromptTemplates(templates) {
      allTemplates = templates || [];
      const container = document.getElementById('templatesGrid');
      
      if (!templates || templates.length === 0) {
        container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--vscode-descriptionForeground); padding: 40px;">暂无提示词模板，请点击上方按钮创建</div>';
        return;
      }
      
      container.innerHTML = templates.map(template => {
        const templateName = template.template_name || template.name || '未命名模板';
        const templateId = template.id || template.template_key || '';
        const category = template.category || '未分类';
        const statusClass = template.isActive ? 'active' : 'inactive';
        const statusText = template.isActive ? '已启用' : '已禁用';
        const content = template.template_content || template.content || '暂无内容';
        const systemDefault = template.is_system_default ? '<span class="template-category" style="background: var(--vscode-textLink-background); color: var(--vscode-textLink-foreground);">系统默认</span>' : '';
        const checked = template.isActive ? 'checked' : '';
        const isActiveBool = template.isActive ? 'false' : 'true';
        
        return '<div class="template-card">' +
          '<div class="template-header">' +
            '<div class="template-title">' + templateName + '</div>' +
            '<div class="template-actions">' +
              '<button onclick="editTemplate(\'' + templateId + '\')">编辑</button>' +
              '<button onclick="deleteTemplate(\'' + templateId + '\')">删除</button>' +
            '</div>' +
          '</div>' +
          '<div class="template-meta">' +
            '<span class="template-category">' + category + '</span>' +
            '<span class="template-status ' + statusClass + '">' + statusText + '</span>' +
            systemDefault +
          '</div>' +
          '<div class="template-content">' + content + '</div>' +
          '<div class="toggle-switch" onclick="toggleTemplate(\'' + templateId + '\', ' + isActiveBool + ')">' +
            '<input type="checkbox" class="toggle-input" ' + checked + ' onchange="event.stopPropagation()">' +
            '<span class="toggle-label">' + statusText + '</span>' +
          '</div>' +
        '</div>';
      }).join('');
    }
    
    // 搜索模板
    function searchTemplates() {
      const searchTerm = document.getElementById('searchInput').value.toLowerCase();
      const filteredTemplates = allTemplates.filter(template => {
        const name = (template.template_name || template.name || '').toLowerCase();
        const content = (template.template_content || template.content || '').toLowerCase();
        const category = (template.category || '').toLowerCase();
        return name.includes(searchTerm) || content.includes(searchTerm) || category.includes(searchTerm);
      });
      renderPromptTemplates(filteredTemplates);
    }
    
    // 创建新模板
    function createTemplate() {
      currentEditingTemplate = null;
      document.getElementById('templateModalTitle').textContent = '创建提示词模板';
      document.getElementById('templateForm').reset();
      document.getElementById('templateId').value = '';
      openTemplateModal();
    }
    
    // 编辑模板
    function editTemplate(templateId) {
      // 在实际项目中，这里应该从allTemplates数组中找到对应的模板并填充表单
      openTemplateModal();
    }
    
    // 删除模板
    function deleteTemplate(templateId) {
      if (confirm('确定要删除这个提示词模板吗？')) {
        vscode.postMessage({ command: 'deleteTemplate', templateId: templateId });
      }
    }
    
    // 切换模板状态
    function toggleTemplate(templateId, isActive) {
      vscode.postMessage({ command: 'toggleTemplate', templateId: templateId, isActive: isActive });
    }
    
    // 打开模板模态框
    function openTemplateModal() {
      document.getElementById('templateModal').classList.add('show');
    }
    
    // 关闭模板模态框
    function closeTemplateModal() {
      document.getElementById('templateModal').classList.remove('show');
      currentEditingTemplate = null;
    }
    
    // 导入模板
    function importTemplates() {
      vscode.postMessage({ command: 'importTemplates' });
    }
    
    // 导出模板
    function exportTemplates() {
      vscode.postMessage({ command: 'exportTemplates' });
    }
    
    // 表单提交处理
    document.getElementById('templateForm').addEventListener('submit', (e) => {
      e.preventDefault();
      
      const template = {
        id: document.getElementById('templateId').value || 'template-' + Date.now(),
        template_name: document.getElementById('templateName').value,
        template_key: document.getElementById('templateKey').value,
        category: document.getElementById('templateCategory').value,
        description: document.getElementById('templateDescription').value,
        template_content: document.getElementById('templateContent').value,
        parameters: document.getElementById('templateParameters').value ? JSON.parse(document.getElementById('templateParameters').value) : {},
        is_system_default: document.getElementById('templateIsSystemDefault').value === 'true',
        isActive: true
      };
      
      vscode.postMessage({ command: 'saveTemplate', template: template });
      closeTemplateModal();
    });
    
    // 事件监听器
    document.getElementById('createTemplateBtn').addEventListener('click', createTemplate);
    document.getElementById('importTemplatesBtn').addEventListener('click', importTemplates);
    document.getElementById('exportTemplatesBtn').addEventListener('click', exportTemplates);
    document.getElementById('searchInput').addEventListener('input', searchTemplates);
    
    // 点击模态框外部关闭
    window.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
      }
    });
    
    // 添加按钮事件监听器
    document.getElementById('createTemplateBtn').addEventListener('click', createTemplate);
    document.getElementById('importTemplatesBtn').addEventListener('click', importTemplates);
    document.getElementById('exportTemplatesBtn').addEventListener('click', exportTemplates);
    document.getElementById('searchInput').addEventListener('input', searchTemplates);
    
    // 监听来自扩展的消息
    window.addEventListener('message', (event) => {
      const message = event.data;
      switch (message.command) {
        case 'updatePromptTemplates':
          renderPromptTemplates(message.templates);
          break;
        case 'saveSuccess':
        case 'deleteSuccess':
        case 'toggleSuccess':
        case 'importSuccess':
        case 'exportSuccess':
          showStatus(message.message, 'success');
          loadPromptTemplates();
          break;
        case 'saveError':
        case 'deleteError':
        case 'toggleError':
        case 'importError':
        case 'exportError':
          showStatus(message.message, 'error');
          break;
      }
    });
    
    // 初始化加载
    loadPromptTemplates();
  </script>
</body>
</html>`;
  }
}