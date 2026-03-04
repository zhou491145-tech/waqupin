import * as vscode from 'vscode';
import { characterRepository } from '../repositories';
import { characterManagementService } from '../services/characterManagementService';
import { logger } from '../utils/logger';
import { Character, CharacterTimeline, CharacterRelationship, CharacterHistory } from '../types/character';

const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP'
];

const MBTI_DESCRIPTIONS: { [key: string]: string } = {
  'INTJ': '战略家 - 善于规划和执行长远目标，独立思考，追求完美',
  'INTP': '逻辑学家 - 善于分析和理解复杂系统，富有创造力',
  'ENTJ': '指挥官 - 天生的领导者，善于组织和决策，目标导向',
  'ENTP': '辩论家 - 善于创新和挑战现状，思维敏捷，充满活力',
  'INFJ': '提倡者 - 富有洞察力，追求意义和价值，理想主义者',
  'INFP': '调停者 - 富有想象力，追求和谐与理想，善良真诚',
  'ENFJ': '主人公 - 富有魅力，善于激励和引导他人，热心助人',
  'ENFP': '竞选者 - 充满热情，善于激发他人潜能，乐观向上',
  'ISTJ': '物流师 - 值得信赖，注重细节和传统，务实可靠',
  'ISFJ': '守卫者 - 忠诚可靠，关心他人福祉，温和体贴',
  'ESTJ': '总经理 - 高效务实，善于组织和执行，有条理',
  'ESFJ': '执政官 - 热心助人，善于营造和谐氛围，社交能力强',
  'ISTP': '鉴赏家 - 动手能力强，善于解决实际问题，冷静理性',
  'ISFP': '探险家 - 艺术气质，追求自由和美感，温柔随和',
  'ESTP': '企业家 - 行动导向，善于把握机会，充满活力',
  'ESFP': '表演者 - 充满活力，善于娱乐和社交，热情开朗'
};

const ROLE_TYPES = [
  { value: 'protagonist', label: '📕 主角' },
  { value: 'antagonist', label: '📗 反派' },
  { value: 'supporting', label: '📘 配角' },
  { value: 'minor', label: '📙 龙套' }
];

const RELATIONSHIP_TYPES = [
  { value: 'friend', label: '朋友' },
  { value: 'enemy', label: '敌人' },
  { value: 'family', label: '家人' },
  { value: 'mentor', label: '师徒' },
  { value: 'lover', label: '恋人' },
  { value: 'rival', label: '对手' },
  { value: 'subordinate', label: '下属' },
  { value: 'ally', label: '盟友' },
  { value: 'neutral', label: '中立' },
  { value: 'other', label: '其他' }
];

export class CharacterEditPanel {
  public static readonly viewType = 'novelAssistant.characterEdit';

  private _panel?: vscode.WebviewPanel;
  private static _instance: CharacterEditPanel | undefined;
  private _currentCharacterId?: string;

  private constructor(private readonly _extensionUri: vscode.Uri) {}

