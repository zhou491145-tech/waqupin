/**
 * 写作风格套装管理面板
 * 风格套装的查看和管理界面
 */

import * as vscode from 'vscode';
import { writingStylesService } from '../services/writingStylesService';
import { getAllCategories } from '../services/writingStylePresets';
import { logger } from '../utils/logger';
import { getWritingStylesHtml } from './writingStylesPackageHtml';
import { isEntitledSync, PRO_FEATURE_REQUIRED_MESSAGE } from '../auth/verify';

interface PackageData {
  id: string;
  name: string;
  description: string;
  icon?: string;
  category: string;
  tags?: string[];
  isCustom: boolean;
  isActive: boolean;
}

export class WritingStylesPackagePanel implements vscode.WebviewViewProvider {
  public static readonly viewType = 'novelAssistant.writingStylesPackage';

  private _view?: vscode.WebviewView;
  private _panel?: vscode.WebviewPanel;
  private static _instance: WritingStylesPackagePanel | undefined;

  private constructor(private readonly _extensionUri: vscode.Uri) {}

  public static getInstance(extensionUri: vscode.Uri): WritingStylesPackagePanel {
    if (!WritingStylesPackagePanel._instance) {
      WritingStylesPackagePanel._instance = new WritingStylesPackagePanel(extensionUri);
    }
    return WritingStylesPackagePanel._instance;
  }

  public show(): void {
    if (this._panel) {
      this._panel.reveal(vscode.ViewColumn.Active);
      return;
    }

    this._panel = vscode.window.createWebviewPanel(
      WritingStylesPackagePanel.viewType,
      '✍️ 写作风格',
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        localResourceRoots: [this._extensionUri],
        retainContextWhenHidden: true
      }
    );

    this._panel.webview.html = getWritingStylesHtml(this._panel.webview);

    this._panel.webview.onDidReceiveMessage(async (data) => {
      await this._handleMessage(data);
    });

    this._panel.onDidChangeViewState(() => {
      if (this._panel && this._panel.visible) {
        logger.debug('🔄 风格面板重新显示，主动推送数据');
        this._sendPackages();
      }
    });

