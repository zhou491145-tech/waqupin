import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { logger } from '../utils/logger';
import { aiService } from './aiService';
import { analysisService } from './analysisService';
import { dataStorage } from '../data/storage';
import { worldSettingMarkdownService } from './worldSettingMarkdownService';
import { outlineMarkdownService } from './outlineMarkdownService';
import { panelRefreshService } from './panelRefreshService';
import { projectConfigMarkdownService } from './projectConfigMarkdownService';
import { fileManagementService } from './fileManagementService';

export interface ImportResult {
  success: boolean;
  type: string;
  itemsImported: number;
  errors: string[];
}

class ImportService {
  /**
   * 根据文件名检测文档类型
   */
  private detectTypeByFileName(fileName: string): string | null {
    const lower = fileName.toLowerCase();

    if (lower.includes('大纲') || lower.includes('outline')) {
      return 'outline';
    }
    if (lower.includes('人物') || lower.includes('角色') || lower.includes('character')) {
      return 'character';
    }
    if (lower.includes('世界观') || lower.includes('设定') || lower.includes('world')) {
      return 'worldSetting';
    }
    if (lower.includes('组织') || lower.includes('势力') || lower.includes('organization')) {
      return 'organization';
    }
    if (/第?\d+章/.test(fileName) || /chapter\d+/i.test(fileName)) {
      return 'chapter';
    }

    return null;
  }

  /**
   * 使用AI检测文档类型
   */
  private async detectTypeByAI(content: string): Promise<{ type: string; confidence: number }> {
    const prompt = `分析以下文档内容,判断其类型。返回JSON格式:{"type":"类型","confidence":0-1之间的置信度}

可能的类型:
- outline: 大纲(包含章节规划、情节概要、卷纲)
- character: 人物设定(角色信息、性格、背景)
- worldSetting: 世界观(时代、地点、规则设定)
- organization: 组织势力(门派、家族、组织架构)
- chapter: 章节内容(完整的故事正文)
- other: 其他

文档内容(前2000字):
${content.slice(0, 2000)}

只返回JSON,不要其他解释。`;

    // 检查API配置
    const ok = aiService.loadConfig();
    if (!ok) {
      logger.log('⚠️ API未配置，无法使用AI识别文档类型');
      return { type: 'other', confidence: 0 };
    }

    try {
      const result = await aiService.callChat('你是文档分类助手,擅长识别小说创作资料的类型。', prompt);
      if (!result) {
        return { type: 'other', confidence: 0 };
      }

      // 清理并解析JSON
      const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return parsed;
    } catch (error) {
      logger.log(`⚠️ AI类型检测失败: ${error}`);
      return { type: 'other', confidence: 0 };
    }
  }

  /**
   * 智能导入单个文档
   */
  async importDocument(filePath: string): Promise<ImportResult> {
    logger.log(`📥 开始导入文档: ${filePath}`);

    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    
    // 将文件复制到AAA文件夹中，保留原始目录结构
    await this.copyFileToAAAFolder(filePath);

    // 第一步: 文件名规则匹配
    let docType = this.detectTypeByFileName(fileName);

    if (!docType) {
      // 第二步: AI内容分析
      logger.log('🤖 使用AI分析文档类型...');
      const aiDetection = await this.detectTypeByAI(content);

      if (aiDetection.confidence > 0.7) {
        docType = aiDetection.type;
        logger.log(`✅ AI识别类型: ${docType} (置信度: ${aiDetection.confidence})`);
      } else {
        // 第三步: 用户选择
        const userChoice = await vscode.window.showQuickPick(
          [
            { label: '大纲', value: 'outline' },
            { label: '人物设定', value: 'character' },
            { label: '世界观设定', value: 'worldSetting' },
            { label: '组织势力', value: 'organization' },
            { label: '章节内容', value: 'chapter' },
            { label: '跳过', value: 'skip' }
          ],
          { placeHolder: `无法自动识别"${fileName}",请选择文档类型` }
        );

        if (!userChoice || userChoice.value === 'skip') {
          return { success: false, type: 'skipped', itemsImported: 0, errors: ['用户跳过'] };
        }

        docType = userChoice.value;
      }
    }

    // 根据类型执行导入
    return await this.importByType(content, docType, fileName);
  }

