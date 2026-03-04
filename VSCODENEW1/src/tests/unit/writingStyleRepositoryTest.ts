import * as path from 'path';
import * as fs from 'fs';
import { testLogger } from '../../utils/testLogger';
import { writingStyleRepository } from '../../repositories/implementations/writingStyleRepository';
import { WritingStyle } from '../../data/storage';

export interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  duration?: number;
}

export class WritingStyleRepositoryUnitTest {
  private testDataDir: string;

  constructor(testDataDir: string) {
    this.testDataDir = testDataDir;
  }

  async runAllTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    results.push(await this.testInit());
    results.push(await this.testSave());
    results.push(await this.testLoad());
    results.push(await this.testExists());
    results.push(await this.testDelete());
    results.push(await this.testEmptyRepository());

    return results;
  }

  private async testInit(): Promise<TestResult> {
    const testName = '初始化仓库';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const result = writingStyleRepository.init(this.testDataDir);
      
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

  private async testSave(): Promise<TestResult> {
    const testName = '保存写作风格';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testStyle: WritingStyle = {
        id: 'style-001',
        name: '测试风格',
        baseAuthor: '测试作者',
        description: '这是一个测试风格',
        characteristics: ['特征1', '特征2', '特征3'],
        writingRules: ['规则1', '规则2'],
        exampleSentences: ['示例1', '示例2'],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      writingStyleRepository.init(this.testDataDir);
      const result = writingStyleRepository.save(testStyle);

      if (!result) {
        return {
          testName,
          passed: false,
          message: '保存写作风格失败'
        };
      }

      writingStyleRepository.delete();

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '保存写作风格成功' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testLoad(): Promise<TestResult> {
    const testName = '加载写作风格';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testStyle: WritingStyle = {
        id: 'style-001',
        name: '测试风格',
        baseAuthor: '测试作者',
        description: '这是一个测试风格',
        characteristics: ['特征1', '特征2'],
        writingRules: ['规则1', '规则2'],
        exampleSentences: ['示例1', '示例2'],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      writingStyleRepository.init(this.testDataDir);
      writingStyleRepository.save(testStyle);

      const loaded = writingStyleRepository.load();

      if (!loaded) {
        return {
          testName,
          passed: false,
          message: '无法加载写作风格'
        };
      }

      if (loaded.name !== '测试风格' || loaded.baseAuthor !== '测试作者') {
        return {
          testName,
          passed: false,
          message: '写作风格数据不匹配'
        };
      }

      writingStyleRepository.delete();

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '加载写作风格成功' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testExists(): Promise<TestResult> {
    const testName = '检查存在性';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testStyle: WritingStyle = {
        id: 'style-001',
        name: '测试风格',
        baseAuthor: '测试作者',
        description: '这是一个测试风格',
        characteristics: ['特征1', '特征2'],
        writingRules: ['规则1', '规则2'],
        exampleSentences: ['示例1', '示例2'],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      writingStyleRepository.init(this.testDataDir);

      const existsBefore = writingStyleRepository.exists();
      if (existsBefore) {
        return {
          testName,
          passed: false,
          message: '空仓库应返回不存在'
        };
      }

      writingStyleRepository.save(testStyle);

      const existsAfter = writingStyleRepository.exists();
      if (!existsAfter) {
        return {
          testName,
          passed: false,
          message: '保存后应返回存在'
        };
      }

      writingStyleRepository.delete();

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '检查存在性成功' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testDelete(): Promise<TestResult> {
    const testName = '删除写作风格';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testStyle: WritingStyle = {
        id: 'style-001',
        name: '测试风格',
        baseAuthor: '测试作者',
        description: '这是一个测试风格',
        characteristics: ['特征1', '特征2'],
        writingRules: ['规则1', '规则2'],
        exampleSentences: ['示例1', '示例2'],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      writingStyleRepository.init(this.testDataDir);
      writingStyleRepository.save(testStyle);

      const deleteResult = writingStyleRepository.delete();

      if (!deleteResult) {
        return {
          testName,
          passed: false,
          message: '删除写作风格失败'
        };
      }

      const exists = writingStyleRepository.exists();
      if (exists) {
        return {
          testName,
          passed: false,
          message: '写作风格未被删除'
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '删除写作风格成功' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testEmptyRepository(): Promise<TestResult> {
    const testName = '空仓库处理';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      writingStyleRepository.init(this.testDataDir);

      const loaded = writingStyleRepository.load();
      if (loaded !== null) {
        return {
          testName,
          passed: false,
          message: '空仓库应返回null'
        };
      }

      const exists = writingStyleRepository.exists();
      if (exists) {
        return {
          testName,
          passed: false,
          message: '空仓库应返回不存在'
        };
      }

      const deleteResult = writingStyleRepository.delete();
      if (deleteResult) {
        return {
          testName,
          passed: false,
          message: '空仓库删除应返回false'
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