    this._panel.onDidDispose(() => {
      this._panel = undefined;
    });
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = getWritingStylesHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      await this._handleMessage(data);
    });
  }

  public refresh(): void {
    this._sendPackages();
  }

  private async _handleMessage(data: any): Promise<void> {
    const command = data?.command;

    const requiresPro = new Set([
      'activatePackage',
      'createCustom',
      'editPackage',
      'deletePackage',
      'exportPackages',
      'importPackages'
    ]);

    if (requiresPro.has(command) && !isEntitledSync('styleTemplates')) {
      vscode.window.showInformationMessage(PRO_FEATURE_REQUIRED_MESSAGE);
      return;
    }

    try {
      switch (command) {
        case 'getPackages':
          this._sendPackages();
          break;

        case 'activatePackage':
          await this._activatePackage(data.id);
          break;

        case 'createCustom':
          await this._createCustom(data.baseId);
          break;

        case 'editPackage':
          await this._editPackage(data.id);
          break;

        case 'deletePackage':
          await this._deletePackage(data.id);
          break;

        case 'exportPackages':
          await this._exportPackages();
          break;

        case 'importPackages':
          await this._importPackages();
          break;

        default:
          logger.warn(`⚠️ 未知命令: ${command}`);
      }
    } catch (error) {
      logger.error(`❌ 处理命令失败: ${error}`);
      this._showError(error instanceof Error ? error.message : '操作失败，请重试');
    }
  }

  private _sendPackages(): void {
    try {
      const packages = writingStylesService.getAllPackages();
      const categories = getAllCategories();
      const grouped: Record<string, PackageData[]> = {};

      categories.forEach(cat => {
        grouped[cat] = packages
          .filter(p => p.category === cat)
          .map(this._toPackageData);
      });

      const customPackages = packages
        .filter(p => p.isCustom)
        .map(this._toPackageData);

      if (customPackages.length > 0) {
        grouped['我的自定义'] = customPackages;
      }

      const message = {
        command: 'updatePackages',
        packages: grouped
      };

      if (this._view) {
        this._view.webview.postMessage(message);
      }

      if (this._panel) {
        this._panel.webview.postMessage(message);
      }

      logger.debug('✅ 写作风格套装数据已发送');
    } catch (error) {
      logger.error(`❌ 发送套装数据失败: ${error}`);
      this._showError('加载失败，请重试');
    }
  }

  private _toPackageData(pkg: any): PackageData {
    return {
      id: pkg.id,
      name: pkg.name,
      description: pkg.description || '',
      icon: pkg.icon,
      category: pkg.category,
      tags: pkg.tags || [],
      isCustom: pkg.isCustom || false,
      isActive: pkg.isActive || false
    };
  }

  private async _activatePackage(id: string): Promise<void> {
    logger.log(`⚡ 激活风格套装: ${id}`);

    if (writingStylesService.activatePackage(id)) {
      vscode.window.showInformationMessage('风格套装已激活');
      this._sendPackages();
    } else {
      vscode.window.showErrorMessage('激活失败');
    }
  }

  private async _createCustom(baseId: string): Promise<void> {
    logger.log(`📝 创建自定义套装，基于: ${baseId}`);

    const name = await vscode.window.showInputBox({
      prompt: '输入自定义套装名称',
      placeHolder: '例如: 我的都市风格',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return '请输入套装名称';
        }
        return null;
      }
    });

    if (!name) {
      logger.debug('用户取消创建');
      return;
    }

    if (writingStylesService.createCustomPackage(baseId, name.trim())) {
      vscode.window.showInformationMessage('创建成功！可在"我的自定义"分类中找到并编辑');
      this._sendPackages();
    } else {
      vscode.window.showErrorMessage('创建失败');
    }
  }

  private async _editPackage(id: string): Promise<void> {
    logger.log(`✏️ 编辑风格套装: ${id}`);

    const packages = writingStylesService.getAllPackages();
    const pkg = packages.find(p => p.id === id);

    if (!pkg) {
      vscode.window.showErrorMessage('套装不存在');
      return;
    }

    if (!pkg.isCustom) {
      const confirm = await vscode.window.showInformationMessage(
        '预设套装不能直接编辑。是否基于此套装创建自定义版本？',
        { modal: true },
        '创建',
        '取消'
      );

      if (confirm === '创建') {
        await this._createCustom(id);
      }
      return;
    }

    await vscode.commands.executeCommand('novelAssistant.openStyleLab', id);
  }

  private async _deletePackage(id: string): Promise<void> {
    logger.log(`🗑️ 删除风格套装: ${id}`);

    const confirm = await vscode.window.showWarningMessage(
      '确定要删除这个自定义套装吗？此操作不可恢复。',
      { modal: true },
      '确定',
      '取消'
    );

    if (confirm === '确定') {
      if (writingStylesService.deleteCustomPackage(id)) {
        vscode.window.showInformationMessage('删除成功');
        this._sendPackages();
      } else {
        vscode.window.showErrorMessage('删除失败');
      }
    } else {
      logger.debug('用户取消删除');
    }
  }

  private async _exportPackages(): Promise<void> {
    logger.log('📤 导出风格套装');

    try {
      const json = writingStylesService.exportCustomPackages();

      const saveUri = await vscode.window.showSaveDialog({
        filters: { 'JSON 文件': ['json'] },
        defaultUri: vscode.Uri.file('custom-style-packages.json'),
        saveLabel: '导出'
      });

      if (saveUri) {
        await vscode.workspace.fs.writeFile(
          saveUri,
          Buffer.from(json, 'utf-8')
        );
        vscode.window.showInformationMessage('导出成功');
        logger.log('✅ 套装已导出');
      } else {
        logger.debug('用户取消导出');
      }
    } catch (error) {
      logger.error(`❌ 导出失败: ${error}`);
      vscode.window.showErrorMessage('导出失败');
    }
  }

  private async _importPackages(): Promise<void> {
    logger.log('📥 导入风格套装');

    try {
      const files = await vscode.window.showOpenDialog({
        filters: { 'JSON 文件': ['json'] },
        canSelectMany: false,
        openLabel: '导入'
      });

      if (files && files.length > 0) {
        const content = await vscode.workspace.fs.readFile(files[0]);
        const json = Buffer.from(content).toString('utf-8');

        if (writingStylesService.importCustomPackages(json)) {
          vscode.window.showInformationMessage('导入成功');
          this._sendPackages();
          logger.log('✅ 套装已导入');
        } else {
          vscode.window.showErrorMessage('导入失败，文件格式不正确');
        }
      } else {
        logger.debug('用户取消导入');
      }
    } catch (error) {
      logger.error(`❌ 导入失败: ${error}`);
      vscode.window.showErrorMessage('导入失败');
    }
  }

  private _showError(message: string): void {
    const errorMessage = {
      command: 'showError',
      message: message
    };

    if (this._view) {
      this._view.webview.postMessage(errorMessage);
    }

    if (this._panel) {
      this._panel.webview.postMessage(errorMessage);
    }
  }
}
