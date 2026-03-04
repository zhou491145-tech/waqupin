import * as fs from 'fs';
import * as path from 'path';
import { aiService } from '../services/aiService';
import { analysisService } from '../services/analysisService';
import { writingStylesService } from '../services/writingStylesService';
import { promptTemplateService } from '../services/promptTemplateService';
import { contextService } from '../services/contextService';
import { dataStorage } from '../data/storage';
import { testLogger } from '../utils/testLogger';

export class ServiceIntegrationTest {
  private testDataDir: string;

  constructor(testDataDir: string) {
    this.testDataDir = testDataDir;
  }

  async runAllTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    testLogger.log('🧪 开始服务集成测试...');

    try {
      results.push(await this.testAIServiceWithAnalysis());
      results.push(await this.testWritingStyleWithPromptTemplate());
      results.push(await this.testContextServiceWithStorage());
      results.push(await this.testFullDataFlow());
      results.push(await this.testServiceInitialization());
      results.push(await this.testStyleApplicationToGeneration());
    } catch (error) {
      testLogger.log(`❌ 测试执行失败: ${error}`);
      results.push({
        testName: '总体测试',
        passed: false,
        message: `测试执行失败: ${error}`
      });
    }

    return results;
  }

  private async testAIServiceWithAnalysis(): Promise<TestResult> {
    const testName = 'AI服务与分析服务集成';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testDataDir = path.join(this.testDataDir, 'ai-analysis-test');
      if (!fs.existsSync(testDataDir)) {
        fs.mkdirSync(testDataDir, { recursive: true });
      }

      const templatePath = path.join(testDataDir, 'analyze.txt');
      const templateContent = `请分析第{{chapter_number}}章《{{title}}》（字数：{{word_count}}）。

章节内容：
{{content}}

请以JSON格式返回分析结果，包含以下字段：
- hooks: 钩子数组
- foreshadows: 伏笔数组
- plot_points: 情节点数组
- character_states: 角色状态数组
- conflict: 冲突分析
- emotional_arc: 情感弧线
- scores: 评分对象
- summary: 章节摘要
- suggestions: 改进建议数组`;

      fs.writeFileSync(templatePath, templateContent, 'utf-8');

      const originalTemplatePath = (analysisService as any).templatePath;
      (analysisService as any).templatePath = templatePath;

      const testChapter = {
        chapterNumber: 1,
        title: '测试章节',
        content: '这是一个测试章节的内容，包含了一些角色和情节的发展。主角遇到了一个神秘的陌生人，这个陌生人似乎知道关于主角过去的秘密。'
      };

      const configLoaded = aiService.loadConfig();
      if (!configLoaded) {
        testLogger.log('⚠️ AI配置未加载，跳过实际API调用测试');
        (analysisService as any).templatePath = originalTemplatePath;
        return {
          testName,
          passed: true,
          message: 'AI服务与分析服务集成正常（配置未设置，跳过API调用）'
        };
      }

      const result = await analysisService.analyzeChapter(
        testChapter.chapterNumber,
        testChapter.title,
        testChapter.content
      );

      (analysisService as any).templatePath = originalTemplatePath;

      if (!result) {
        return {
          testName,
          passed: false,
          message: '分析服务返回null'
        };
      }

      if (!result.summary || result.summary.length === 0) {
        return {
          testName,
          passed: false,
          message: '分析结果缺少摘要'
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: 'AI服务与分析服务集成正常' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testWritingStyleWithPromptTemplate(): Promise<TestResult> {
    const testName = '写作风格服务与提示词模板集成';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testDataDir = path.join(this.testDataDir, 'style-template-test');
      if (!fs.existsSync(testDataDir)) {
        fs.mkdirSync(testDataDir, { recursive: true });
      }

      const initialized = writingStylesService.init(testDataDir);
      if (!initialized) {
        return {
          testName,
          passed: false,
          message: '写作风格服务初始化失败'
        };
      }

      const initialized2 = promptTemplateService.init(testDataDir);
      if (!initialized2) {
        return {
          testName,
          passed: false,
          message: '提示词模板服务初始化失败'
        };
      }

      const allPackages = writingStylesService.getAllPackages();
      if (allPackages.length === 0) {
        return {
          testName,
          passed: false,
          message: '未获取到任何风格套装'
        };
      }

      const firstPackage = allPackages[0];
      testLogger.log(`📦 测试套装: ${firstPackage.name} (${firstPackage.id})`);

      const basePrompt = '请根据以下信息生成章节内容：\n章节号：{{chapter_number}}\n主题：{{theme}}';
      const params = {
        chapter_number: 1,
        theme: '冒险'
      };

      const formattedPrompt = writingStylesService.applyStyleToPrompt(basePrompt, params);

      if (!formattedPrompt || formattedPrompt.length === 0) {
        return {
          testName,
          passed: false,
          message: '风格应用失败，返回空提示词'
        };
      }

      if (!formattedPrompt.includes(firstPackage.styleContent)) {
        return {
          testName,
          passed: false,
          message: '风格内容未正确应用到提示词'
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '写作风格服务与提示词模板集成正常' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testContextServiceWithStorage(): Promise<TestResult> {
    const testName = '上下文服务与数据存储集成';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testDataDir = path.join(this.testDataDir, 'context-storage-test');
      if (!fs.existsSync(testDataDir)) {
        fs.mkdirSync(testDataDir, { recursive: true });
      }

      const originalWorkspaceRoot = process.cwd();
      process.chdir(testDataDir);
      dataStorage.init(true);

      const testCharacter = {
        id: 'CSTEST001',
        name: '测试角色',
        aliases: ['角色'],
        role: 'protagonist' as const,
        description: '测试角色描述',
        personality: '勇敢',
        background: '普通背景',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const testForeshadow = {
        id: 'FSTEST001',
        description: '测试伏笔',
        status: 'pending' as const,
        importance: 'high' as const,
        plantedChapter: 1,
        relatedCharacters: ['测试角色'],
        keyword: '测试',
        notes: ['测试备注'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const testWorldSetting = {
        id: 'WSTEST001',
        title: '测试世界观',
        timePeriod: '现代',
        location: '北京',
        atmosphere: '紧张',
        rules: ['规则1', '规则2'],
        additionalInfo: '测试补充信息',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      dataStorage.addCharacter(testCharacter);
      dataStorage.addForeshadow(testForeshadow);
      dataStorage.saveWorldSetting(testWorldSetting);

      const context = await contextService.buildGenerationContext(1);

      process.chdir(originalWorkspaceRoot);

      if (!context) {
        return {
          testName,
          passed: false,
          message: '上下文构建返回空'
        };
      }

      if (!context.includes('测试角色')) {
        return {
          testName,
          passed: false,
          message: '角色信息未包含在上下文中'
        };
      }

      if (!context.includes('测试伏笔')) {
        return {
          testName,
          passed: false,
          message: '伏笔信息未包含在上下文中'
        };
      }

      if (!context.includes('现代') || !context.includes('北京')) {
        return {
          testName,
          passed: false,
          message: '世界观信息未包含在上下文中'
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '上下文服务与数据存储集成正常' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testFullDataFlow(): Promise<TestResult> {
    const testName = '完整数据流集成测试';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testDataDir = path.join(this.testDataDir, 'full-dataflow-test');
      if (!fs.existsSync(testDataDir)) {
        fs.mkdirSync(testDataDir, { recursive: true });
      }

      const originalWorkspaceRoot = process.cwd();
      process.chdir(testDataDir);

      dataStorage.init(true);
      writingStylesService.init(testDataDir);
      promptTemplateService.init(testDataDir);

      const testCharacter = {
        id: 'FDFTEST001',
        name: '完整流测试角色',
        aliases: ['角色'],
        role: 'protagonist' as const,
        description: '测试角色',
        personality: '勇敢',
        background: '普通背景',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const testForeshadow = {
        id: 'FDFFTEST001',
        description: '完整流测试伏笔',
        status: 'pending' as const,
        importance: 'high' as const,
        plantedChapter: 1,
        relatedCharacters: ['完整流测试角色'],
        keyword: '测试',
        notes: ['测试'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const testWorldSetting = {
        id: 'FDFWSTEST001',
        title: '测试世界观',
        timePeriod: '现代',
        location: '北京',
        atmosphere: '紧张',
        rules: ['规则1', '规则2'],
        additionalInfo: '测试补充信息',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const testSummary = {
        id: 'FDFSMTEST001',
        chapterNumber: 1,
        chapterTitle: '第一章',
        summary: '第一章摘要',
        wordCount: 1000,
        keyCharacters: ['完整流测试角色'],
        keyEvents: ['事件1'],
        mainConflict: '测试冲突',
        emotionalTone: '紧张',
        paceLevel: 'fast' as const,
        createdAt: new Date().toISOString()
      };

      dataStorage.addCharacter(testCharacter);
      dataStorage.addForeshadow(testForeshadow);
      dataStorage.saveWorldSetting(testWorldSetting);
      dataStorage.addSummary(testSummary);

      const context = await contextService.buildGenerationContext(2);
      const previousContent = await contextService.loadPreviousChaptersContent(2, 1);

      process.chdir(originalWorkspaceRoot);

      if (!context) {
        return {
          testName,
          passed: false,
          message: '上下文构建失败'
        };
      }

      if (!previousContent) {
        return {
          testName,
          passed: false,
          message: '前置章节内容加载失败'
        };
      }

      if (!context.includes('完整流测试角色')) {
        return {
          testName,
          passed: false,
          message: '角色信息未正确传递'
        };
      }

      if (!previousContent.includes('第一章摘要')) {
        return {
          testName,
          passed: false,
          message: '前置章节摘要未正确加载'
        };
      }

      const allPackages = writingStylesService.getAllPackages();
      if (allPackages.length === 0) {
        return {
          testName,
          passed: false,
          message: '风格套装获取失败'
        };
      }

      const basePrompt = `章节号：2\n前情回顾：${previousContent}\n上下文：${context}`;
      const formattedPrompt = writingStylesService.applyStyleToPrompt(basePrompt, {});

      if (!formattedPrompt || formattedPrompt.length === 0) {
        return {
          testName,
          passed: false,
          message: '完整数据流提示词生成失败'
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '完整数据流集成测试通过' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testServiceInitialization(): Promise<TestResult> {
    const testName = '服务初始化集成测试';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testDataDir = path.join(this.testDataDir, 'service-init-test');
      if (!fs.existsSync(testDataDir)) {
        fs.mkdirSync(testDataDir, { recursive: true });
      }

      const wsInit = writingStylesService.init(testDataDir);
      const ptInit = promptTemplateService.init(testDataDir);

      if (!wsInit) {
        return {
          testName,
          passed: false,
          message: '写作风格服务初始化失败'
        };
      }

      if (!ptInit) {
        return {
          testName,
          passed: false,
          message: '提示词模板服务初始化失败'
        };
      }

      const packages = writingStylesService.getAllPackages();
      const templates = promptTemplateService.getAllTemplates();

      if (packages.length === 0) {
        return {
          testName,
          passed: false,
          message: '风格套装数量为0'
        };
      }

      if (templates.length === 0) {
        return {
          testName,
          passed: false,
          message: '提示词模板数量为0'
        };
      }

      testLogger.log(`📦 风格套装数: ${packages.length}`);
      testLogger.log(`📋 提示词模板数: ${templates.length}`);

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '服务初始化集成测试通过' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testStyleApplicationToGeneration(): Promise<TestResult> {
    const testName = '风格应用到生成流程集成测试';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testDataDir = path.join(this.testDataDir, 'style-generation-test');
      if (!fs.existsSync(testDataDir)) {
        fs.mkdirSync(testDataDir, { recursive: true });
      }

      const wsInit = writingStylesService.init(testDataDir);
      const ptInit = promptTemplateService.init(testDataDir);

      if (!wsInit || !ptInit) {
        return {
          testName,
          passed: false,
          message: '服务初始化失败'
        };
      }

      const packages = writingStylesService.getAllPackages();
      const firstPackage = packages[0];

      const activateResult = writingStylesService.activatePackage(firstPackage.id);
      if (!activateResult) {
        return {
          testName,
          passed: false,
          message: '激活风格套装失败'
        };
      }

      const activePackage = writingStylesService.getActivePackage();
      if (!activePackage || activePackage.id !== firstPackage.id) {
        return {
          testName,
          passed: false,
          message: '激活的风格套装不匹配'
        };
      }

      const basePrompt = '章节号：{{chapter_number}}\n主题：{{theme}}';
      const params = { chapter_number: 1, theme: '冒险' };

      const formattedPrompt = writingStylesService.applyStyleToPrompt(basePrompt, params);

      if (!formattedPrompt) {
        return {
          testName,
          passed: false,
          message: '格式化后的提示词为空'
        };
      }

      if (!formattedPrompt.includes(activePackage.styleContent)) {
        return {
          testName,
          passed: false,
          message: '激活的风格未正确应用'
        };
      }

      if (!formattedPrompt.includes('请直接输出章节正文内容')) {
        return {
          testName,
          passed: false,
          message: '提示词格式不正确'
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '风格应用到生成流程集成测试通过' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }
}

export interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
}