  /**
   * 根据类型导入
   */
  private async importByType(content: string, type: string, fileName: string): Promise<ImportResult> {
    const errors: string[] = [];

    try {
      switch (type) {
        case 'outline':
          return await this.importOutline(content);
        case 'character':
          return await this.importCharacters(content);
        case 'worldSetting':
          return await this.importWorldSetting(content);
        case 'organization':
          return await this.importOrganizations(content);
        case 'chapter':
          return await this.importChapter(content, fileName);
        default:
          errors.push(`未知类型: ${type}`);
          return { success: false, type, itemsImported: 0, errors };
      }
    } catch (error: any) {
      errors.push(error.message || String(error));
      logger.log(`❌ 导入失败: ${error}`);
      return { success: false, type, itemsImported: 0, errors };
    }
  }

  /**
   * 导入大纲（支持大文件）
   */
  private async importOutline(content: string): Promise<ImportResult> {
    logger.log('📋 开始导入大纲...');

    // 检查API配置
    const ok = aiService.loadConfig();
    if (!ok) {
      logger.log('❌ API未配置，无法导入大纲');
      vscode.window.showErrorMessage('请先配置 API 并执行“测试 API 连接”命令');
      return { success: false, type: 'outline', itemsImported: 0, errors: ['API未配置'] };
    }

    // 智能拆分大文件
    const MAX_OUTLINE_LENGTH = 15000; // 大纲文件拆分阈值
    if (content.length > MAX_OUTLINE_LENGTH) {
      return await this.importLargeOutline(content);
    }

    // 正常大小文件，直接处理
    return await this.importSingleOutline(content);
  }

  /**
   * 处理大文件大纲导入
   */
  private async importLargeOutline(content: string): Promise<ImportResult> {
    logger.log(`📏 大纲文件过大（${content.length}字符），开始智能拆分...`);
    
    // 按卷/章结构拆分大纲
    const segments = this.splitOutlineByStructure(content);
    logger.log(`✅ 成功拆分为 ${segments.length} 个片段`);

    let totalItems = 0;
    const errors: string[] = [];
    
    for (let i = 0; i < segments.length; i++) {
      logger.log(`📄 处理大纲片段 ${i + 1}/${segments.length}...`);
      
      // 对每个片段执行完整的AI分析（保持模板完整性）
      const result = await this.importSingleOutline(segments[i]);
      
      if (result.success) {
        totalItems += result.itemsImported;
      } else {
        errors.push(`片段 ${i + 1} 处理失败: ${result.errors.join(', ')}`);
      }
    }

    return {
      success: totalItems > 0,
      type: 'outline',
      itemsImported: totalItems,
      errors
    };
  }

  /**
   * 按卷/章结构拆分大纲
   */
  private splitOutlineByStructure(content: string): string[] {
    const segments: string[] = [];
    const lines = content.split('\n');
    
    let currentSegment = '';
    let currentLength = 0;
    const MAX_SEGMENT_LENGTH = 15000;

    for (const line of lines) {
      // 检测大纲结构标记（卷、章）
      const isStructureLine = /^(第?\d+卷|卷\d+|第?\d+章|chapter\d+)/i.test(line);
      
      // 如果是结构标记且当前段已接近阈值，保存当前段并开始新段
      if (isStructureLine && currentLength > MAX_SEGMENT_LENGTH * 0.8) {
        segments.push(currentSegment.trim());
        currentSegment = line + '\n';
        currentLength = line.length + 1;
      } else {
        currentSegment += line + '\n';
        currentLength += line.length + 1;
      }
    }
    
    // 保存最后一段
    if (currentSegment.trim()) {
      segments.push(currentSegment.trim());
    }
    
    return segments;
  }

