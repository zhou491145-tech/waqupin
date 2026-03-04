import * as path from 'path';
import * as fs from 'fs';
import { testLogger } from '../../utils/testLogger';

export interface UnitTestResult {
  testName: string;
  passed: boolean;
  message: string;
  duration?: number;
}

export class ForeshadowRepositoryUnitTest {
  private testDataDir: string;
  private testFilePath: string;

  constructor(testDataDir: string) {
    this.testDataDir = testDataDir;
    this.testFilePath = path.join(testDataDir, 'foreshadows.json');
  }

  async runAllTests(): Promise<UnitTestResult[]> {
    const results: UnitTestResult[] = [];

    testLogger.log('🧪 开始ForeshadowRepository单元测试...');

    try {
      results.push(await this.testInit());
      results.push(await this.testAdd());
      results.push(await this.testLoadAll());
      results.push(await this.testUpdate());
      results.push(await this.testDelete());
      results.push(await this.testFindById());
      results.push(await this.testFindByStatus());
      results.push(await this.testFindByChapter());
      results.push(await this.testGenerateId());
    } catch (error) {
      testLogger.log(`❌ 测试执行失败: ${error}`);
      results.push({
        testName: '总体测试',
        passed: false,
        message: `测试执行失败: ${error}`
      });
    } finally {
      this.cleanup();
    }

    return results;
  }

