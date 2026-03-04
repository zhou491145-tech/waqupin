import * as vscode from 'vscode';
import { characterRepository, organizationRepository } from '../repositories';
import { dataStorage, Character, CharacterRelationship } from '../data/storage';
import { logger } from '../utils/logger';

export class RelationshipPanel {
  public static readonly viewType = 'novelAssistant.relationshipPanel';

  private _panel?: vscode.WebviewPanel;
  private static _instance: RelationshipPanel | undefined;

  private constructor(private readonly _extensionUri: vscode.Uri) {}

  public static getInstance(extensionUri: vscode.Uri): RelationshipPanel {
    if (!RelationshipPanel._instance) {
      RelationshipPanel._instance = new RelationshipPanel(extensionUri);
    }
    return RelationshipPanel._instance;
  }

  public show() {
    if (this._panel) {
      this._panel.reveal(vscode.ViewColumn.Active);
      return;
    }

    this._panel = vscode.window.createWebviewPanel(
      RelationshipPanel.viewType,
      '🕸️ 角色关系图谱',
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
          this._updateGraphData();
          break;
        case 'editRelationship':
           vscode.window.showInformationMessage(`编辑关系: ${data.id} (功能开发中)`);
          break;
      }
    });

    this._panel.onDidDispose(() => {
      this._panel = undefined;
    });

    // 初始加载数据
    this._updateGraphData();
  }

  private _updateGraphData() {
    if (!this._panel) return;

    const characters = characterRepository.loadAll();
    const relationships = dataStorage.loadRelationships();
    
    // 简单的转换逻辑
    const nodes = characters.map(c => ({
      id: c.id,
      name: c.name,
      role: c.role,
      val: c.role === 'protagonist' ? 20 : c.role === 'antagonist' ? 18 : c.role === 'supporting' ? 15 : 10,
      color: this._getColorByRole(c.role)
    }));

    const links = relationships.map(r => ({
      source: r.characterId1,
      target: r.characterId2,
      label: r.relationshipLabel,
      type: r.relationshipType
    }));

    this._panel.webview.postMessage({
      command: 'updateData',
      data: { nodes, links }
    });
  }

  private _getColorByRole(role: string): string {
    switch (role) {
      case 'protagonist': return '#e74c3c'; // 红
      case 'antagonist': return '#2c3e50'; // 黑/深蓝
      case 'supporting': return '#3498db'; // 蓝
      default: return '#95a5a6'; // 灰
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; padding: 0; overflow: hidden; background-color: var(--vscode-editor-background); color: var(--vscode-editor-foreground); }
    canvas { display: block; width: 100vw; height: 100vh; }
    .controls { position: absolute; top: 10px; right: 10px; background: var(--vscode-editor-background); padding: 10px; border: 1px solid var(--vscode-widget-border); border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
    button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 6px 12px; cursor: pointer; border-radius: 2px; }
    button:hover { background: var(--vscode-button-hoverBackground); }
    .legend { position: absolute; bottom: 20px; left: 20px; background: var(--vscode-editor-background); padding: 10px; border: 1px solid var(--vscode-widget-border); border-radius: 5px; pointer-events: none; opacity: 0.9; }
    .legend-item { display: flex; align-items: center; margin-bottom: 5px; font-size: 12px; }
    .dot { width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  
  <div class="controls">
    <button onclick="refreshGraph()">🔄 刷新数据</button>
  </div>

  <div class="legend">
    <div class="legend-item"><div class="dot" style="background:#e74c3c"></div>主角</div>
    <div class="legend-item"><div class="dot" style="background:#2c3e50"></div>反派</div>
    <div class="legend-item"><div class="dot" style="background:#3498db"></div>配角</div>
    <div class="legend-item"><div class="dot" style="background:#95a5a6"></div>龙套</div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    
    let width, height;
    let nodes = [];
    let links = [];
    let animationId;
    let draggingNode = null;
    let mouseX = 0, mouseY = 0;

    // 力导向参数
    const REPULSION = 500;
    const SPRING_LENGTH = 150;
    const SPRING_STRENGTH = 0.05;
    const DAMPING = 0.9;
    const CENTER_PULL = 0.02;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    }
    window.addEventListener('resize', resize);
    resize();

    // 交互逻辑
    canvas.addEventListener('mousedown', e => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
      
      // 查找点击的节点
      for (const node of nodes) {
        const dx = mouseX - node.x;
        const dy = mouseY - node.y;
        if (dx*dx + dy*dy < node.radius * node.radius * 4) { // 稍微扩大点击区域
          draggingNode = node;
          break;
        }
      }
    });

    canvas.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    });

    canvas.addEventListener('mouseup', () => {
      draggingNode = null;
    });

    function initData(data) {
      // 保留现有节点位置以防跳变
      const oldNodes = new Map(nodes.map(n => [n.id, n]));
      
      nodes = data.nodes.map(n => {
        const old = oldNodes.get(n.id);
        return {
          ...n,
          x: old ? old.x : width/2 + (Math.random() - 0.5) * 100,
          y: old ? old.y : height/2 + (Math.random() - 0.5) * 100,
          vx: 0,
          vy: 0,
          radius: n.val || 10
        };
      });

      links = data.links.map(l => {
        return {
          source: nodes.find(n => n.id === l.source),
          target: nodes.find(n => n.id === l.target),
          label: l.label
        };
      }).filter(l => l.source && l.target);

      if (!animationId) loop();
    }

    function update() {
      // 1. 斥力 (节点之间互斥)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let distSq = dx*dx + dy*dy;
          if (distSq === 0) { dx = 1; distSq = 1; } // 防止重叠
          
          const force = REPULSION / distSq;
          const fx = (dx / Math.sqrt(distSq)) * force;
          const fy = (dy / Math.sqrt(distSq)) * force;

          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }
      }

      // 2. 引力 (连线拉扯)
      for (const link of links) {
        const a = link.source;
        const b = link.target;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        const force = (dist - SPRING_LENGTH) * SPRING_STRENGTH;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }

      // 3. 中心引力 & 阻尼 & 位置更新
      for (const node of nodes) {
        if (node === draggingNode) {
          node.x = mouseX;
          node.y = mouseY;
          node.vx = 0;
          node.vy = 0;
          continue;
        }

        // 向中心聚集
        node.vx += (width/2 - node.x) * CENTER_PULL;
        node.vy += (height/2 - node.y) * CENTER_PULL;

        // 阻尼
        node.vx *= DAMPING;
        node.vy *= DAMPING;

        // 移动
        node.x += node.vx;
        node.y += node.vy;

        // 边界限制
        const margin = node.radius;
        if (node.x < margin) node.x = margin;
        if (node.y < margin) node.y = margin;
        if (node.x > width - margin) node.x = width - margin;
        if (node.y > height - margin) node.y = height - margin;
      }
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);

      // 画线
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      for (const link of links) {
        ctx.beginPath();
        ctx.moveTo(link.source.x, link.source.y);
        ctx.lineTo(link.target.x, link.target.y);
        ctx.stroke();

        // 关系文字
        if (link.label) {
          const midX = (link.source.x + link.target.x) / 2;
          const midY = (link.source.y + link.target.y) / 2;
          ctx.fillStyle = 'var(--vscode-editor-background)';
          ctx.fillRect(midX - 10, midY - 8, 20, 16); // 简单背景遮挡
          ctx.fillStyle = '#888';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(link.label, midX, midY);
        }
      }

      // 画点
      for (const node of nodes) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color || '#999';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 名字
        ctx.fillStyle = 'var(--vscode-editor-foreground)';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(node.name, node.x, node.y + node.radius + 4);
      }
    }

    function loop() {
      update();
      draw();
      animationId = requestAnimationFrame(loop);
    }

    window.addEventListener('message', event => {
      const message = event.data;
      if (message.command === 'updateData') {
        initData(message.data);
      }
    });

    function refreshGraph() {
      vscode.postMessage({ command: 'refresh' });
    }

    refreshGraph();
  </script>
</body>
</html>`;
  }
}
