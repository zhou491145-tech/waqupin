import * as path from 'path';
import * as fs from 'fs';
import { testLogger } from '../../utils/testLogger';
import { outlineRepository } from '../../repositories/implementations/outlineRepository';
import { Outline } from '../../data/storage';

export interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  duration?: number;
}

export class OutlineRepositoryUnitTest {
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
    results.push(await this.testLoadAll());
    results.push(await this.testGenerateId());
    results.push(await this.testEmptyRepository());

    return results;
  }

  private async testInit(): Promise<TestResult> {
    const testName = '初始化仓库';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const result = outlineRepository.init(this.testDataDir);
      
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
    const testName = '添加大纲';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testOutline: Outline = {
        id: 'OUTUNIT001',
        chapterNumber: 1,
        title: '单元测试大纲',
        content: '这是一个单元测试大纲内容',
        type: 'chapter',
        orderIndex: 1,
        status: 'draft',
        createdAt: new Date().toISOString()
      };

      outlineRepository.init(this.testDataDir);
      const result = outlineRepository.add(testOutline);

      if (!result) {
        return {
          testName,
          passed: false,
          message: '添加大纲失败'
        };
      }

      const loaded = outlineRepository.findById('OUTUNIT001');
      if (!loaded) {
        return {
          testName,
          passed: false,
          message: '无法加载添加的大纲'
        };
      }

      outlineRepository.delete('OUTUNIT001');

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '添加大纲成功' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testUpdate(): Promise<TestResult> {
    const testName = '更新大纲';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testOutline: Outline = {
        id: 'OUTUNIT002',
        chapterNumber: 2,
        title: '更新测试大纲',
        content: '原始内容',
        type: 'chapter',
        orderIndex: 2,
        status: 'draft',
        createdAt: new Date().toISOString()
      };

      outlineRepository.init(this.testDataDir);
      outlineRepository.add(testOutline);

      const updateResult = outlineRepository.update('OUTUNIT002', { title: '更新后的大纲', status: 'finalized' });

      if (!updateResult) {
        return {
          testName,
          passed: false,
          message: '更新大纲失败'
        };
      }

      const updated = outlineRepository.findById('OUTUNIT002');
      if (!updated || updated.title !== '更新后的大纲' || updated.status !== 'finalized') {
        return {
          testName,
          passed: false,
          message: '大纲数据未正确更新'
        };
      }

      outlineRepository.delete('OUTUNIT002');

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '更新大纲成功' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testDelete(): Promise<TestResult> {
    const testName = '删除大纲';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testOutline: Outline = {
        id: 'OUTUNIT003',
        chapterNumber: 3,
        title: '删除测试大纲',
        content: '待删除的内容',
        type: 'chapter',
        orderIndex: 3,
        status: 'draft',
        createdAt: new Date().toISOString()
      };

      outlineRepository.init(this.testDataDir);
      outlineRepository.add(testOutline);

      const deleteResult = outlineRepository.delete('OUTUNIT003');

      if (!deleteResult) {
        return {
          testName,
          passed: false,
          message: '删除大纲失败'
        };
      }

      const deleted = outlineRepository.findById('OUTUNIT003');
      if (deleted) {
        return {
          testName,
          passed: false,
          message: '大纲未被删除'
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '删除大纲成功' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testFindById(): Promise<TestResult> {
    const testName = '按ID查找大纲';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testOutline: Outline = {
        id: 'OUTUNIT004',
        chapterNumber: 4,
        title: 'ID查找测试大纲',
        content: 'ID查找测试内容',
        type: 'chapter',
        orderIndex: 4,
        status: 'draft',
        createdAt: new Date().toISOString()
      };

      outlineRepository.init(this.testDataDir);
      outlineRepository.add(testOutline);

      const found = outlineRepository.findById('OUTUNIT004');

      if (!found) {
        return {
          testName,
          passed: false,
          message: '无法找到大纲'
        };
      }

      if (found.id !== 'OUTUNIT004' || found.chapterNumber !== 4) {
        return {
          testName,
          passed: false,
          message: '大纲数据不匹配'
        };
      }

      const notFound = outlineRepository.findById('NOTEXIST');
      if (notFound !== null) {
        return {
          testName,
          passed: false,
          message: '不存在的ID应返回null'
        };
      }

      outlineRepository.delete('OUTUNIT004');

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '按ID查找大纲成功' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testLoadAll(): Promise<TestResult> {
    const testName = '加载所有大纲';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testOutline1: Outline = {
        id: 'OUTUNIT005',
        chapterNumber: 5,
        title: '加载测试大纲1',
        content: '加载测试内容1',
        type: 'chapter',
        orderIndex: 5,
        status: 'draft',
        createdAt: new Date().toISOString()
      };

      const testOutline2: Outline = {
        id: 'OUTUNIT006',
        chapterNumber: 6,
        title: '加载测试大纲2',
        content: '加载测试内容2',
        type: 'scene',
        orderIndex: 6,
        status: 'finalized',
        createdAt: new Date().toISOString()
      };

      outlineRepository.init(this.testDataDir);
      outlineRepository.add(testOutline1);
      outlineRepository.add(testOutline2);

      const all = outlineRepository.loadAll();

      if (all.length !== 2) {
        return {
          testName,
          passed: false,
          message: `期望加载2个大纲，实际加载${all.length}个`
        };
      }

      outlineRepository.delete('OUTUNIT005');
      outlineRepository.delete('OUTUNIT006');

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '加载所有大纲成功' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testGenerateId(): Promise<TestResult> {
    const testName = '生成ID';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      outlineRepository.init(this.testDataDir);

      const id1 = outlineRepository.generateId();
      const id2 = outlineRepository.generateId();
      const id3 = outlineRepository.generateId();

      if (!id1 || !id2 || !id3) {
        return {
          testName,
          passed: false,
          message: '生成ID失败'
        };
      }

      if (!id1.startsWith('OUT') || !id2.startsWith('OUT') || !id3.startsWith('OUT')) {
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

  private async testEmptyRepository(): Promise<TestResult> {
    const testName = '空仓库处理';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      outlineRepository.init(this.testDataDir);

      const all = outlineRepository.loadAll();
      if (all.length !== 0) {
        return {
          testName,
          passed: false,
          message: '空仓库应返回空数组'
        };
      }

      const notFoundById = outlineRepository.findById('NOTEXIST');
      if (notFoundById !== null) {
        return {
          testName,
          passed: false,
          message: '空仓库查找不存在的ID应返回null'
        };
      }

      const updateResult = outlineRepository.update('NOTEXIST', { title: '测试' });
      if (updateResult) {
        return {
          testName,
          passed: false,
          message: '空仓库更新不存在的ID应返回false'
        };
      }

      const deleteResult = outlineRepository.delete('NOTEXIST');
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