  /**
   * 导入单个大纲片段
   */
  private async importSingleOutline(content: string): Promise<ImportResult> {
    // 使用完整的分析模板，保持小说创作的上下连贯
    const prompt = `提取大纲结构,返回JSON数组:
[
  {
    "volumeNumber": 1,
    "chapterNumber": 1,
    "title": "章节标题",
    "content": "情节概要",
    "type": "chapter"
  }
]

支持卷纲(type: "volume")和章纲(type: "chapter")。
如果只有章节没有卷,volumeNumber可为null。

大纲内容:
${content}

只返回JSON数组,不要其他解释。`;

    const result = await aiService.callChat('你是大纲解析助手', prompt);
    if (!result) {
      return { success: false, type: 'outline', itemsImported: 0, errors: ['AI调用失败'] };
    }

    try {
      const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const outlines = JSON.parse(cleaned);

      let count = 0;
      for (const item of outlines) {
        dataStorage.addOutline({
          id: dataStorage.generateOutlineId(),
          volumeNumber: item.volumeNumber || undefined,
          chapterNumber: item.chapterNumber || undefined,
          title: item.title,
          content: item.content,
          type: item.type || 'chapter',
          orderIndex: Date.now() + count, // 确保顺序正确
          status: 'finalized',
          createdAt: new Date().toISOString()
        });
        count++;
      }

      // 初始化大纲MD服务并生成Markdown文件
      outlineMarkdownService.init();
      const allOutlines = dataStorage.loadOutlines();
      outlineMarkdownService.generateFromOutlines(allOutlines);
      
      // 触发大纲面板刷新
      panelRefreshService.refreshOutline();
      
      logger.log(`✅ 成功导入 ${count} 个大纲条目`);
      return { success: true, type: 'outline', itemsImported: count, errors: [] };
    } catch (error: any) {
      logger.log(`❌ 解析大纲失败: ${error}`);
      return { success: false, type: 'outline', itemsImported: 0, errors: [error.message] };
    }
  }

