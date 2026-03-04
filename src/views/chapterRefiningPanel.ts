/**
 * 文章精修面板 - 用户选择精修模板
 */

import * as vscode from 'vscode';
import { refiningTemplateService } from '../services/refiningTemplateService';
import { logger } from '../utils/logger';
import { NovelCategory, PromptTemplate } from '../types/refining';

export class ChapterRefiningPanel implements vscode.WebviewViewProvider {
  public static readonly viewType = 'novelAssistant.refining';

  private _view?: vscode.WebviewView;
  private _selectedTemplateIds: Set<string> = new Set();
  private _selectedCategory: NovelCategory = 'general';

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      logger.debug(`📨 精修面板消息: ${JSON.stringify(data)}`);
      await this._handleMessage(data);
    });
  }

  /**
   * 处理来自Webview的消息
   */
  private async _handleMessage(data: any): Promise<void> {
    switch (data.command) {
      case 'categorySelected':
        this._handleCategorySelected(data.category);
        break;
      case 'templateToggled':
        this._handleTemplateToggled(data.templateId);
        break;
      case 'startRefining':
        await this._handleStartRefining();
        break;
      case 'resetSelection':
        this._handleResetSelection();
        break;
      case 'createCustomTemplate':
        this._handleCreateCustomTemplate();
        break;
      case 'editTemplate':
        this._handleEditTemplate(data.templateId);
        break;
      case 'deleteTemplate':
        this._handleDeleteTemplate(data.templateId);
        break;
    }
  }

  /**
   * 处理编辑自定义模板
   */
  private _handleEditTemplate(templateId: string): void {
    vscode.commands.executeCommand('novelAssistant.editCustomTemplate', { templateId }).then(() => {
      // 刷新UI以显示更新的模板
      setTimeout(() => {
        this._updateWebviewContent();
      }, 500);
    });
  }

  /**
   * 处理删除自定义模板
   */
  private _handleDeleteTemplate(templateId: string): void {
    vscode.window.showWarningMessage(
      '确定要删除此自定义模板吗？',
      '删除',
      '取消'
    ).then(action => {
      if (action === '删除') {
        vscode.commands.executeCommand('novelAssistant.deleteCustomTemplate', { templateId }).then(() => {
          // 刷新UI以移除已删除的模板
          setTimeout(() => {
            this._updateWebviewContent();
          }, 300);
        });
      }
    });
  }

  /**
   * 处理创建自定义模板
   */
  private _handleCreateCustomTemplate(): void {
    vscode.commands.executeCommand('novelAssistant.createCustomTemplate').then(() => {
      // 刷新UI以显示新创建的模板
      setTimeout(() => {
        this._updateWebviewContent();
      }, 500);
    });
  }

  /**
   * 处理分类选择
   */
  private _handleCategorySelected(category: NovelCategory): void {
    this._selectedCategory = category;
    logger.log(`✓ 已选择分类: ${category}`);

    // 更新界面，显示该分类的默认模板
    const defaultTemplates = refiningTemplateService.getDefaultTemplatesForCategory(category);
    this._selectedTemplateIds.clear();
    defaultTemplates.forEach(t => this._selectedTemplateIds.add(t.id));

    this._updateWebviewContent();
  }

  /**
   * 处理模板切换
   */
  private _handleTemplateToggled(templateId: string): void {
    if (this._selectedTemplateIds.has(templateId)) {
      this._selectedTemplateIds.delete(templateId);
      logger.debug(`✗ 取消选择模板: ${templateId}`);
    } else {
      this._selectedTemplateIds.add(templateId);
      logger.debug(`✓ 选择模板: ${templateId}`);
    }

    this._updateWebviewContent();
  }

  /**
   * 处理开始精修
   */
  private async _handleStartRefining(): Promise<void> {
    if (this._selectedTemplateIds.size === 0) {
      vscode.window.showWarningMessage('请至少选择一个精修模板');
      return;
    }

    // 获取当前打开的MD文件
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('请先打开需要精修的MD文件');
      return;
    }

    const chapterText = editor.document.getText();
    const templateIds = Array.from(this._selectedTemplateIds);

    logger.log(`▶ 开始精修: 选择了 ${templateIds.length} 个模板`);

    // 直接调用精修命令，传递数据
    await vscode.commands.executeCommand('novelAssistant.refineChapter', {
      templateIds,
      category: this._selectedCategory,
      chapterText,
      filePath: editor.document.uri.fsPath,
    });
  }

  /**
   * 处理重置选择
   */
  private _handleResetSelection(): void {
    this._selectedTemplateIds.clear();
    this._selectedCategory = 'general';
    this._updateWebviewContent();
    logger.log('✓ 已重置精修选择');
  }

  /**
   * 更新Webview内容
   */
  private _updateWebviewContent(): void {
    if (this._view) {
      this._view.webview.html = this._getHtmlForWebview(this._view.webview);
    }
  }

  /**
   * 生成Webview HTML
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    const categories = refiningTemplateService.getAllCategories();
    const allTemplates = refiningTemplateService.getAllTemplates();
    const defaultTemplates = refiningTemplateService.getDefaultTemplatesForCategory(this._selectedCategory);
    const defaultIds = new Set(defaultTemplates.map(t => t.id));

    // 初始化选中的模板
    if (this._selectedTemplateIds.size === 0 && defaultIds.size > 0) {
      defaultIds.forEach(id => this._selectedTemplateIds.add(id));
    }

    const templatesByCategory = new Map<string, PromptTemplate[]>();
    allTemplates.forEach(template => {
      template.category.forEach(cat => {
        if (!templatesByCategory.has(cat)) {
          templatesByCategory.set(cat, []);
        }
        templatesByCategory.get(cat)!.push(template);
      });
    });

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>文章精修</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: var(--font-family-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      padding: 12px;
      line-height: 1.6;
    }

    .container {
      max-width: 100%;
    }

    .header {
      display: flex;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
    }

    .header h1 {
      font-size: 15px;
      font-weight: 600;
      margin-right: 8px;
    }

    .header-info {
      font-size: 11px;
      color: var(--vscode-sideBar-foreground-muted, #8B8B8B);
    }

    .category-section {
      margin-bottom: 16px;
    }

    .category-title {
      font-size: 11px;
      font-weight: 600;
      color: var(--vscode-sideBarTitle-foreground);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
      padding-left: 4px;
      border-left: 3px solid var(--vscode-button-background);
    }

    .categories {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 16px;
    }

    .category-btn {
      padding: 8px 12px;
      border: 2px solid transparent;
      border-radius: 6px;
      background: var(--vscode-list-hoverBackground);
      color: var(--vscode-foreground);
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.2s;
      text-align: left;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .category-btn:hover {
      background: var(--vscode-list-activeSelectionBackground);
      border-color: var(--vscode-button-background);
    }

    .category-btn.active {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-color: var(--vscode-button-background);
    }

    .category-emoji {
      font-size: 14px;
      min-width: 20px;
    }

    .templates-section {
      margin-bottom: 16px;
    }

    .templates-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .template-item {
      padding: 10px;
      border: 1px solid var(--vscode-button-border);
      border-radius: 6px;
      background: var(--vscode-editor-background);
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }

    .template-item:hover {
      background: var(--vscode-list-hoverBackground);
    }

    .template-item.selected {
      border-color: var(--vscode-button-background);
      background: var(--vscode-list-activeSelectionBackground);
    }

    .template-checkbox {
      margin-top: 2px;
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: var(--vscode-button-background);
      flex-shrink: 0;
    }

    .template-content {
      flex: 1;
      min-width: 0;
    }

    .template-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }

    .template-emoji {
      font-size: 14px;
    }

    .template-name {
      font-size: 12px;
      font-weight: 600;
      color: var(--vscode-foreground);
    }

    .template-description {
      font-size: 11px;
      color: var(--vscode-sideBar-foreground-muted, #8B8B8B);
      margin-bottom: 4px;
    }

    .template-meta {
      display: flex;
      gap: 12px;
      font-size: 10px;
      color: var(--vscode-sideBar-foreground-muted, #8B8B8B);
      margin-bottom: 8px;
    }

    .template-actions {
      display: flex;
      gap: 6px;
      padding-top: 8px;
      border-top: 1px solid var(--vscode-sideBarSectionHeader-border);
    }

    .btn-small {
      flex: 1;
      padding: 4px 8px;
      border: 1px solid var(--vscode-button-border);
      border-radius: 4px;
      font-size: 10px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      background: var(--vscode-list-hoverBackground);
      color: var(--vscode-foreground);
    }

    .btn-small:hover {
      background: var(--vscode-list-activeSelectionBackground);
      border-color: var(--vscode-button-background);
    }

    .btn-edit {
      background: rgba(76, 175, 80, 0.1);
      border-color: rgba(76, 175, 80, 0.3);
    }

    .btn-edit:hover {
      background: rgba(76, 175, 80, 0.2);
      border-color: rgba(76, 175, 80, 0.6);
    }

    .btn-delete {
      background: rgba(244, 67, 54, 0.1);
      border-color: rgba(244, 67, 54, 0.3);
    }

    .btn-delete:hover {
      background: rgba(244, 67, 54, 0.2);
      border-color: rgba(244, 67, 54, 0.6);
    }

    .template-badge {
      padding: 2px 6px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      border-radius: 3px;
      font-size: 9px;
      font-weight: 500;
    }

    .actions {
      display: flex;
      gap: 8px;
      padding-top: 12px;
      border-top: 1px solid var(--vscode-sideBarSectionHeader-border);
      margin-top: 16px;
    }

    .btn {
      flex: 1;
      padding: 8px 12px;
      border: none;
      border-radius: 6px;
      font-size: 12px;
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

    .selected-count {
      font-size: 11px;
      color: var(--vscode-sideBar-foreground-muted, #8B8B8B);
      padding: 8px 0;
    }

    .empty-state {
      padding: 20px;
      text-align: center;
      color: var(--vscode-sideBar-foreground-muted, #8B8B8B);
      font-size: 12px;
    }

    .difficulty-easy {
      color: #4CAF50;
    }

    .difficulty-medium {
      color: #FF9800;
    }

    .difficulty-hard {
      color: #F44336;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✨ 文章精修</h1>
      <span class="header-info">选择精修方向</span>
    </div>

    <div class="category-section">
      <div class="category-title">📚 小说类别</div>
      <div class="categories">
        ${categories
          .map(
            cat => `
          <button class="category-btn ${cat.id === this._selectedCategory ? 'active' : ''}" 
                  onclick="selectCategory('${cat.id}')">
            <span class="category-emoji">${cat.emoji}</span>
            <span>${cat.name}</span>
          </button>
        `
          )
          .join('')}
      </div>
    </div>

    <div class="templates-section">
      <div class="category-title">🎯 精修模板</div>
      <div class="selected-count">已选择: <strong>${this._selectedTemplateIds.size}</strong> 个模板</div>
      
      ${
        templatesByCategory.has(this._selectedCategory)
          ? `
        <div class="templates-list">
          ${templatesByCategory
            .get(this._selectedCategory)!
            .map(
              template => `
            <div class="template-item ${this._selectedTemplateIds.has(template.id) ? 'selected' : ''}" 
                 onclick="toggleTemplate('${template.id}')">
              <input type="checkbox" class="template-checkbox" 
                     ${this._selectedTemplateIds.has(template.id) ? 'checked' : ''} 
                     onchange="toggleTemplate('${template.id}')">
              <div class="template-content">
                <div class="template-header">
                  <span class="template-emoji">${template.emoji}</span>
                  <span class="template-name">${template.name}</span>
                </div>
                <div class="template-description">${template.description}</div>
                <div class="template-meta">
                  <span class="difficulty-${template.difficulty}">难度: ${
                    {
                      easy: '简单',
                      medium: '中等',
                      hard: '困难',
                    }[template.difficulty]
                  }</span>
                  <span>⏱️ ${template.estimatedTime}秒</span>
                  ${
                    template.isSystemTemplate
                      ? '<span class="template-badge">系统模板</span>'
                      : '<span class="template-badge">自定义</span>'
                  }
                </div>
                ${
                  !template.isSystemTemplate
                    ? `
                <div class="template-actions">
                  <button class="btn-small btn-edit" onclick="editTemplate('${template.id}', event)">✏️ 编辑</button>
                  <button class="btn-small btn-delete" onclick="deleteTemplate('${template.id}', event)">🗑️ 删除</button>
                </div>
                    `
                    : ''
                }
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      `
          : `
        <div class="empty-state">暂无该分类的模板</div>
      `
      }
    </div>

    <div class="actions">
      <button class="btn btn-secondary" onclick="resetSelection()">重置</button>
      <button class="btn btn-secondary" onclick="createCustomTemplate()" title="创建自定义精修模板">➕ 新建模板</button>
      <button class="btn btn-primary" onclick="startRefining()" ${
        this._selectedTemplateIds.size === 0 ? 'disabled' : ''
      }>
        开始精修 →
      </button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function selectCategory(category) {
      vscode.postMessage({
        command: 'categorySelected',
        category: category
      });
    }

    function toggleTemplate(templateId) {
      vscode.postMessage({
        command: 'templateToggled',
        templateId: templateId
      });
    }

    function startRefining() {
      vscode.postMessage({
        command: 'startRefining'
      });
    }

    function resetSelection() {
      vscode.postMessage({
        command: 'resetSelection'
      });
    }

    function createCustomTemplate() {
      vscode.postMessage({
        command: 'createCustomTemplate'
      });
    }

    function editTemplate(templateId, event) {
      event.stopPropagation();
      vscode.postMessage({
        command: 'editTemplate',
        templateId: templateId
      });
    }

    function deleteTemplate(templateId, event) {
      event.stopPropagation();
      vscode.postMessage({
        command: 'deleteTemplate',
        templateId: templateId
      });
    }
  </script>
</body>
</html>`;
  }
}
