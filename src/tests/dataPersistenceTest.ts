import * as fs from 'fs';
import * as path from 'path';
import { characterRepository } from '../repositories';
import { foreshadowRepository } from '../repositories';
import { summaryRepository } from '../repositories';
import { outlineRepository } from '../repositories';
import { worldSettingRepository } from '../repositories';
import { writingStyleRepository } from '../repositories';
import { projectConfigRepository } from '../repositories';
import { worldSettingMarkdownService } from '../services/worldSettingMarkdownService';
import { projectConfigMarkdownService } from '../services/projectConfigMarkdownService';
import { testLogger } from '../utils/testLogger';

export class DataPersistenceTest {
  private testDataDir: string;

  constructor(testDataDir: string) {
    this.testDataDir = testDataDir;
  }

  async runAllTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    testLogger.log('🧪 开始数据持久化集成测试...');

    try {
      results.push(await this.testCharacterPersistence());
      results.push(await this.testForeshadowPersistence());
      results.push(await this.testSummaryPersistence());
      results.push(await this.testOutlinePersistence());
      results.push(await this.testWorldSettingPersistence());
      results.push(await this.testWritingStylePersistence());
      results.push(await this.testProjectConfigPersistence());
      results.push(await this.testMarkdownFilePersistence());
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

  private async testCharacterPersistence(): Promise<TestResult> {
    const testName = '角色数据持久化';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testCharacter = {
        id: 'TEST001',
        name: '测试角色',
        aliases: ['别名1', '别名2'],
        role: 'protagonist' as const,
        description: '这是一个测试角色',
        personality: '勇敢、善良',
        background: '出身于普通家庭',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const testCharacter2 = {
        id: 'TEST002',
        name: '测试角色2',
        aliases: ['别名3'],
        role: 'antagonist' as const,
        description: '这是另一个测试角色',
        personality: '邪恶',
        background: '出身于黑暗家族',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const testCharacter3 = {
        id: 'TEST003',
        name: '测试角色3',
        aliases: ['别名4'],
        role: 'supporting' as const,
        description: '配角角色',
        personality: '忠诚',
        background: '出身于普通家庭',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      characterRepository.init(this.testDataDir);
      characterRepository.add(testCharacter);
      characterRepository.add(testCharacter2);
      characterRepository.add(testCharacter3);

      const loaded = characterRepository.findById('TEST001');

      if (!loaded) {
        return {
          testName,
          passed: false,
          message: '无法加载保存的角色数据'
        };
      }

      if (loaded.name !== testCharacter.name || loaded.role !== testCharacter.role) {
        return {
          testName,
          passed: false,
          message: '角色数据不匹配'
        };
      }

      const byName = characterRepository.findByName('测试角色2');
      if (!byName || byName.id !== 'TEST002') {
        return {
          testName,
          passed: false,
          message: '按名称查找角色失败'
        };
      }

      const byRole = characterRepository.findByRole('protagonist');
      if (byRole.length !== 1 || byRole[0].id !== 'TEST001') {
        return {
          testName,
          passed: false,
          message: '按角色类型查找角色失败'
        };
      }

      const all = characterRepository.loadAll();
      if (all.length !== 3) {
        return {
          testName,
          passed: false,
          message: '加载所有角色失败'
        };
      }

      characterRepository.update('TEST001', { personality: '勇敢、善良、正义' });
      const updated = characterRepository.findById('TEST001');
      if (!updated || updated.personality !== '勇敢、善良、正义') {
        return {
          testName,
          passed: false,
          message: '更新角色数据失败'
        };
      }

      characterRepository.delete('TEST001');
      characterRepository.delete('TEST002');
      characterRepository.delete('TEST003');

      const deleted = characterRepository.findById('TEST001');
      if (deleted) {
        return {
          testName,
          passed: false,
          message: '角色删除失败'
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '角色数据持久化正常' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testForeshadowPersistence(): Promise<TestResult> {
    const testName = '伏笔数据持久化';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testForeshadow = {
        id: 'FTEST001',
        description: '这是一个测试伏笔',
        status: 'pending' as const,
        importance: 'high' as const,
        plantedChapter: 1,
        resolvedChapter: 10,
        relatedCharacters: ['角色1'],
        keyword: '测试关键词',
        notes: ['备注1'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const testForeshadow2 = {
        id: 'FTEST002',
        description: '这是另一个测试伏笔',
        status: 'resolved' as const,
        importance: 'medium' as const,
        plantedChapter: 2,
        resolvedChapter: 5,
        relatedCharacters: ['角色2'],
        keyword: '测试关键词2',
        notes: ['备注2'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const testForeshadow3 = {
        id: 'FTEST003',
        description: '第三个测试伏笔',
        status: 'pending' as const,
        importance: 'low' as const,
        plantedChapter: 1,
        relatedCharacters: ['角色1'],
        keyword: '测试关键词3',
        notes: ['备注3'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      foreshadowRepository.init(this.testDataDir);
      foreshadowRepository.add(testForeshadow);
      foreshadowRepository.add(testForeshadow2);
      foreshadowRepository.add(testForeshadow3);

      const loaded = foreshadowRepository.findById('FTEST001');

      if (!loaded) {
        return {
          testName,
          passed: false,
          message: '无法加载保存的伏笔数据'
        };
      }

      if (loaded.description !== testForeshadow.description || loaded.importance !== testForeshadow.importance) {
        return {
          testName,
          passed: false,
          message: '伏笔数据不匹配'
        };
      }

      const all = foreshadowRepository.loadAll();
      if (all.length !== 3) {
        return {
          testName,
          passed: false,
          message: '加载所有伏笔失败'
        };
      }

      const byStatus = foreshadowRepository.findByStatus('pending');
      if (byStatus.length !== 2) {
        return {
          testName,
          passed: false,
          message: '按状态查找伏笔失败'
        };
      }

      const byChapter = foreshadowRepository.findByChapter(1);
      if (byChapter.length !== 2) {
        return {
          testName,
          passed: false,
          message: '按章节查找伏笔失败'
        };
      }

      foreshadowRepository.update('FTEST001', { importance: 'medium' as const });
      const updated = foreshadowRepository.findById('FTEST001');
      if (!updated || updated.importance !== 'medium') {
        return {
          testName,
          passed: false,
          message: '更新伏笔数据失败'
        };
      }

      const generatedId = foreshadowRepository.generateId();
      if (!generatedId || !generatedId.startsWith('F')) {
        return {
          testName,
          passed: false,
          message: '生成伏笔ID失败'
        };
      }

      foreshadowRepository.delete('FTEST001');
      foreshadowRepository.delete('FTEST002');
      foreshadowRepository.delete('FTEST003');

      const deleted = foreshadowRepository.findById('FTEST001');
      if (deleted) {
        return {
          testName,
          passed: false,
          message: '伏笔删除失败'
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '伏笔数据持久化正常' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testSummaryPersistence(): Promise<TestResult> {
    const testName = '章节摘要持久化';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testSummary = {
        id: 'SUMTEST001',
        chapterNumber: 1,
        chapterTitle: '测试章节',
        summary: '这是一个测试摘要',
        wordCount: 1000,
        keyCharacters: ['角色1', '角色2'],
        keyEvents: ['事件1', '事件2'],
        mainConflict: '测试冲突',
        emotionalTone: '紧张',
        paceLevel: 'fast' as const,
        createdAt: new Date().toISOString()
      };

      const testSummary2 = {
        id: 'SUMTEST002',
        chapterNumber: 2,
        chapterTitle: '测试章节2',
        summary: '这是另一个测试摘要',
        wordCount: 2000,
        keyCharacters: ['角色3', '角色4'],
        keyEvents: ['事件3', '事件4'],
        mainConflict: '测试冲突2',
        emotionalTone: '轻松',
        paceLevel: 'moderate' as const,
        createdAt: new Date().toISOString()
      };

      const testSummary3 = {
        id: 'SUMTEST003',
        chapterNumber: 3,
        chapterTitle: '测试章节3',
        summary: '第三个测试摘要',
        wordCount: 1500,
        keyCharacters: ['角色1'],
        keyEvents: ['事件5'],
        mainConflict: '测试冲突3',
        emotionalTone: '悲伤',
        paceLevel: 'slow' as const,
        createdAt: new Date().toISOString()
      };

      summaryRepository.init(this.testDataDir);
      summaryRepository.add(testSummary);
      summaryRepository.add(testSummary2);
      summaryRepository.add(testSummary3);

      const loaded = summaryRepository.findByChapter(1);

      if (!loaded) {
        return {
          testName,
          passed: false,
          message: '无法加载保存的摘要数据'
        };
      }

      if (loaded.chapterNumber !== testSummary.chapterNumber || loaded.summary !== testSummary.summary) {
        return {
          testName,
          passed: false,
          message: '摘要数据不匹配'
        };
      }

      const all = summaryRepository.loadAll();
      if (all.length !== 3) {
        return {
          testName,
          passed: false,
          message: '加载所有摘要失败'
        };
      }

      const byId = summaryRepository.findById('SUMTEST002');
      if (!byId || byId.chapterNumber !== 2) {
        return {
          testName,
          passed: false,
          message: '按ID查找摘要失败'
        };
      }

      summaryRepository.update('SUMTEST001', { wordCount: 1200 });
      const updated = summaryRepository.findById('SUMTEST001');
      if (!updated || updated.wordCount !== 1200) {
        return {
          testName,
          passed: false,
          message: '更新摘要数据失败'
        };
      }

      const generatedId = summaryRepository.generateId();
      if (!generatedId || !generatedId.startsWith('SUM')) {
        return {
          testName,
          passed: false,
          message: '生成摘要ID失败'
        };
      }

      summaryRepository.delete('SUMTEST001');
      summaryRepository.delete('SUMTEST002');
      summaryRepository.delete('SUMTEST003');

      const deleted = summaryRepository.findById('SUMTEST001');
      if (deleted) {
        return {
          testName,
          passed: false,
          message: '摘要删除失败'
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '章节摘要持久化正常' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testOutlinePersistence(): Promise<TestResult> {
    const testName = '大纲数据持久化';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testOutline = {
        id: 'OUTTEST001',
        chapterNumber: 1,
        title: '测试大纲',
        content: '这是一个测试大纲内容',
        type: 'chapter' as const,
        orderIndex: 1,
        status: 'draft' as const,
        createdAt: new Date().toISOString()
      };

      outlineRepository.init(this.testDataDir);
      outlineRepository.add(testOutline);

      const loaded = outlineRepository.findById('OUTTEST001');

      if (!loaded) {
        return {
          testName,
          passed: false,
          message: '无法加载保存的大纲数据'
        };
      }

      if (loaded.title !== testOutline.title || loaded.content !== testOutline.content) {
        return {
          testName,
          passed: false,
          message: '大纲数据不匹配'
        };
      }

      outlineRepository.delete('OUTTEST001');

      const deleted = outlineRepository.findById('OUTTEST001');
      if (deleted) {
        return {
          testName,
          passed: false,
          message: '大纲删除失败'
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '大纲数据持久化正常' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testWorldSettingPersistence(): Promise<TestResult> {
    const testName = '世界观数据持久化';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
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

      worldSettingRepository.init(this.testDataDir);
      worldSettingRepository.save(testWorldSetting);

      const loaded = worldSettingRepository.load();

      if (!loaded) {
        return {
          testName,
          passed: false,
          message: '无法加载保存的世界观数据'
        };
      }

      if (loaded.timePeriod !== testWorldSetting.timePeriod || loaded.location !== testWorldSetting.location) {
        return {
          testName,
          passed: false,
          message: '世界观数据不匹配'
        };
      }

      worldSettingRepository.delete();

      const deleted = worldSettingRepository.load();
      if (deleted) {
        return {
          testName,
          passed: false,
          message: '世界观删除失败'
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '世界观数据持久化正常' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testWritingStylePersistence(): Promise<TestResult> {
    const testName = '写作风格数据持久化';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testWritingStyle = {
        id: 'WSTYTEST001',
        name: '测试风格',
        baseAuthor: '测试作者',
        description: '这是一个测试写作风格',
        characteristics: ['特征1', '特征2'],
        writingRules: ['规则1', '规则2'],
        exampleSentences: ['例句1', '例句2'],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      writingStyleRepository.init(this.testDataDir);
      writingStyleRepository.save(testWritingStyle);

      const loaded = writingStyleRepository.load();

      if (!loaded) {
        return {
          testName,
          passed: false,
          message: '无法加载保存的写作风格数据'
        };
      }

      if (loaded.name !== testWritingStyle.name || loaded.baseAuthor !== testWritingStyle.baseAuthor) {
        return {
          testName,
          passed: false,
          message: '写作风格数据不匹配'
        };
      }

      writingStyleRepository.delete();

      const deleted = writingStyleRepository.load();
      if (deleted) {
        return {
          testName,
          passed: false,
          message: '写作风格删除失败'
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '写作风格数据持久化正常' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testProjectConfigPersistence(): Promise<TestResult> {
    const testName = '项目配置数据持久化';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testProjectConfig = {
        id: 'PCTEST001',
        title: '测试书名',
        theme: '测试主题',
        genre: '玄幻',
        targetWordCount: 100000,
        narrativePerspective: '第三人称',
        targetAudience: '青少年',
        coreConflict: '测试冲突',
        mainPlot: '测试主要情节',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      projectConfigRepository.init(this.testDataDir);
      projectConfigRepository.save(testProjectConfig);

      const loaded = projectConfigRepository.load();

      if (!loaded) {
        return {
          testName,
          passed: false,
          message: '无法加载保存的项目配置数据'
        };
      }

      if (loaded.title !== testProjectConfig.title || loaded.genre !== testProjectConfig.genre) {
        return {
          testName,
          passed: false,
          message: '项目配置数据不匹配'
        };
      }

      projectConfigRepository.delete();

      const deleted = projectConfigRepository.load();
      if (deleted) {
        return {
          testName,
          passed: false,
          message: '项目配置删除失败'
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '项目配置数据持久化正常' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testMarkdownFilePersistence(): Promise<TestResult> {
    const testName = 'Markdown文件持久化';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      worldSettingMarkdownService.init();
      projectConfigMarkdownService.init();

      const testWorldSetting = {
        timePeriod: '测试时代',
        location: '测试地点',
        atmosphere: '测试氛围',
        rules: ['规则1', '规则2'],
        additionalInfo: '补充信息'
      };

      worldSettingMarkdownService.save(testWorldSetting);
      const loadedWorldSetting = worldSettingMarkdownService.load();

      if (loadedWorldSetting.timePeriod !== testWorldSetting.timePeriod ||
          loadedWorldSetting.location !== testWorldSetting.location) {
        return {
          testName,
          passed: false,
          message: '世界观MD数据不匹配'
        };
      }

      const testProjectConfig = {
        title: '测试书名',
        theme: '测试主题',
        genre: '测试类型',
        targetWordCount: 50000,
        narrativePerspective: '第一人称',
        targetAudience: '测试读者',
        coreConflict: '测试冲突',
        mainPlot: '测试情节'
      };

      projectConfigMarkdownService.save(testProjectConfig);
      const loadedProjectConfig = projectConfigMarkdownService.load();

      if (loadedProjectConfig.title !== testProjectConfig.title ||
          loadedProjectConfig.genre !== testProjectConfig.genre) {
        return {
          testName,
          passed: false,
          message: '项目配置MD数据不匹配'
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: 'Markdown文件持久化正常' };
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
