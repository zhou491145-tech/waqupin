import * as path from 'path';
import * as fs from 'fs';
import { testLogger } from '../../utils/testLogger';
import { worldSettingRepository } from '../../repositories/implementations/worldSettingRepository';
import { WorldSetting } from '../../data/storage';

export interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  duration?: number;
}

export class WorldSettingRepositoryUnitTest {
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
      const result = worldSettingRepository.init(this.testDataDir);
      
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
    const testName = '保存世界观';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testSetting: WorldSetting = {
        id: 'world-001',
        title: '测试世界观',
        timePeriod: '现代',
        location: '都市',
        atmosphere: '紧张',
        rules: ['规则1', '规则2', '规则3'],
        additionalInfo: '测试补充信息',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      worldSettingRepository.init(this.testDataDir);
      const result = worldSettingRepository.save(testSetting);

      if (!result) {
        return {
          testName,
          passed: false,
          message: '保存世界观失败'
        };
      }

      worldSettingRepository.delete();

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '保存世界观成功' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testLoad(): Promise<TestResult> {
    const testName = '加载世界观';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testSetting: WorldSetting = {
        id: 'world-001',
        title: '测试世界观',
        timePeriod: '现代',
        location: '都市',
        atmosphere: '紧张',
        rules: ['规则1', '规则2', '规则3'],
        additionalInfo: '测试补充信息',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      worldSettingRepository.init(this.testDataDir);
      worldSettingRepository.save(testSetting);

      const loaded = worldSettingRepository.load();

      if (!loaded) {
        return {
          testName,
          passed: false,
          message: '无法加载世界观'
        };
      }

      if (loaded.timePeriod !== '现代' || loaded.location !== '都市') {
        return {
          testName,
          passed: false,
          message: '世界观数据不匹配'
        };
      }

      worldSettingRepository.delete();

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '加载世界观成功' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testExists(): Promise<TestResult> {
    const testName = '检查存在性';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testSetting: WorldSetting = {
        id: 'world-001',
        title: '测试世界观',
        timePeriod: '现代',
        location: '都市',
        atmosphere: '紧张',
        rules: ['规则1', '规则2', '规则3'],
        additionalInfo: '测试补充信息',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      worldSettingRepository.init(this.testDataDir);

      const existsBefore = worldSettingRepository.exists();
      if (existsBefore) {
        return {
          testName,
          passed: false,
          message: '空仓库应返回不存在'
        };
      }

      worldSettingRepository.save(testSetting);

      const existsAfter = worldSettingRepository.exists();
      if (!existsAfter) {
        return {
          testName,
          passed: false,
          message: '保存后应返回存在'
        };
      }

      worldSettingRepository.delete();

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '检查存在性成功' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testDelete(): Promise<TestResult> {
    const testName = '删除世界观';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testSetting: WorldSetting = {
        id: 'world-001',
        title: '测试世界观',
        timePeriod: '现代',
        location: '都市',
        atmosphere: '紧张',
        rules: ['规则1', '规则2', '规则3'],
        additionalInfo: '测试补充信息',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      worldSettingRepository.init(this.testDataDir);
      worldSettingRepository.save(testSetting);

      const deleteResult = worldSettingRepository.delete();

      if (!deleteResult) {
        return {
          testName,
          passed: false,
          message: '删除世界观失败'
        };
      }

      const exists = worldSettingRepository.exists();
      if (exists) {
        return {
          testName,
          passed: false,
          message: '世界观未被删除'
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '删除世界观成功' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testEmptyRepository(): Promise<TestResult> {
    const testName = '空仓库处理';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      worldSettingRepository.init(this.testDataDir);

      const loaded = worldSettingRepository.load();
      if (loaded !== null) {
        return {
          testName,
          passed: false,
          message: '空仓库应返回null'
        };
      }

      const exists = worldSettingRepository.exists();
      if (exists) {
        return {
          testName,
          passed: false,
          message: '空仓库应返回不存在'
        };
      }

      const deleteResult = worldSettingRepository.delete();
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
