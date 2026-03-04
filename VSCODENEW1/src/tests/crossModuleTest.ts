import * as fs from 'fs';
import * as path from 'path';
import { characterRepository } from '../repositories';
import { foreshadowRepository } from '../repositories';
import { summaryRepository } from '../repositories';
import { outlineRepository } from '../repositories';
import { chapterGenerationService } from '../services/chapterGenerationService';
import { contextService } from '../services/contextService';
import { foreshadowFilterService } from '../services/foreshadowFilterService';
import { worldSettingMarkdownService } from '../services/worldSettingMarkdownService';
import { projectConfigMarkdownService } from '../services/projectConfigMarkdownService';
import { dataStorage } from '../data/storage';
import { testLogger } from '../utils/testLogger';

export class CrossModuleTest {
  private testDataDir: string;

  constructor(testDataDir: string) {
    this.testDataDir = testDataDir;
  }

  async runAllTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    testLogger.log('🧪 开始跨模块功能集成测试...');

    try {
      results.push(await this.testCharacterToChapterGeneration());
      results.push(await this.testForeshadowToContextBuilding());
      results.push(await this.testSummaryToOutlineIntegration());
      results.push(await this.testWorldSettingToGeneration());
      results.push(await this.testProjectConfigToGeneration());
      results.push(await this.testFullWorkflow());
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

  private async testCharacterToChapterGeneration(): Promise<TestResult> {
    const testName = '角色数据到章节生成';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testDataDir = path.join(this.testDataDir, 'character-test');
      if (!fs.existsSync(testDataDir)) {
        fs.mkdirSync(testDataDir, { recursive: true });
      }

      const testCharacter = {
        id: 'CMTEST001',
        name: '测试主角',
        aliases: ['主角'],
        role: 'protagonist' as const,
        description: '主要角色',
        personality: '勇敢',
        background: '普通背景',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const originalWorkspaceRoot = process.cwd();
      process.chdir(testDataDir);
      dataStorage.init(true);
      dataStorage.addCharacter(testCharacter);

      const loadedCharacters = dataStorage.loadCharacters();
      testLogger.log(`🔍 加载的角色数量: ${loadedCharacters.length}`);
      if (loadedCharacters.length > 0) {
        testLogger.log(`🔍 第一个角色名称: ${loadedCharacters[0].name}`);
      }

      const context = await contextService.buildGenerationContext(1);

      process.chdir(originalWorkspaceRoot);

      testLogger.log(`🔍 生成上下文内容: ${context}`);

      if (!context.includes('测试主角')) {
        return {
          testName,
          passed: false,
          message: '角色信息未包含在生成上下文中'
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '角色数据正确集成到章节生成' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testForeshadowToContextBuilding(): Promise<TestResult> {
    const testName = '伏笔数据到上下文构建';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testDataDir = path.join(this.testDataDir, 'foreshadow-test');
      if (!fs.existsSync(testDataDir)) {
        fs.mkdirSync(testDataDir, { recursive: true });
      }

      const testForeshadow = {
        id: 'FMTEST001',
        description: '重要伏笔',
        status: 'pending' as const,
        importance: 'high' as const,
        plantedChapter: 1,
        relatedCharacters: ['主角'],
        keyword: '关键',
        notes: ['重要'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const originalWorkspaceRoot = process.cwd();
      process.chdir(testDataDir);
      dataStorage.init(true);
      dataStorage.addForeshadow(testForeshadow);

      const allForeshadows = dataStorage.loadForeshadows();
      const filtered = foreshadowFilterService.filterForeshadows(allForeshadows, {
        currentChapter: 2,
        chapterCharacters: ['主角'],
        maxForeshadows: 5,
        minImportance: 'medium'
      });

      if (filtered.length === 0) {
        process.chdir(originalWorkspaceRoot);
        return {
          testName,
          passed: false,
          message: '伏笔过滤失败，未返回任何伏笔'
        };
      }

      const context = await contextService.buildGenerationContext(2);

      process.chdir(originalWorkspaceRoot);

      if (!context.includes('重要伏笔')) {
        return {
          testName,
          passed: false,
          message: '伏笔信息未包含在生成上下文中'
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '伏笔数据正确集成到上下文构建' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testSummaryToOutlineIntegration(): Promise<TestResult> {
    const testName = '章节摘要到大纲集成';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      summaryRepository.init(this.testDataDir);
      outlineRepository.init(this.testDataDir);

      const testSummary = {
        id: 'SMTEST001',
        chapterNumber: 1,
        chapterTitle: '测试章节',
        summary: '测试摘要内容',
        wordCount: 1000,
        keyCharacters: ['角色1'],
        keyEvents: ['事件1'],
        createdAt: new Date().toISOString()
      };

      summaryRepository.add(testSummary);

      const testOutline = {
        id: 'OMTEST001',
        chapterNumber: 1,
        title: '测试章节',
        content: '测试大纲内容',
        type: 'chapter' as const,
        orderIndex: 1,
        status: 'draft' as const,
        createdAt: new Date().toISOString()
      };

      outlineRepository.add(testOutline);

      const summary = summaryRepository.findByChapter(1);
      const outline = outlineRepository.findById('OMTEST001');

      if (!summary || !outline) {
        summaryRepository.delete('SMTEST001');
        outlineRepository.delete('OMTEST001');
        return {
          testName,
          passed: false,
          message: '摘要或大纲数据加载失败'
        };
      }

      if (summary.chapterNumber !== outline.chapterNumber) {
        summaryRepository.delete('SMTEST001');
        outlineRepository.delete('OMTEST001');
        return {
          testName,
          passed: false,
          message: '摘要和大纲章节号不匹配'
        };
      }

      summaryRepository.delete('SMTEST001');
      outlineRepository.delete('OMTEST001');

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '章节摘要和大纲正确集成' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testWorldSettingToGeneration(): Promise<TestResult> {
    const testName = '世界观到章节生成';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testDataDir = path.join(this.testDataDir, 'world-setting-test');
      if (!fs.existsSync(testDataDir)) {
        fs.mkdirSync(testDataDir, { recursive: true });
      }

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

      const originalWorkspaceRoot = process.cwd();
      process.chdir(testDataDir);
      dataStorage.init(true);
      dataStorage.saveWorldSetting(testWorldSetting);

      const context = await contextService.buildGenerationContext(1);

      process.chdir(originalWorkspaceRoot);

      if (!context.includes('现代') || !context.includes('北京')) {
        return {
          testName,
          passed: false,
          message: '世界观信息未包含在生成上下文中'
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '世界观正确集成到章节生成' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testProjectConfigToGeneration(): Promise<TestResult> {
    const testName = '项目配置到章节生成';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testDataDir = path.join(this.testDataDir, 'project-config-test');
      if (!fs.existsSync(testDataDir)) {
        fs.mkdirSync(testDataDir, { recursive: true });
      }

      const testProjectConfig = {
        id: 'PCTEST001',
        title: '测试书名',
        theme: '测试主题',
        genre: '玄幻',
        targetWordCount: 100000,
        narrativePerspective: '第三人称',
        targetAudience: '青少年',
        coreConflict: '测试冲突',
        mainPlot: '测试情节',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const originalWorkspaceRoot = process.cwd();
      process.chdir(testDataDir);
      dataStorage.init(true);
      dataStorage.saveProjectConfig(testProjectConfig);

      const loadedConfig = dataStorage.loadProjectConfig();

      process.chdir(originalWorkspaceRoot);

      if (!loadedConfig || loadedConfig.title !== testProjectConfig.title || loadedConfig.genre !== testProjectConfig.genre) {
        return {
          testName,
          passed: false,
          message: '项目配置数据不匹配'
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '项目配置正确集成到系统' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testFullWorkflow(): Promise<TestResult> {
    const testName = '完整工作流测试';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testDataDir = path.join(this.testDataDir, 'full-workflow-test');
      if (!fs.existsSync(testDataDir)) {
        fs.mkdirSync(testDataDir, { recursive: true });
      }

      const testCharacter = {
        id: 'FWTEST001',
        name: '完整测试角色',
        aliases: ['角色'],
        role: 'protagonist' as const,
        description: '测试角色',
        personality: '勇敢',
        background: '普通背景',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const testForeshadow = {
        id: 'FWFTEST001',
        description: '完整测试伏笔',
        status: 'pending' as const,
        importance: 'high' as const,
        plantedChapter: 1,
        relatedCharacters: ['完整测试角色'],
        keyword: '测试',
        notes: ['测试'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const originalWorkspaceRoot = process.cwd();
      process.chdir(testDataDir);
      dataStorage.init(true);
      dataStorage.addCharacter(testCharacter);
      dataStorage.addForeshadow(testForeshadow);

      const context = await contextService.buildGenerationContext(1);

      process.chdir(originalWorkspaceRoot);

      if (!context.includes('完整测试角色') || !context.includes('完整测试伏笔')) {
        return {
          testName,
          passed: false,
          message: '完整工作流数据集成失败'
        };
      }

      const nextChapter = chapterGenerationService.getNextChapterNumber();

      if (nextChapter !== 1) {
        return {
          testName,
          passed: false,
          message: '章节号计算错误'
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '完整工作流测试通过' };
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
