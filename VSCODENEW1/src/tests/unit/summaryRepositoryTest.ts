import * as path from 'path';
import * as fs from 'fs';
import { testLogger } from '../../utils/testLogger';
import { summaryRepository } from '../../repositories/implementations/summaryRepository';
import { ChapterSummary } from '../../data/storage';

export interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  duration?: number;
}

export class SummaryRepositoryUnitTest {
  private testDataDir: string;

  constructor(testDataDir: string) {
    this.testDataDir = testDataDir;
  }

  async runAllTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    results.push(await this.testInit());
    results.push(await this.testAdd());
    results.push(await this.testUpdate());
    results.push(await this.testDelete());
    results.push(await this.testFindById());
    results.push(await this.testFindByChapter());
    results.push(await this.testLoadAll());
    results.push(await this.testGenerateId());
    results.push(await this.testDuplicateChapter());
    results.push(await this.testEmptyRepository());

    return results;
  }

  private async testInit(): Promise<TestResult> {
    const testName = '初始化仓库';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const result = summaryRepository.init(this.testDataDir);
      
      if (!result) {
        return {
          testName,
          passed: false,
          message: '初始化失败'
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '仓库初始化成功' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testAdd(): Promise<TestResult> {
    const testName = '添加摘要';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testSummary: ChapterSummary = {
        id: 'UNIT001',
        chapterNumber: 1,
        chapterTitle: '单元测试章节',
        summary: '这是一个单元测试摘要',
        wordCount: 500,
        keyCharacters: ['角色A'],
        keyEvents: ['事件A'],
        mainConflict: '测试冲突',
        emotionalTone: '紧张',
        paceLevel: 'fast',
        createdAt: new Date().toISOString()
      };

      summaryRepository.init(this.testDataDir);
      const result = summaryRepository.add(testSummary);

      if (!result) {
        return {
          testName,
          passed: false,
          message: '添加摘要失败'
        };
      }

      const loaded = summaryRepository.findByChapter(1);
      if (!loaded) {
        return {
          testName,
          passed: false,
          message: '无法加载添加的摘要'
        };
      }

      summaryRepository.delete('UNIT001');

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '添加摘要成功' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testUpdate(): Promise<TestResult> {
    const testName = '更新摘要';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testSummary: ChapterSummary = {
        id: 'UNIT002',
        chapterNumber: 2,
        chapterTitle: '更新测试章节',
        summary: '原始摘要',
        wordCount: 500,
        keyCharacters: ['角色A'],
        keyEvents: ['事件A'],
        mainConflict: '原始冲突',
        emotionalTone: '紧张',
        paceLevel: 'fast',
        createdAt: new Date().toISOString()
      };

      summaryRepository.init(this.testDataDir);
      summaryRepository.add(testSummary);

      const updateResult = summaryRepository.update('UNIT002', { summary: '更新后的摘要', wordCount: 600 });

      if (!updateResult) {
        return {
          testName,
          passed: false,
          message: '更新摘要失败'
        };
      }

      const updated = summaryRepository.findById('UNIT002');
      if (!updated || updated.summary !== '更新后的摘要' || updated.wordCount !== 600) {
        return {
          testName,
          passed: false,
          message: '摘要数据未正确更新'
        };
      }

      summaryRepository.delete('UNIT002');

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '更新摘要成功' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testDelete(): Promise<TestResult> {
    const testName = '删除摘要';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testSummary: ChapterSummary = {
        id: 'UNIT003',
        chapterNumber: 3,
        chapterTitle: '删除测试章节',
        summary: '待删除的摘要',
        wordCount: 500,
        keyCharacters: ['角色A'],
        keyEvents: ['事件A'],
        mainConflict: '测试冲突',
        emotionalTone: '紧张',
        paceLevel: 'fast',
        createdAt: new Date().toISOString()
      };

      summaryRepository.init(this.testDataDir);
      summaryRepository.add(testSummary);

      const deleteResult = summaryRepository.delete('UNIT003');

      if (!deleteResult) {
        return {
          testName,
          passed: false,
          message: '删除摘要失败'
        };
      }

      const deleted = summaryRepository.findById('UNIT003');
      if (deleted) {
        return {
          testName,
          passed: false,
          message: '摘要未被删除'
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '删除摘要成功' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testFindById(): Promise<TestResult> {
    const testName = '按ID查找摘要';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testSummary: ChapterSummary = {
        id: 'UNIT004',
        chapterNumber: 4,
        chapterTitle: 'ID查找测试章节',
        summary: 'ID查找测试摘要',
        wordCount: 500,
        keyCharacters: ['角色A'],
        keyEvents: ['事件A'],
        mainConflict: '测试冲突',
        emotionalTone: '紧张',
        paceLevel: 'fast',
        createdAt: new Date().toISOString()
      };

      summaryRepository.init(this.testDataDir);
      summaryRepository.add(testSummary);

      const found = summaryRepository.findById('UNIT004');

      if (!found) {
        return {
          testName,
          passed: false,
          message: '无法找到摘要'
        };
      }

      if (found.id !== 'UNIT004' || found.chapterNumber !== 4) {
        return {
          testName,
          passed: false,
          message: '摘要数据不匹配'
        };
      }

      const notFound = summaryRepository.findById('NOTEXIST');
      if (notFound !== null) {
        return {
          testName,
          passed: false,
          message: '不存在的ID应返回null'
        };
      }

      summaryRepository.delete('UNIT004');

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '按ID查找摘要成功' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testFindByChapter(): Promise<TestResult> {
    const testName = '按章节查找摘要';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testSummary: ChapterSummary = {
        id: 'UNIT005',
        chapterNumber: 5,
        chapterTitle: '章节查找测试章节',
        summary: '章节查找测试摘要',
        wordCount: 500,
        keyCharacters: ['角色A'],
        keyEvents: ['事件A'],
        mainConflict: '测试冲突',
        emotionalTone: '紧张',
        paceLevel: 'fast',
        createdAt: new Date().toISOString()
      };

      summaryRepository.init(this.testDataDir);
      summaryRepository.add(testSummary);

      const found = summaryRepository.findByChapter(5);

      if (!found) {
        return {
          testName,
          passed: false,
          message: '无法找到摘要'
        };
      }

      if (found.chapterNumber !== 5) {
        return {
          testName,
          passed: false,
          message: '章节号不匹配'
        };
      }

      const notFound = summaryRepository.findByChapter(999);
      if (notFound !== null) {
        return {
          testName,
          passed: false,
          message: '不存在的章节应返回null'
        };
      }

      summaryRepository.delete('UNIT005');

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '按章节查找摘要成功' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testLoadAll(): Promise<TestResult> {
    const testName = '加载所有摘要';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testSummary1: ChapterSummary = {
        id: 'UNIT006',
        chapterNumber: 6,
        chapterTitle: '加载测试章节1',
        summary: '加载测试摘要1',
        wordCount: 500,
        keyCharacters: ['角色A'],
        keyEvents: ['事件A'],
        mainConflict: '测试冲突',
        emotionalTone: '紧张',
        paceLevel: 'fast',
        createdAt: new Date().toISOString()
      };

      const testSummary2: ChapterSummary = {
        id: 'UNIT007',
        chapterNumber: 7,
        chapterTitle: '加载测试章节2',
        summary: '加载测试摘要2',
        wordCount: 600,
        keyCharacters: ['角色B'],
        keyEvents: ['事件B'],
        mainConflict: '测试冲突2',
        emotionalTone: '轻松',
        paceLevel: 'slow',
        createdAt: new Date().toISOString()
      };

      summaryRepository.init(this.testDataDir);
      summaryRepository.add(testSummary1);
      summaryRepository.add(testSummary2);

      const all = summaryRepository.loadAll();

      if (all.length !== 2) {
        return {
          testName,
          passed: false,
          message: `期望加载2个摘要，实际加载${all.length}个`
        };
      }

      summaryRepository.delete('UNIT006');
      summaryRepository.delete('UNIT007');

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '加载所有摘要成功' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testGenerateId(): Promise<TestResult> {
    const testName = '生成ID';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      summaryRepository.init(this.testDataDir);

      const id1 = summaryRepository.generateId();
      const id2 = summaryRepository.generateId();
      const id3 = summaryRepository.generateId();

      if (!id1 || !id2 || !id3) {
        return {
          testName,
          passed: false,
          message: '生成ID失败'
        };
      }

      if (!id1.startsWith('SUM') || !id2.startsWith('SUM') || !id3.startsWith('SUM')) {
        return {
          testName,
          passed: false,
          message: 'ID前缀不正确'
        };
      }

      if (id1 === id2 || id2 === id3 || id1 === id3) {
        return {
          testName,
          passed: false,
          message: '生成的ID不唯一'
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '生成ID成功' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testDuplicateChapter(): Promise<TestResult> {
    const testName = '重复章节处理';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testSummary1: ChapterSummary = {
        id: 'UNIT008',
        chapterNumber: 8,
        chapterTitle: '重复章节1',
        summary: '原始摘要',
        wordCount: 500,
        keyCharacters: ['角色A'],
        keyEvents: ['事件A'],
        mainConflict: '测试冲突',
        emotionalTone: '紧张',
        paceLevel: 'fast',
        createdAt: new Date().toISOString()
      };

      const testSummary2: ChapterSummary = {
        id: 'UNIT009',
        chapterNumber: 8,
        chapterTitle: '重复章节2',
        summary: '更新后的摘要',
        wordCount: 600,
        keyCharacters: ['角色B'],
        keyEvents: ['事件B'],
        mainConflict: '更新冲突',
        emotionalTone: '轻松',
        paceLevel: 'slow',
        createdAt: new Date().toISOString()
      };

      summaryRepository.init(this.testDataDir);
      summaryRepository.add(testSummary1);
      summaryRepository.add(testSummary2);

      const found = summaryRepository.findByChapter(8);

      if (!found) {
        return {
          testName,
          passed: false,
          message: '无法找到摘要'
        };
      }

      if (found.summary !== '更新后的摘要') {
        return {
          testName,
          passed: false,
          message: '重复章节应更新原有摘要'
        };
      }

      summaryRepository.delete('UNIT009');

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '重复章节处理成功' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testEmptyRepository(): Promise<TestResult> {
    const testName = '空仓库处理';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      summaryRepository.init(this.testDataDir);

      const all = summaryRepository.loadAll();
      if (all.length !== 0) {
        return {
          testName,
          passed: false,
          message: '空仓库应返回空数组'
        };
      }

      const notFoundById = summaryRepository.findById('NOTEXIST');
      if (notFoundById !== null) {
        return {
          testName,
          passed: false,
          message: '空仓库查找不存在的ID应返回null'
        };
      }

      const notFoundByChapter = summaryRepository.findByChapter(999);
      if (notFoundByChapter !== null) {
        return {
          testName,
          passed: false,
          message: '空仓库查找不存在的章节应返回null'
        };
      }

      const updateResult = summaryRepository.update('NOTEXIST', { summary: '测试' });
      if (updateResult) {
        return {
          testName,
          passed: false,
          message: '空仓库更新不存在的ID应返回false'
        };
      }

      const deleteResult = summaryRepository.delete('NOTEXIST');
      if (deleteResult) {
        return {
          testName,
          passed: false,
          message: '空仓库删除不存在的ID应返回false'
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '空仓库处理成功' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }
}