  /**
   * 导入人物设定
   */
  private async importCharacters(content: string): Promise<ImportResult> {
    logger.log('👥 开始导入人物设定...');

    // 检查API配置
    const ok = aiService.loadConfig();
    if (!ok) {
      logger.log('❌ API未配置，无法导入人物设定');
      vscode.window.showErrorMessage('请先配置 API 并执行“测试 API 连接”命令');
      return { success: false, type: 'character', itemsImported: 0, errors: ['API未配置'] };
    }

    const prompt = `提取人物信息,返回JSON数组,包含2个MBTI类型(主类型+辅助类型):
[
  {
    "name": "姓名",
    "aliases": ["别名1", "别名2"],
    "role": "protagonist/antagonist/supporting/minor",
    "description": "外貌特征",
    "personality": "性格描述",
    "background": "背景故事",
    "mbtiPrimary": "主MBTI类型(如INTJ)",
    "mbtiSecondary": "辅助MBTI类型(如INTP)"
  }
]

人物设定:
${content}

只返回JSON数组,不要其他解释。`;

    const result = await aiService.callChat('你是人物信息提取助手', prompt);
    if (!result) {
      return { success: false, type: 'character', itemsImported: 0, errors: ['AI调用失败'] };
    }

    try {
      const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const characters = JSON.parse(cleaned);

      let count = 0;
      for (const char of characters) {
        dataStorage.addCharacter({
          id: `C${String(Date.now()).slice(-8)}_${Math.random().toString(36).slice(2, 6)}`,
          name: char.name,
          aliases: char.aliases || [],
          role: char.role || 'supporting',
          description: char.description || '',
          personality: char.personality || '',
          background: char.background || '',
          mbtiPrimary: char.mbtiPrimary || '',
          mbtiSecondary: char.mbtiSecondary || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        count++;
      }

      logger.log(`✅ 成功导入 ${count} 个角色，每个角色包含2个MBTI性格标签`);
      return { success: true, type: 'character', itemsImported: count, errors: [] };
    } catch (error: any) {
      logger.log(`❌ 解析人物失败: ${error}`);
      return { success: false, type: 'character', itemsImported: 0, errors: [error.message] };
    }
  }

  /**
   * 导入世界观设定
   */
  private async importWorldSetting(content: string): Promise<ImportResult> {
    logger.log('🌍 开始导入世界观设定...');

    // 检查API配置
    const ok = aiService.loadConfig();
    if (!ok) {
      logger.log('❌ API未配置，无法导入世界观');
      vscode.window.showErrorMessage('请先配置 API 并执行“测试 API 连接”命令');
      return { success: false, type: 'worldSetting', itemsImported: 0, errors: ['API未配置'] };
    }

    const prompt = `提取世界观设定,返回JSON:
{
  "timePeriod": "时代背景",
  "location": "地理位置",
  "atmosphere": "整体氛围",
  "rules": ["规则1", "规则2", "规则3"],
  "additionalInfo": "其他补充信息"
}

世界观内容:
${content}

只返回JSON,不要其他解释。`;

    const result = await aiService.callChat('你是世界观信息提取助手', prompt);
    if (!result) {
      return { success: false, type: 'worldSetting', itemsImported: 0, errors: ['AI调用失败'] };
    }

    try {
      const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const setting = JSON.parse(cleaned);

      worldSettingMarkdownService.init();
      worldSettingMarkdownService.save({
        timePeriod: setting.timePeriod || '',
        location: setting.location || '',
        atmosphere: setting.atmosphere || '',
        rules: setting.rules || [],
        additionalInfo: setting.additionalInfo || ''
      });

      logger.log(`✅ 世界观设定已导入`);
      return { success: true, type: 'worldSetting', itemsImported: 1, errors: [] };
    } catch (error: any) {
      logger.log(`❌ 解析世界观失败: ${error}`);
      return { success: false, type: 'worldSetting', itemsImported: 0, errors: [error.message] };
    }
  }

  /**
   * 导入组织势力
   */
  private async importOrganizations(content: string): Promise<ImportResult> {
    logger.log('🏛️ 开始导入组织势力...');

    // 检查API配置
    const ok = aiService.loadConfig();
    if (!ok) {
      logger.log('❌ API未配置，无法导入组织');
      vscode.window.showErrorMessage('请先配置 API 并执行“测试 API 连接”命令');
      return { success: false, type: 'organization', itemsImported: 0, errors: ['API未配置'] };
    }

    const prompt = `提取组织信息,返回JSON数组:
[
  {
    "name": "组织名称",
    "type": "faction/family/sect/government/other",
    "powerLevel": 0-100,
    "location": "所在地",
    "motto": "宗旨口号",
    "description": "详细描述"
  }
]

组织内容:
${content}

只返回JSON数组,不要其他解释。`;

    const result = await aiService.callChat('你是组织信息提取助手', prompt);
    if (!result) {
      return { success: false, type: 'organization', itemsImported: 0, errors: ['AI调用失败'] };
    }

    try {
      const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const orgs = JSON.parse(cleaned);

      let count = 0;
      for (const org of orgs) {
        dataStorage.addOrganization({
          id: dataStorage.generateOrganizationId(),
          name: org.name,
          type: org.type || 'other',
          level: 0,
          powerLevel: org.powerLevel || 50,
          memberCount: 0,
          location: org.location || '',
          motto: org.motto || '',
          description: org.description || '',
          members: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        count++;
      }

      logger.log(`✅ 成功导入 ${count} 个组织`);
      return { success: true, type: 'organization', itemsImported: count, errors: [] };
    } catch (error: any) {
      logger.log(`❌ 解析组织失败: ${error}`);
      return { success: false, type: 'organization', itemsImported: 0, errors: [error.message] };
    }
  }

  /**
   * 导入章节内容
   */
  private async importChapter(content: string, fileName: string): Promise<ImportResult> {
    logger.log(`📖 开始导入章节: ${fileName}`);

    // 提取章节号
    const chapterNum = this.extractChapterNumber(fileName, content);
    if (!chapterNum) {
      return {
        success: false,
        type: 'chapter',
        itemsImported: 0,
        errors: ['无法提取章节号']
      };
    }

    // 使用AI分析章节
    const analysis = await analysisService.analyzeChapter(chapterNum, fileName, content);

    if (!analysis) {
      return {
        success: false,
        type: 'chapter',
        itemsImported: 0,
        errors: ['章节分析失败']
      };
    }

    // 保存摘要
    const paceLevel: 'slow' | 'moderate' | 'fast' =
      analysis.scores.pacing >= 7 ? 'fast' : analysis.scores.pacing >= 4 ? 'moderate' : 'slow';

    dataStorage.addSummary({
      id: dataStorage.generateSummaryId(),
      chapterNumber: chapterNum,
      chapterTitle: fileName.replace(/\.(md|txt)$/i, ''),
      summary: analysis.summary || '',
      wordCount: content.length,
      keyCharacters: analysis.characterStates.map((c) => c.character_name),
      keyEvents: analysis.plotPoints.slice(0, 3).map((p) => p.content),
      mainConflict: analysis.conflict?.description || '',
      emotionalTone: analysis.emotionalArc?.primary_emotion || '',
      paceLevel,
      createdAt: new Date().toISOString()
    });

    // 保存伏笔
    const planted = analysis.foreshadows.filter((f) => f.type === 'planted');
    for (const fs of planted) {
      const importance: 'high' | 'medium' | 'low' =
        fs.strength >= 7 ? 'high' : fs.strength >= 5 ? 'medium' : 'low';

      dataStorage.addForeshadow({
        id: dataStorage.generateForeshadowId(),
        description: fs.content,
        status: 'pending',
        importance,
        plantedChapter: chapterNum,
        relatedCharacters: [],
        keyword: fs.keyword,
        notes: [`强度: ${fs.strength}/10`, `隐藏度: ${fs.subtlety}/10`],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    logger.log(`✅ 章节导入完成: 摘要1个, 伏笔${planted.length}个`);
    return {
      success: true,
      type: 'chapter',
      itemsImported: 1 + planted.length,
      errors: []
    };
  }

  /**
   * 批量导入文件夹
   */
  async importFolder(folderPath: string): Promise<ImportResult[]> {
    logger.log(`📂 开始批量导入文件夹: ${folderPath}`);

    const files = fs
      .readdirSync(folderPath)
      .filter((f) => f.endsWith('.md') || f.endsWith('.txt'))
      .map((f) => path.join(folderPath, f));

    const results: ImportResult[] = [];

    for (const file of files) {
      const result = await this.importDocument(file);
      results.push(result);
    }

    const successCount = results.filter((r) => r.success).length;
    logger.log(`✅ 批量导入完成: ${successCount}/${files.length} 成功`);

    return results;
  }

  /**
   * 将文件复制到AAA文件夹，保留原始目录结构
   */
  private async copyFileToAAAFolder(filePath: string): Promise<boolean> {
    try {
      // 使用文件管理服务导入用户文件
      const result = await fileManagementService.importUserFile(filePath);
      if (result) {
        logger.log(`📋 文件已导入到用户目录: ${result}`);
        return true;
      } else {
        logger.log('❌ 文件管理服务导入文件失败');
        return false;
      }
    } catch (error) {
      logger.log(`❌ 导入文件失败: ${error}`);
      return false;
    }
  }

  /**
   * 从文件名或内容提取章节号
   */
  private extractChapterNumber(fileName: string, content: string): number | null {
    // 尝试从文件名提取
    const fileMatch = fileName.match(/第?(\d+)章/);
    if (fileMatch) {
      return parseInt(fileMatch[1], 10);
    }

    const fileMatch2 = fileName.match(/chapter[_-]?(\d+)/i);
    if (fileMatch2) {
      return parseInt(fileMatch2[1], 10);
    }

    // 尝试从内容前500字提取
    const contentMatch = content.slice(0, 500).match(/第(\d+)章/);
    if (contentMatch) {
      return parseInt(contentMatch[1], 10);
    }

    return null;
  }

  /**
   * 阶段1：基础设定导入入口
   */
  async startBasicSettingsImport(): Promise<void> {
    // 1. 提示用户选择文件/文件夹
    const fileUris = await vscode.window.showOpenDialog({
      canSelectMany: true,
      openLabel: '选择基础设定文件（人物、世界观、组织）',
      filters: {
        '文档文件': ['md', 'txt']
      }
    });

    if (!fileUris || fileUris.length === 0) {
      return;
    }

    // 2. 检测文件类型并预览
    const filesInfo = [];
    for (const uri of fileUris) {
      const content = fs.readFileSync(uri.fsPath, 'utf-8');
      const fileName = path.basename(uri.fsPath);
      const docType = this.detectTypeByFileName(fileName);
      
      filesInfo.push({
        path: uri.fsPath,
        name: fileName,
        type: docType || '未知类型',
        size: content.length
      });
    }

    // 3. 展示预览信息并询问用户确认
    const previewMsg = `即将导入 ${filesInfo.length} 个基础设定文件：\n` + 
      filesInfo.map(f => `- ${f.name} (${f.type}, ${Math.round(f.size / 1024)}KB)`).join('\n');
    
    const confirm = await vscode.window.showInformationMessage(
      previewMsg,
      { modal: true },
      '开始导入',
      '取消'
    );

    if (confirm !== '开始导入') {
      return;
    }

    // 4. 执行导入
    logger.log('============================================================');
    logger.log('🚀 开始基础设定导入阶段');
    logger.log('============================================================');
    
    let successCount = 0;
    for (const fileInfo of filesInfo) {
      logger.log(`📥 导入文件: ${fileInfo.name}`);
      
      const result = await this.importDocument(fileInfo.path);
      if (result.success) {
        successCount++;
        logger.log(`✅ ${fileInfo.name} 导入成功`);
      } else {
        logger.log(`❌ ${fileInfo.name} 导入失败: ${result.errors.join(', ')}`);
      }
    }

    // 5. 自动生成配置
    await this.autoGenerateConfigFromFiles(filesInfo.map(f => f.path));

    // 6. 展示结果
    logger.log(`🎉 基础设定导入完成: ${successCount}/${filesInfo.length} 成功`);
    logger.log('============================================================');
    vscode.window.showInformationMessage(`基础设定导入完成: ${successCount}/${filesInfo.length} 成功`);
  }

  /**
   * 阶段2：大纲卷纲导入入口
   */
  async startOutlineImport(): Promise<void> {
    // 1. 提示用户选择文件
    const fileUris = await vscode.window.showOpenDialog({
      canSelectMany: true,
      openLabel: '选择大纲卷纲文件',
      filters: {
        '文档文件': ['md', 'txt']
      }
    });

    if (!fileUris || fileUris.length === 0) {
      return;
    }

    // 2. 检测文件类型并预览
    const filesInfo = [];
    for (const uri of fileUris) {
      const content = fs.readFileSync(uri.fsPath, 'utf-8');
      const fileName = path.basename(uri.fsPath);
      const docType = this.detectTypeByFileName(fileName);
      
      filesInfo.push({
        path: uri.fsPath,
        name: fileName,
        type: docType || '未知类型',
        size: content.length
      });
    }

    // 3. 展示预览信息并询问用户确认
    const previewMsg = `即将导入 ${filesInfo.length} 个大纲卷纲文件：\n` + 
      filesInfo.map(f => `- ${f.name} (${f.type}, ${Math.round(f.size / 1024)}KB)`).join('\n');
    
    const confirm = await vscode.window.showInformationMessage(
      previewMsg,
      { modal: true },
      '开始导入',
      '取消'
    );

    if (confirm !== '开始导入') {
      return;
    }

    // 4. 执行导入
    logger.log('============================================================');
    logger.log('📋 开始大纲卷纲导入阶段');
    logger.log('============================================================');
    
    let successCount = 0;
    for (const fileInfo of filesInfo) {
      logger.log(`📥 导入文件: ${fileInfo.name}`);
      
      const result = await this.importDocument(fileInfo.path);
      if (result.success) {
        successCount++;
        logger.log(`✅ ${fileInfo.name} 导入成功`);
      } else {
        logger.log(`❌ ${fileInfo.name} 导入失败: ${result.errors.join(', ')}`);
      }
    }

    // 5. 自动生成配置
    await this.autoGenerateConfigFromFiles(filesInfo.map(f => f.path));

    // 6. 展示结果
    logger.log(`🎉 大纲卷纲导入完成: ${successCount}/${filesInfo.length} 成功`);
    logger.log('============================================================');
    vscode.window.showInformationMessage(`大纲卷纲导入完成: ${successCount}/${filesInfo.length} 成功`);
  }

  /**
   * 阶段3-1：章节快速导入入口
   */
  async startChapterQuickImport(): Promise<void> {
    // 1. 提示用户选择文件/文件夹
    const fileUris = await vscode.window.showOpenDialog({
      canSelectMany: true,
      canSelectFolders: true,
      openLabel: '选择章节文件或文件夹',
      filters: {
        '文档文件': ['md', 'txt']
      }
    });

    if (!fileUris || fileUris.length === 0) {
      return;
    }

    // 2. 收集所有章节文件
    const chapterFiles = [];
    for (const uri of fileUris) {
      const stats = fs.statSync(uri.fsPath);
      
      if (stats.isDirectory()) {
        // 处理文件夹
        const files = fs
          .readdirSync(uri.fsPath)
          .filter(f => f.endsWith('.md') || f.endsWith('.txt'))
          .map(f => path.join(uri.fsPath, f));
        chapterFiles.push(...files);
      } else {
        // 处理单个文件
        chapterFiles.push(uri.fsPath);
      }
    }

    if (chapterFiles.length === 0) {
      vscode.window.showInformationMessage('未找到章节文件');
      return;
    }

    // 3. 展示预览信息并询问用户确认
    const previewMsg = `即将快速导入 ${chapterFiles.length} 个章节文件：\n` + 
      `注意：快速导入仅保存章节基础信息，不进行AI分析。\n` +
      `如需提取伏笔和摘要，请在导入后执行"章节深度分析"命令。`;
    
    const confirm = await vscode.window.showInformationMessage(
      previewMsg,
      { modal: true },
      '开始快速导入',
      '取消'
    );

    if (confirm !== '开始快速导入') {
      return;
    }

    // 4. 执行快速导入
    logger.log('============================================================');
    logger.log('📖 开始章节快速导入阶段');
    logger.log('============================================================');
    logger.log(`📋 共 ${chapterFiles.length} 个章节文件`);
    
    let successCount = 0;
    for (const filePath of chapterFiles) {
      const fileName = path.basename(filePath);
      logger.log(`📥 导入章节: ${fileName}`);
      
      const content = fs.readFileSync(filePath, 'utf-8');
      const result = await this.importChapter(content, fileName);
      if (result.success) {
        successCount++;
        logger.log(`✅ ${fileName} 导入成功`);
      } else {
        logger.log(`❌ ${fileName} 导入失败: ${result.errors.join(', ')}`);
      }
    }

    // 5. 自动生成配置
    await this.autoGenerateConfigFromFiles(chapterFiles);

    // 6. 展示结果
    logger.log(`🎉 章节快速导入完成: ${successCount}/${chapterFiles.length} 成功`);
    logger.log('💡 提示：如需提取伏笔和摘要，请执行"章节深度分析"命令');
    logger.log('============================================================');
    vscode.window.showInformationMessage(`章节快速导入完成: ${successCount}/${chapterFiles.length} 成功`);
  }

  /**
   * 自动分析并填充项目配置和世界观设定
   * 从所有导入的文件中提取信息，生成或更新配置文件
   */
  async autoGenerateConfigFromFiles(filePaths: string[]): Promise<void> {
    logger.log('============================================================');
    logger.log('🔍 开始自动分析并填充项目配置');
    logger.log('============================================================');

    // 检查API配置
    const apiOk = aiService.loadConfig();
    if (!apiOk) {
      logger.log('⚠️ API未配置，无法进行智能分析');
      vscode.window.showInformationMessage('API未配置，跳过智能配置生成');
      return;
    }

    // 1. 读取所有文件内容
    let allContent = '';
    for (const filePath of filePaths) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        allContent += content + '\n\n';
      } catch (error) {
        logger.log(`⚠️ 无法读取文件: ${filePath}`);
      }
    }

    if (allContent.length === 0) {
      logger.log('⚠️ 没有可分析的文件内容');
      return;
    }

    // 2. 初始化服务
    projectConfigMarkdownService.init();
    worldSettingMarkdownService.init();

    // 3. 分析项目信息
    logger.log('🤖 开始分析项目信息...');
    const projectInfo = await this.analyzeProjectInfo(allContent);
    if (projectInfo) {
      logger.log(`✅ 提取到项目信息: ${JSON.stringify(projectInfo)}`);
      // 保存项目配置
      projectConfigMarkdownService.save(projectInfo);
    }

    // 4. 分析世界观设定
    logger.log('🤖 开始分析世界观设定...');
    const worldSetting = await this.analyzeWorldSetting(allContent);
    if (worldSetting) {
      logger.log(`✅ 提取到世界观设定: ${JSON.stringify(worldSetting)}`);
      // 保存世界观设定
      worldSettingMarkdownService.save(worldSetting);
    }

    logger.log('============================================================');
    logger.log('🎉 自动配置生成完成');
    logger.log('============================================================');
    vscode.window.showInformationMessage('项目配置和世界观设定已自动生成');
  }

  /**
   * 使用AI分析项目信息
   */
  private async analyzeProjectInfo(content: string): Promise<any> {
    const prompt = `从以下小说内容中提取项目信息，返回JSON格式：
{
  "title": "书名",
  "genre": "小说类型",
  "theme": "主题",
  "narrativePerspective": "叙述视角",
  "coreConflict": "核心冲突"
}

只返回JSON，不要其他解释。

小说内容：
${content.slice(0, 3000)}`;

    try {
      const result = await aiService.callChat('你是项目信息提取助手', prompt);
      if (!result) {
        return null;
      }

      const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned);
    } catch (error) {
      logger.log(`⚠️ 分析项目信息失败: ${error}`);
      return null;
    }
  }

  /**
   * 使用AI分析世界观设定
   */
  private async analyzeWorldSetting(content: string): Promise<any> {
    const prompt = `从以下小说内容中提取世界观设定，返回JSON格式：
{
  "timePeriod": "时代背景",
  "location": "地理位置",
  "atmosphere": "氛围基调",
  "rules": ["规则1", "规则2", "规则3"]
}

只返回JSON，不要其他解释。

小说内容：
${content.slice(0, 3000)}`;

    try {
      const result = await aiService.callChat('你是世界观设定提取助手', prompt);
      if (!result) {
        return null;
      }

      const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned);
    } catch (error) {
      logger.log(`⚠️ 分析世界观设定失败: ${error}`);
      return null;
    }
  }
}

export const importService = new ImportService();
