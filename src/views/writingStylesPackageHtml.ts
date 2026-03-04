import * as vscode from 'vscode';

export function getWritingStylesHtml(webview: vscode.Webview): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>写作风格套装</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      padding: 16px;
      color: var(--vscode-foreground);
      font-family: var(--vscode-font-family);
      font-size: 13px;
      line-height: 1.6;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    .header-info h2 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header-info p {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }

    .btn {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .btn-primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .btn-primary:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    .btn-secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    .category {
      margin-bottom: 16px;
    }

    .category-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px;
      background: var(--vscode-editor-inactiveSelectionBackground);
      border-radius: 6px;
      cursor: pointer;
      user-select: none;
      margin-bottom: 8px;
    }

    .category-header:hover {
      background: var(--vscode-list-hoverBackground);
    }

    .category-title {
      font-weight: 600;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .category-icon {
      font-size: 16px;
    }

    .category-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }

    .toggle-icon {
      font-size: 12px;
      transition: transform 0.2s;
      width: 16px;
      text-align: center;
    }

    .category-header.collapsed .toggle-icon {
      transform: rotate(-90deg);
    }

    .category-header.collapsed + .package-list {
      display: none;
    }

    .package-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 12px;
      padding-left: 8px;
    }

    .package-card {
      background: var(--vscode-editor-background);
      border: 2px solid var(--vscode-panel-border);
      border-radius: 10px;
      padding: 16px;
      transition: all 0.2s;
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 180px;
    }

    .package-card:hover {
      border-color: var(--vscode-focusBorder);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .package-card.active {
      border-color: var(--vscode-textLink-activeForeground);
      background: var(--vscode-list-activeSelectionBackground);
    }

    .package-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
      flex-shrink: 0;
    }

    .package-title {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      min-width: 0;
    }

    .package-icon {
      font-size: 28px;
      flex-shrink: 0;
    }

    .package-name {
      font-weight: 600;
      font-size: 15px;
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .package-badges {
      display: flex;
      gap: 6px;
      flex-shrink: 0;
    }

    .badge {
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 500;
      white-space: nowrap;
    }

    .badge-active {
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
    }

    .badge-custom {
      background: var(--vscode-textLink-foreground);
      color: white;
    }

    .package-description {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 12px;
      line-height: 1.5;
      flex: 1;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
    }

    .package-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 12px;
      flex-shrink: 0;
    }

    .tag {
      padding: 2px 8px;
      background: var(--vscode-editor-inactiveSelectionBackground);
      border-radius: 4px;
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
    }

    .package-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      padding-top: 10px;
      border-top: 1px solid var(--vscode-panel-border);
      flex-shrink: 0;
      margin-top: auto;
    }

    .action-btn {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
    }

    .action-btn-activate {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    .action-btn-activate:hover {
      background: var(--vscode-textLink-activeForeground);
      color: white;
    }

    .action-btn-activate:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .action-btn-edit {
      background: transparent;
      border: 1px solid var(--vscode-panel-border);
      color: var(--vscode-foreground);
    }

    .action-btn-edit:hover {
      border-color: var(--vscode-textLink-foreground);
    }

    .action-btn-delete {
      background: transparent;
      border: 1px solid var(--vscode-errorForeground);
      color: var(--vscode-errorForeground);
    }

    .action-btn-delete:hover {
      background: var(--vscode-errorForeground);
      color: white;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: var(--vscode-descriptionForeground);
    }

    .empty-state-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .tip-box {
      background: var(--vscode-textBlockQuote-background);
      border-left: 3px solid var(--vscode-textLink-foreground);
      padding: 12px 14px;
      margin-top: 16px;
      border-radius: 0 6px 6px 0;
      font-size: 12px;
      line-height: 1.6;
    }

    .tip-box strong {
      color: var(--vscode-textLink-foreground);
    }

    .loading {
      text-align: center;
      padding: 40px;
      color: var(--vscode-descriptionForeground);
    }

    .loading-spinner {
      font-size: 24px;
      margin-bottom: 12px;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-info">
      <h2>✍️ 写作风格套装</h2>
      <p>选择适合您小说类型的风格，AI将按照该风格进行创作</p>
    </div>
    <div class="header-actions">
      <button class="btn btn-secondary" onclick="importPackages()">
        <span>📥</span>
        <span>导入</span>
      </button>
      <button class="btn btn-secondary" onclick="exportPackages()">
        <span>📤</span>
        <span>导出</span>
      </button>
    </div>
  </div>

  <div id="packages-container">
    <div class="loading">
      <div class="loading-spinner">⏳</div>
      <p>正在加载风格套装...</p>
    </div>
  </div>

  <div class="tip-box">
    <strong>💡 使用提示</strong><br>
    • 点击"激活"使用该套装进行创作<br>
    • 预设套装可基于其创建自定义版本<br>
    • 自定义套装可编辑和删除<br>
    • 同一时间只能激活一个风格套装
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    let packagesData = {};

    window.addEventListener('message', event => {
      const message = event.data;
      if (message.command === 'updatePackages') {
        packagesData = message.packages;
        renderPackages(message.packages);
      } else if (message.command === 'showError') {
        showError(message.message);
      }
    });

    function renderPackages(grouped) {
      const container = document.getElementById('packages-container');
      
      if (!grouped || Object.keys(grouped).length === 0) {
        container.innerHTML = \`
          <div class="empty-state">
            <div class="empty-state-icon">📦</div>
            <p>暂无风格套装</p>
            <p style="margin-top: 8px; font-size: 11px;">请导入或创建自定义套装</p>
          </div>
        \`;
        return;
      }

      let html = '';
      
      for (const [category, packages] of Object.entries(grouped)) {
        const categoryConfig = getCategoryConfig(category);
        const categoryId = 'cat-' + category.replace(/\\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
        
        html += \`
          <div class="category">
            <div class="category-header" onclick="toggleCategory('\${categoryId}')" id="header-\${categoryId}">
              <div class="category-title">
                <span class="category-icon">\${categoryConfig.icon}</span>
                <span>\${category}</span>
              </div>
              <div class="category-meta">
                <span>\${packages.length} 个套装</span>
                <span class="toggle-icon">▼</span>
              </div>
            </div>
            <div class="package-list" id="\${categoryId}">
        \`;
        
        packages.forEach(pkg => {
          html += renderPackageCard(pkg);
        });
        
        html += \`
            </div>
          </div>
        \`;
      }
      
      container.innerHTML = html;
    }

    function renderPackageCard(pkg) {
      const isActive = pkg.isActive;
      const isCustom = pkg.isCustom;
      
      return \`
        <div class="package-card \${isActive ? 'active' : ''}" data-id="\${pkg.id}">
          <div class="package-header">
            <div class="package-title">
              <span class="package-icon">\${pkg.icon || '📝'}</span>
              <span class="package-name">\${pkg.name}</span>
            </div>
            <div class="package-badges">
              \${isActive ? '<span class="badge badge-active">使用中</span>' : ''}
              \${isCustom ? '<span class="badge badge-custom">自定义</span>' : ''}
            </div>
          </div>
          <div class="package-description">\${pkg.description || '暂无描述'}</div>
          \${pkg.tags && pkg.tags.length > 0 ? \`
            <div class="package-tags">
              \${pkg.tags.map(tag => \`<span class="tag">\${tag}</span>\`).join('')}
            </div>
          \` : ''}
          <div class="package-actions">
            <button class="action-btn action-btn-activate" 
              onclick="activatePackage('\${pkg.id}')"
              \${isActive ? 'disabled' : ''}>
              \${isActive ? '✓ 已激活' : '⚡ 激活'}
            </button>
            \${!isCustom ? \`
              <button class="action-btn action-btn-edit" onclick="createCustom('\${pkg.id}')">
                📝 创建副本
              </button>
            \` : \`
              <button class="action-btn action-btn-edit" onclick="editPackage('\${pkg.id}')">
                ✏️ 编辑
              </button>
              <button class="action-btn action-btn-delete" onclick="deletePackage('\${pkg.id}')">
                🗑️ 删除
              </button>
            \`}
          </div>
        </div>
      \`;
    }

    function getCategoryConfig(categoryName) {
      const configs = {
        '我的自定义': { icon: '⭐', expanded: true },
        '都市生活': { icon: '🏙️', expanded: true },
        '科幻未来': { icon: '🚀', expanded: true },
        '奇幻冒险': { icon: '🏰', expanded: true },
        '悬疑推理': { icon: '🔍', expanded: true },
        '历史穿越': { icon: '📜', expanded: true },
        '浪漫言情': { icon: '💕', expanded: true },
        '武侠江湖': { icon: '⚔️', expanded: true },
        '恐怖惊悚': { icon: '👻', expanded: true }
      };
      return configs[categoryName] || { icon: '📁', expanded: true };
    }

    function toggleCategory(categoryId) {
      const header = document.getElementById('header-' + categoryId);
      header.classList.toggle('collapsed');
    }

    function activatePackage(id) {
      vscode.postMessage({ command: 'activatePackage', id: id });
    }

    function createCustom(baseId) {
      vscode.postMessage({ command: 'createCustom', baseId: baseId });
    }

    function editPackage(id) {
      vscode.postMessage({ command: 'editPackage', id: id });
    }

    function deletePackage(id) {
      vscode.postMessage({ command: 'deletePackage', id: id });
    }

    function exportPackages() {
      vscode.postMessage({ command: 'exportPackages' });
    }

    function importPackages() {
      vscode.postMessage({ command: 'importPackages' });
    }

    function showError(message) {
      const container = document.getElementById('packages-container');
      container.innerHTML = \`
        <div class="empty-state">
          <div class="empty-state-icon">❌</div>
          <p>\${message}</p>
        </div>
      \`;
    }

    vscode.postMessage({ command: 'getPackages' });
  </script>
</body>
</html>`;
}

export interface WritingStylesMessage {
  command: string;
  packages?: Record<string, any[]>;
  id?: string;
  baseId?: string;
  message?: string;
}

export function isValidMessage(data: any): data is WritingStylesMessage {
  return data && typeof data.command === 'string';
}