  public static getInstance(extensionUri: vscode.Uri): CharacterEditPanel {
    if (!CharacterEditPanel._instance) {
      CharacterEditPanel._instance = new CharacterEditPanel(extensionUri);
    }
    return CharacterEditPanel._instance;
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
      CharacterEditPanel.viewType,
      `✏️ ${character.name} - 编辑`,
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this._extensionUri]
      }
    );

    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, character);

    this._panel.webview.onDidReceiveMessage(async (data) => {
      switch (data.command) {
        case 'updateCharacter':
          await this._handleUpdateCharacter(data.character);
          break;
        case 'addAttribute':
          await this._handleAddAttribute(data.attribute);
          break;
        case 'deleteAttribute':
          await this._handleDeleteAttribute(data.attributeId);
          break;
        case 'addRelationship':
          await this._handleAddRelationship(data.relationship);
          break;
        case 'updateRelationship':
          await this._handleUpdateRelationship(data.relationshipId, data.updates);
          break;
        case 'rollback':
          await this._handleRollback(data.version);
          break;
        case 'loadData':
          await this._sendCharacterData(this._panel!.webview, characterId);
          break;
      }
    });

    this._panel.onDidDispose(() => {
      this._panel = undefined;
      this._currentCharacterId = undefined;
    });
  }

  private async _handleUpdateCharacter(characterData: Partial<Character>) {
    if (!this._currentCharacterId) return;

    const chapterNumber = await vscode.window.showInputBox({
      prompt: '当前章节号（可选，用于记录时间线）',
      placeHolder: '例如: 10'
    });

    const changeReason = await vscode.window.showInputBox({
      prompt: '变更原因（可选）',
      placeHolder: '例如: 角色成长、剧情发展'
    });

    const success = await characterManagementService.updateCharacter(
      this._currentCharacterId,
      characterData,
      chapterNumber ? parseInt(chapterNumber) : undefined,
      changeReason
    );

    if (success && this._panel) {
      const character = characterRepository.findById(this._currentCharacterId);
      if (character) {
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, character);
      }
    }
  }

  private async _handleAddAttribute(attributeData: any) {
    if (!this._currentCharacterId) return;

    const { category, name, value, chapterNumber, changeReason } = attributeData;

    const success = await characterManagementService.addAttribute(
      this._currentCharacterId,
      name,
      value,
      category,
      chapterNumber,
      changeReason
    );

    if (success && this._panel) {
      await this._sendCharacterData(this._panel.webview, this._currentCharacterId);
    }
  }

  private async _handleDeleteAttribute(attributeId: string) {
    if (!this._currentCharacterId) return;

    const success = await characterManagementService.deleteAttribute(attributeId);

    if (success && this._panel) {
      await this._sendCharacterData(this._panel.webview, this._currentCharacterId);
    }
  }

  private async _handleAddRelationship(relationshipData: any) {
    if (!this._currentCharacterId) return;

    const characters = characterRepository.loadAll();
    const characterNames = characters.map(c => c.name);

    const targetName = await vscode.window.showQuickPick(characterNames, {
      placeHolder: '选择要建立关系的角色'
    });

    if (!targetName) return;

    const targetCharacter = characters.find(c => c.name === targetName);
    if (!targetCharacter) return;

    const relationshipType = await vscode.window.showQuickPick(
      RELATIONSHIP_TYPES.map(r => r.label),
      { placeHolder: '选择关系类型' }
    );

    if (!relationshipType) return;

    const relationshipLabel = await vscode.window.showInputBox({
      prompt: '关系标签',
      placeHolder: '例如: 师父、兄弟、恋人'
    });

    if (!relationshipLabel) return;

    const strengthInput = await vscode.window.showInputBox({
      prompt: '关系强度 (0-100)',
      placeHolder: '50',
      validateInput: (value) => {
        const num = parseInt(value);
        if (isNaN(num) || num < 0 || num > 100) {
          return '请输入0-100之间的数字';
        }
        return null;
      }
    });

    const strength = strengthInput ? parseInt(strengthInput) : 50;

    await characterManagementService.addRelationship(
      this._currentCharacterId,
      targetCharacter.id,
      RELATIONSHIP_TYPES.find(r => r.label === relationshipType)!.value as any,
      relationshipLabel,
      strength
    );

    if (this._panel) {
      const character = characterRepository.findById(this._currentCharacterId);
      if (character) {
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, character);
      }
    }
  }

  private async _handleUpdateRelationship(relationshipId: string, updates: any) {
    await characterManagementService.updateRelationship(relationshipId, updates);

    if (this._panel && this._currentCharacterId) {
      const character = characterRepository.findById(this._currentCharacterId);
      if (character) {
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, character);
      }
    }
  }

  private async _handleRollback(version: number) {
    if (!this._currentCharacterId) return;

    const confirm = await vscode.window.showWarningMessage(
      `确定要回滚到版本 ${version} 吗？当前版本将被覆盖。`,
      '确定',
      '取消'
    );

    if (confirm === '确定') {
      const success = await characterManagementService.rollbackToVersion(this._currentCharacterId, version);

      if (success && this._panel) {
        const character = characterRepository.findById(this._currentCharacterId);
        if (character) {
          this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, character);
        }
      }
    }
  }

  private async _sendCharacterData(webview: vscode.Webview, characterId: string) {
    const relationships = characterManagementService.getRelationships(characterId);
    const timeline = characterManagementService.getTimeline(characterId);
    const history = characterManagementService.getHistory(characterId);
    const attributes = characterManagementService.getAttributes(characterId);

    webview.postMessage({
      command: 'dataLoaded',
      data: {
        relationships,
        timeline,
        history,
        attributes
      }
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview, character: Character): string {
    const mbtiOptions = MBTI_TYPES.map(type =>
      `<option value="${type}" ${character.mbtiPrimary === type ? 'selected' : ''}>${type} - ${MBTI_DESCRIPTIONS[type]}</option>`
    ).join('');

    const roleOptions = ROLE_TYPES.map(role =>
      `<option value="${role.value}" ${character.role === role.value ? 'selected' : ''}>${role.label}</option>`
    ).join('');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>编辑角色 - ${character.name}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px;
      background-color: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      line-height: 1.6;
    }
    
    .container {
      max-width: 1000px;
      margin: 0 auto;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid var(--vscode-panel-border);
    }
    
    .title {
      font-size: 24px;
      font-weight: bold;
    }
    
    .tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    
    .tab {
      padding: 10px 20px;
      background-color: var(--vscode-editor-inactiveSelectionBackground);
      border: none;
      border-radius: 6px;
      cursor: pointer;
      color: var(--vscode-editor-foreground);
      font-size: 14px;
    }
    
    .tab.active {
      background-color: var(--vscode-textLink-foreground);
      color: white;
    }
    
    .tab-content {
      display: none;
    }
    
    .tab-content.active {
      display: block;
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
    
    .form-input,
    .form-select,
    .form-textarea {
      width: 100%;
      padding: 10px;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      background-color: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      font-size: 14px;
    }
    
    .form-textarea {
      min-height: 100px;
      resize: vertical;
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
      background-color: var(--vscode-textLink-foreground);
      color: white;
    }
    
    .btn-primary:hover {
      opacity: 0.9;
    }
    
    .btn-secondary {
      background-color: var(--vscode-editor-inactiveSelectionBackground);
      color: var(--vscode-editor-foreground);
    }
    
    .btn-danger {
      background-color: #e74c3c;
      color: white;
    }
    
    .btn-group {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }
    
    .section {
      background-color: var(--vscode-editor-inactiveSelectionBackground);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }
    
    .section-title {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 15px;
      color: var(--vscode-textLink-foreground);
    }
    
    .relationship-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background-color: var(--vscode-editor-background);
      border-radius: 6px;
      margin-bottom: 10px;
    }
    
    .relationship-info {
      flex: 1;
    }
    
    .relationship-name {
      font-weight: 500;
      margin-bottom: 4px;
    }
    
    .relationship-type {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }
    
    .timeline-item {
      padding: 12px;
      background-color: var(--vscode-editor-background);
      border-radius: 6px;
      margin-bottom: 10px;
      border-left: 3px solid var(--vscode-textLink-foreground);
    }
    
    .timeline-chapter {
      font-weight: 500;
      margin-bottom: 4px;
    }
    
    .timeline-changes {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }
    
    .history-item {
      padding: 12px;
      background-color: var(--vscode-editor-background);
      border-radius: 6px;
      margin-bottom: 10px;
    }
    
    .history-version {
      font-weight: 500;
      margin-bottom: 4px;
    }
    
    .history-date {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }
    
    .marketing-box {
      background: linear-gradient(135deg, var(--vscode-textLink-foreground) 0%, var(--vscode-textLink-activeForeground) 100%);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      color: white;
      display: flex;
      align-items: flex-start;
      gap: 15px;
    }
    
    .marketing-icon {
      font-size: 32px;
      flex-shrink: 0;
    }
    
    .marketing-text {
      flex: 1;
    }
    
    .marketing-text strong {
      display: block;
      font-size: 18px;
      margin-bottom: 10px;
    }
    
    .marketing-text ul {
      margin-left: 20px;
      margin-top: 10px;
    }
    
    .marketing-text li {
      margin-bottom: 5px;
      line-height: 1.5;
    }
    
    .attribute-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background-color: var(--vscode-editor-background);
      border-radius: 6px;
      margin-bottom: 10px;
      border-left: 3px solid var(--vscode-textLink-foreground);
    }
    
    .attribute-info {
      flex: 1;
    }
    
    .attribute-name {
      font-weight: 500;
      margin-bottom: 4px;
    }
    
    .attribute-value {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }
    
    .attribute-category {
      display: inline-block;
      padding: 2px 8px;
      background-color: var(--vscode-editor-inactiveSelectionBackground);
      border-radius: 4px;
      font-size: 11px;
      margin-right: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">✏️ 编辑角色 - ${character.name}</div>
      <button class="btn btn-primary" onclick="saveCharacter()">保存更改</button>
    </div>
    
    <div class="marketing-box">
      <div class="marketing-icon">💡</div>
      <div class="marketing-text">
        <strong>MBTI性格类型系统</strong> - 为您的角色设定鲜明的性格特征,让人物更加立体和真实。通过MBTI类型,您可以:
        <ul>
          <li>塑造性格一致的角色行为</li>
          <li>预测角色在不同情境下的反应</li>
          <li>创造更有深度的角色关系</li>
          <li>让读者更容易记住和理解角色</li>
        </ul>
      </div>
    </div>
    
    <div class="tabs">
      <button class="tab active" onclick="switchTab('basic')">基本信息</button>
      <button class="tab" onclick="switchTab('attributes')">属性管理</button>
      <button class="tab" onclick="switchTab('relationships')">人物关系</button>
      <button class="tab" onclick="switchTab('timeline')">发展时间线</button>
      <button class="tab" onclick="switchTab('history')">历史记录</button>
    </div>
    
    <div id="basic" class="tab-content active">
      <div class="section">
        <div class="form-group">
          <label class="form-label">角色名称</label>
          <input type="text" class="form-input" id="name" value="${character.name}">
        </div>
        
        <div class="form-group">
          <label class="form-label">角色类型</label>
          <select class="form-select" id="role">
            ${roleOptions}
          </select>
        </div>
        
        <div class="form-group">
          <label class="form-label">主MBTI类型</label>
          <select class="form-select" id="mbtiPrimary">
            <option value="">无</option>
            ${mbtiOptions}
          </select>
        </div>
        
        <div class="form-group">
          <label class="form-label">辅助MBTI类型</label>
          <select class="form-select" id="mbtiSecondary">
            <option value="">无</option>
            ${mbtiOptions}
          </select>
        </div>
        
        <div class="form-group">
          <label class="form-label">外貌特征</label>
          <textarea class="form-textarea" id="description">${character.description || ''}</textarea>
        </div>
        
        <div class="form-group">
          <label class="form-label">性格特征</label>
          <textarea class="form-textarea" id="personality">${character.personality || ''}</textarea>
        </div>
        
        <div class="form-group">
          <label class="form-label">背景故事</label>
          <textarea class="form-textarea" id="background">${character.background || ''}</textarea>
        </div>
      </div>
    </div>
    
    <div id="attributes" class="tab-content">
      <div class="section">
        <div class="section-title">属性管理</div>
        <div class="form-group">
          <label class="form-label">添加新属性</label>
          <div style="display: flex; gap: 10px; margin-bottom: 10px;">
            <select class="form-select" id="attributeCategory" style="flex: 1;">
              <option value="title">职称</option>
              <option value="identity">身份</option>
              <option value="ability">能力等级</option>
              <option value="status">状态</option>
              <option value="custom">自定义</option>
            </select>
            <input type="text" class="form-input" id="attributeName" placeholder="属性名称" style="flex: 1;">
            <input type="text" class="form-input" id="attributeValue" placeholder="属性值" style="flex: 1;">
          </div>
          <div class="form-group">
            <label class="form-label">当前章节号（用于记录时间线）</label>
            <input type="number" class="form-input" id="chapterNumber" placeholder="例如: 10">
          </div>
          <div class="form-group">
            <label class="form-label">变更原因</label>
            <input type="text" class="form-input" id="changeReason" placeholder="例如: 角色成长、获得新能力">
          </div>
          <button class="btn btn-primary" onclick="addAttribute()">+ 添加属性</button>
        </div>
        <div id="attributes-list" style="margin-top: 20px;"></div>
      </div>
    </div>
    
    <div id="relationships" class="tab-content">
      <div class="section">
        <div class="section-title">人物关系</div>
        <div id="relationships-list"></div>
        <button class="btn btn-secondary" onclick="addRelationship()">+ 添加关系</button>
      </div>
    </div>
    
    <div id="timeline" class="tab-content">
      <div class="section">
        <div class="section-title">发展时间线</div>
        <div id="timeline-list"></div>
      </div>
    </div>
    
    <div id="history" class="tab-content">
      <div class="section">
        <div class="section-title">历史记录</div>
        <div id="history-list"></div>
      </div>
    </div>
  </div>
  
  <script>
    const vscode = acquireVsCodeApi();
    
    function switchTab(tabId) {
      document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
      
      event.target.classList.add('active');
      document.getElementById(tabId).classList.add('active');
      
      if (tabId === 'attributes' || tabId === 'relationships' || tabId === 'timeline' || tabId === 'history') {
        vscode.postMessage({ command: 'loadData' });
      }
    }
    
    function addAttribute() {
      const category = document.getElementById('attributeCategory').value;
      const name = document.getElementById('attributeName').value;
      const value = document.getElementById('attributeValue').value;
      const chapterNumber = document.getElementById('chapterNumber').value;
      const changeReason = document.getElementById('changeReason').value;
      
      if (!name || !value) {
        alert('请填写属性名称和属性值');
        return;
      }
      
      vscode.postMessage({
        command: 'addAttribute',
        attribute: {
          category,
          name,
          value,
          chapterNumber: chapterNumber ? parseInt(chapterNumber) : undefined,
          changeReason
        }
      });
      
      document.getElementById('attributeName').value = '';
      document.getElementById('attributeValue').value = '';
      document.getElementById('chapterNumber').value = '';
      document.getElementById('changeReason').value = '';
    }
    
    function deleteAttribute(attributeId) {
      vscode.postMessage({ command: 'deleteAttribute', attributeId });
    }
    
    function saveCharacter() {
      const character = {
        name: document.getElementById('name').value,
        role: document.getElementById('role').value,
        mbtiPrimary: document.getElementById('mbtiPrimary').value,
        mbtiSecondary: document.getElementById('mbtiSecondary').value,
        description: document.getElementById('description').value,
        personality: document.getElementById('personality').value,
        background: document.getElementById('background').value
      };
      
      vscode.postMessage({ command: 'updateCharacter', character });
    }
    
    function addRelationship() {
      vscode.postMessage({ command: 'addRelationship' });
    }
    
    function updateRelationship(relationshipId, updates) {
      vscode.postMessage({ command: 'updateRelationship', relationshipId, updates });
    }
    
    function rollback(version) {
      vscode.postMessage({ command: 'rollback', version });
    }
    
    window.addEventListener('message', event => {
      const message = event.data;
      
      if (message.command === 'dataLoaded') {
        const { relationships, timeline, history, attributes } = message.data;
        
        renderAttributes(attributes);
        renderRelationships(relationships);
        renderTimeline(timeline);
        renderHistory(history);
      }
    });
    
    function renderAttributes(attributes) {
      const container = document.getElementById('attributes-list');
      
      if (attributes.length === 0) {
        container.innerHTML = '<p style="color: var(--vscode-descriptionForeground);">暂无属性</p>';
        return;
      }
      
      const categoryLabels = {
        'title': '职称',
        'identity': '身份',
        'ability': '能力等级',
        'status': '状态',
        'custom': '自定义'
      };
      
      container.innerHTML = attributes.map(a => \`
        <div class="attribute-item">
          <div class="attribute-info">
            <div class="attribute-name">
              <span class="attribute-category">\${categoryLabels[a.category] || a.category}</span>
              \${a.name}
            </div>
            <div class="attribute-value">\${a.value}</div>
          </div>
          <button class="btn btn-danger" onclick="deleteAttribute('\${a.id}')">删除</button>
        </div>
      \`).join('');
    }
    
    function renderRelationships(relationships) {
      const container = document.getElementById('relationships-list');
      
      if (relationships.length === 0) {
        container.innerHTML = '<p style="color: var(--vscode-descriptionForeground);">暂无关系</p>';
        return;
      }
      
      container.innerHTML = relationships.map(r => \`
        <div class="relationship-item">
          <div class="relationship-info">
            <div class="relationship-name">\${r.relationshipLabel}</div>
            <div class="relationship-type">强度: \${r.strength}/100</div>
          </div>
          <button class="btn btn-secondary" onclick="updateRelationship('\${r.id}', { strength: \${r.strength + 10} })">增强</button>
        </div>
      \`).join('');
    }
    
    function renderTimeline(timeline) {
      const container = document.getElementById('timeline-list');
      
      if (timeline.length === 0) {
        container.innerHTML = '<p style="color: var(--vscode-descriptionForeground);">暂无时间线记录</p>';
        return;
      }
      
      container.innerHTML = timeline.map(t => \`
        <div class="timeline-item">
          <div class="timeline-chapter">第\${t.chapterNumber}章</div>
          <div class="timeline-changes">\${t.changes.map(c => c.field).join(', ')}</div>
        </div>
      \`).join('');
    }
    
    function renderHistory(history) {
      const container = document.getElementById('history-list');
      
      if (history.length === 0) {
        container.innerHTML = '<p style="color: var(--vscode-descriptionForeground);">暂无历史记录</p>';
        return;
      }
      
      container.innerHTML = history.map(h => \`
        <div class="history-item">
          <div class="history-version">版本 \${h.version} - \${h.changeReason}</div>
          <div class="history-date">\${new Date(h.createdAt).toLocaleString('zh-CN')}</div>
          <div class="btn-group">
            <button class="btn btn-danger" onclick="rollback(\${h.version})">回滚到此版本</button>
          </div>
        </div>
      \`).join('');
      }
    </script>
</body>
</html>`;
  }
}