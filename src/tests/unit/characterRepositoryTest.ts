import * as path from 'path';
import * as fs from 'fs';
import { testLogger } from '../../utils/testLogger';

export interface UnitTestResult {
  testName: string;
  passed: boolean;
  message: string;
  duration?: number;
}

export class CharacterRepositoryUnitTest {
  private testDataDir: string;
  private testFilePath: string;

  constructor(testDataDir: string) {
    this.testDataDir = testDataDir;
    this.testFilePath = path.join(testDataDir, 'characters.json');
  }

  async runAllTests(): Promise<UnitTestResult[]> {
    const results: UnitTestResult[] = [];

    testLogger.log('🧪 开始CharacterRepository单元测试...');

    try {
      results.push(await this.testInit());
      results.push(await this.testAdd());
      results.push(await this.testLoadAll());
      results.push(await this.testUpdate());
      results.push(await this.testDelete());
      results.push(await this.testFindById());
      results.push(await this.testFindByName());
      results.push(await this.testFindByRole());
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
      const { characterRepository } = await import('../../repositories/implementations/characterRepository');

      const result = characterRepository.init(this.testDataDir);

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
    const testName = '添加角色';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { characterRepository } = await import('../../repositories/implementations/characterRepository');

      characterRepository.init(this.testDataDir);

      const testCharacter = {
        id: 'C001',
        name: '测试角色',
        aliases: ['测试别名'],
        role: 'protagonist' as const,
        description: '测试描述',
        personality: '测试性格',
        background: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = characterRepository.add(testCharacter);

      if (!result) {
        return {
          testName,
          passed: false,
          message: '添加角色失败',
          duration: Date.now() - startTime
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return {
        testName,
        passed: true,
        message: '角色添加成功',
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
    const testName = '加载所有角色';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { characterRepository } = await import('../../repositories/implementations/characterRepository');

      characterRepository.init(this.testDataDir);

      const characters = characterRepository.loadAll();

      if (!Array.isArray(characters)) {
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
        message: `加载${characters.length}个角色`,
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
    const testName = '更新角色';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { characterRepository } = await import('../../repositories/implementations/characterRepository');

      characterRepository.init(this.testDataDir);

      const result = characterRepository.update('C001', { description: '更新后的描述' });

      if (!result) {
        return {
          testName,
          passed: false,
          message: '更新角色失败',
          duration: Date.now() - startTime
        };
      }

      const updated = characterRepository.findById('C001');
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
        message: '角色更新成功',
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
    const testName = '删除角色';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { characterRepository } = await import('../../repositories/implementations/characterRepository');

      characterRepository.init(this.testDataDir);

      const result = characterRepository.delete('C001');

      if (!result) {
        return {
          testName,
          passed: false,
          message: '删除角色失败',
          duration: Date.now() - startTime
        };
      }

      const deleted = characterRepository.findById('C001');
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
        message: '角色删除成功',
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
    const testName = '按ID查找角色';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { characterRepository } = await import('../../repositories/implementations/characterRepository');

      characterRepository.init(this.testDataDir);

      const testCharacter = {
        id: 'C002',
        name: '查找测试',
        aliases: [],
        role: 'supporting' as const,
        description: '测试',
        personality: '',
        background: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      characterRepository.add(testCharacter);

      const found = characterRepository.findById('C002');

      if (!found || found.id !== 'C002') {
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

  private async testFindByName(): Promise<UnitTestResult> {
    const testName = '按名称查找角色';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { characterRepository } = await import('../../repositories/implementations/characterRepository');

      characterRepository.init(this.testDataDir);

      const found = characterRepository.findByName('查找测试');

      if (!found || found.name !== '查找测试') {
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
        message: '按名称查找成功',
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

  private async testFindByRole(): Promise<UnitTestResult> {
    const testName = '按角色类型查找';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { characterRepository } = await import('../../repositories/implementations/characterRepository');

      characterRepository.init(this.testDataDir);

      const found = characterRepository.findByRole('supporting');

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
        message: `找到${found.length}个配角`,
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