  private async testInit(): Promise<UnitTestResult> {
    const testName = '初始化仓库';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { foreshadowRepository } = await import('../../repositories/implementations/foreshadowRepository');

      const result = foreshadowRepository.init(this.testDataDir);

      if (typeof result !== 'boolean' || !result) {
        return {
          testName,
          passed: false,
          message: '初始化失败',
          duration: Date.now() - startTime
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return {
        testName,
        passed: true,
        message: '仓库初始化成功',
        duration: Date.now() - startTime
      };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return {
        testName,
        passed: false,
        message: `错误: ${error}`,
        duration: Date.now() - startTime
      };
    }
  }

  private async testAdd(): Promise<UnitTestResult> {
    const testName = '添加伏笔';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { foreshadowRepository } = await import('../../repositories/implementations/foreshadowRepository');

      foreshadowRepository.init(this.testDataDir);

      const testForeshadow = {
        id: 'F0001',
        description: '测试伏笔',
        status: 'pending' as const,
        importance: 'high' as const,
        plantedChapter: 1,
        relatedCharacters: [],
        keyword: '测试',
        notes: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = foreshadowRepository.add(testForeshadow);

      if (!result) {
        return {
          testName,
          passed: false,
          message: '添加伏笔失败',
          duration: Date.now() - startTime
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return {
        testName,
        passed: true,
        message: '伏笔添加成功',
        duration: Date.now() - startTime
      };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return {
        testName,
        passed: false,
        message: `错误: ${error}`,
        duration: Date.now() - startTime
      };
    }
  }

  private async testLoadAll(): Promise<UnitTestResult> {
    const testName = '加载所有伏笔';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { foreshadowRepository } = await import('../../repositories/implementations/foreshadowRepository');

      foreshadowRepository.init(this.testDataDir);

      const foreshadows = foreshadowRepository.loadAll();

      if (!Array.isArray(foreshadows)) {
        return {
          testName,
          passed: false,
          message: '加载结果不是数组',
          duration: Date.now() - startTime
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return {
        testName,
        passed: true,
        message: `加载${foreshadows.length}个伏笔`,
        duration: Date.now() - startTime
      };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return {
        testName,
        passed: false,
        message: `错误: ${error}`,
        duration: Date.now() - startTime
      };
    }
  }

  private async testUpdate(): Promise<UnitTestResult> {
    const testName = '更新伏笔';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { foreshadowRepository } = await import('../../repositories/implementations/foreshadowRepository');

      foreshadowRepository.init(this.testDataDir);

      const result = foreshadowRepository.update('F0001', { description: '更新后的描述' });

      if (!result) {
        return {
          testName,
          passed: false,
          message: '更新伏笔失败',
          duration: Date.now() - startTime
        };
      }

      const updated = foreshadowRepository.findById('F0001');
      if (!updated || updated.description !== '更新后的描述') {
        return {
          testName,
          passed: false,
          message: '更新验证失败',
          duration: Date.now() - startTime
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return {
        testName,
        passed: true,
        message: '伏笔更新成功',
        duration: Date.now() - startTime
      };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return {
        testName,
        passed: false,
        message: `错误: ${error}`,
        duration: Date.now() - startTime
      };
    }
  }

  private async testDelete(): Promise<UnitTestResult> {
    const testName = '删除伏笔';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { foreshadowRepository } = await import('../../repositories/implementations/foreshadowRepository');

      foreshadowRepository.init(this.testDataDir);

      const result = foreshadowRepository.delete('F0001');

      if (!result) {
        return {
          testName,
          passed: false,
          message: '删除伏笔失败',
          duration: Date.now() - startTime
        };
      }

      const deleted = foreshadowRepository.findById('F0001');
      if (deleted !== null) {
        return {
          testName,
          passed: false,
          message: '删除验证失败',
          duration: Date.now() - startTime
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return {
        testName,
        passed: true,
        message: '伏笔删除成功',
        duration: Date.now() - startTime
      };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return {
        testName,
        passed: false,
        message: `错误: ${error}`,
        duration: Date.now() - startTime
      };
    }
  }

  private async testFindById(): Promise<UnitTestResult> {
    const testName = '按ID查找伏笔';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { foreshadowRepository } = await import('../../repositories/implementations/foreshadowRepository');

      foreshadowRepository.init(this.testDataDir);

      const testForeshadow = {
        id: 'F0002',
        description: '查找测试',
        status: 'pending' as const,
        importance: 'medium' as const,
        plantedChapter: 2,
        relatedCharacters: [],
        keyword: '测试',
        notes: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      foreshadowRepository.add(testForeshadow);

      const found = foreshadowRepository.findById('F0002');

      if (!found || found.id !== 'F0002') {
        return {
          testName,
          passed: false,
          message: '查找失败',
          duration: Date.now() - startTime
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return {
        testName,
        passed: true,
        message: '按ID查找成功',
        duration: Date.now() - startTime
      };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return {
        testName,
        passed: false,
        message: `错误: ${error}`,
        duration: Date.now() - startTime
      };
    }
  }

  private async testFindByStatus(): Promise<UnitTestResult> {
    const testName = '按状态查找伏笔';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { foreshadowRepository } = await import('../../repositories/implementations/foreshadowRepository');

      foreshadowRepository.init(this.testDataDir);

      const found = foreshadowRepository.findByStatus('pending');

      if (!Array.isArray(found)) {
        return {
          testName,
          passed: false,
          message: '查找失败',
          duration: Date.now() - startTime
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return {
        testName,
        passed: true,
        message: `找到${found.length}个待处理伏笔`,
        duration: Date.now() - startTime
      };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return {
        testName,
        passed: false,
        message: `错误: ${error}`,
        duration: Date.now() - startTime
      };
    }
  }

  private async testFindByChapter(): Promise<UnitTestResult> {
    const testName = '按章节查找伏笔';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { foreshadowRepository } = await import('../../repositories/implementations/foreshadowRepository');

      foreshadowRepository.init(this.testDataDir);

      const found = foreshadowRepository.findByChapter(2);

      if (!Array.isArray(found) || found.length === 0) {
        return {
          testName,
          passed: false,
          message: '查找失败',
          duration: Date.now() - startTime
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return {
        testName,
        passed: true,
        message: `找到${found.length}个第2章伏笔`,
        duration: Date.now() - startTime
      };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return {
        testName,
        passed: false,
        message: `错误: ${error}`,
        duration: Date.now() - startTime
      };
    }
  }

  private async testGenerateId(): Promise<UnitTestResult> {
    const testName = '生成伏笔ID';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { foreshadowRepository } = await import('../../repositories/implementations/foreshadowRepository');

      foreshadowRepository.init(this.testDataDir);

      const id1 = foreshadowRepository.generateId();
      const id2 = foreshadowRepository.generateId();

      if (typeof id1 !== 'string' || typeof id2 !== 'string') {
        return {
          testName,
          passed: false,
          message: 'ID生成失败',
          duration: Date.now() - startTime
        };
      }

      if (id1 === id2) {
        return {
          testName,
          passed: false,
          message: 'ID重复',
          duration: Date.now() - startTime
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return {
        testName,
        passed: true,
        message: `生成ID: ${id1}, ${id2}`,
        duration: Date.now() - startTime
      };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return {
        testName,
        passed: false,
        message: `错误: ${error}`,
        duration: Date.now() - startTime
      };
    }
  }

  private cleanup() {
    try {
      if (fs.existsSync(this.testFilePath)) {
        fs.unlinkSync(this.testFilePath);
      }
    } catch (error) {
      testLogger.log(`⚠️ 清理测试数据失败: ${error}`);
    }
  }
}
