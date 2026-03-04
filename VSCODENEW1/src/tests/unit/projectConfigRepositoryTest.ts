import * as path from 'path';
import * as fs from 'fs';
import { testLogger } from '../../utils/testLogger';
import { projectConfigRepository } from '../../repositories/implementations/projectConfigRepository';
import { ProjectConfig } from '../../data/storage';

export interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  duration?: number;
}

export class ProjectConfigRepositoryUnitTest {
  private testDataDir: string;

  constructor(testDataDir: string) {
    this.testDataDir = testDataDir;
  }

  async runAllTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    results.push(await this.testInit());
    results.push(await this.testSave());
    results.push(await this.testLoad());
    results.push(await this.testUpdate());
    results.push(await this.testExists());
    results.push(await this.testDelete());
    results.push(await this.testEmptyRepository());

    return results;
  }

  private async testInit(): Promise<TestResult> {
    const testName = '初始化仓库';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const result = projectConfigRepository.init(this.testDataDir);
      
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
    const testName = '保存项目配置';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testConfig: ProjectConfig = {
        id: 'test-project-001',
        title: '测试项目',
        theme: '测试主题',
        genre: '奇幻',
        targetWordCount: 100000,
        narrativePerspective: '第三人称',
        targetAudience: '青年',
        coreConflict: '测试冲突',
        mainPlot: '测试情节',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      projectConfigRepository.init(this.testDataDir);
      const result = projectConfigRepository.save(testConfig);

      if (!result) {
        return {
          testName,
          passed: false,
          message: '保存项目配置失败'
        };
      }

      projectConfigRepository.delete();

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '保存项目配置成功' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testLoad(): Promise<TestResult> {
    const testName = '加载项目配置';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testConfig: ProjectConfig = {
        id: 'test-project-001',
        title: '测试项目',
        theme: '测试主题',
        genre: '奇幻',
        targetWordCount: 100000,
        narrativePerspective: '第三人称',
        targetAudience: '青年',
        coreConflict: '测试冲突',
        mainPlot: '测试情节',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      projectConfigRepository.init(this.testDataDir);
      projectConfigRepository.save(testConfig);

      const loaded = projectConfigRepository.load();

      if (!loaded) {
        return {
          testName,
          passed: false,
          message: '无法加载项目配置'
        };
      }

      if (loaded.title !== '测试项目' || loaded.genre !== '奇幻') {
        return {
          testName,
          passed: false,
          message: '项目配置数据不匹配'
        };
      }

      projectConfigRepository.delete();

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '加载项目配置成功' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testUpdate(): Promise<TestResult> {
    const testName = '更新项目配置';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testConfig: ProjectConfig = {
        id: 'test-project-001',
        title: '测试项目',
        theme: '测试主题',
        genre: '奇幻',
        targetWordCount: 100000,
        narrativePerspective: '第三人称',
        targetAudience: '青年',
        coreConflict: '测试冲突',
        mainPlot: '测试情节',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      projectConfigRepository.init(this.testDataDir);
      projectConfigRepository.save(testConfig);

      const updateResult = projectConfigRepository.update({
        targetWordCount: 5000,
        genre: '科幻'
      });

      if (!updateResult) {
        return {
          testName,
          passed: false,
          message: '更新项目配置失败'
        };
      }

      const updated = projectConfigRepository.load();
      if (!updated || updated.targetWordCount !== 5000 || updated.genre !== '科幻') {
        return {
          testName,
          passed: false,
          message: '项目配置未正确更新'
        };
      }

      projectConfigRepository.delete();

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '更新项目配置成功' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testExists(): Promise<TestResult> {
    const testName = '检查存在性';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testConfig: ProjectConfig = {
        id: 'test-project-001',
        title: '测试项目',
        theme: '测试主题',
        genre: '奇幻',
        targetWordCount: 100000,
        narrativePerspective: '第三人称',
        targetAudience: '青年',
        coreConflict: '测试冲突',
        mainPlot: '测试情节',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      projectConfigRepository.init(this.testDataDir);

      const existsBefore = projectConfigRepository.exists();
      if (existsBefore) {
        return {
          testName,
          passed: false,
          message: '空仓库应返回不存在'
        };
      }

      projectConfigRepository.save(testConfig);

      const existsAfter = projectConfigRepository.exists();
      if (!existsAfter) {
        return {
          testName,
          passed: false,
          message: '保存后应返回存在'
        };
      }

      projectConfigRepository.delete();

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '检查存在性成功' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testDelete(): Promise<TestResult> {
    const testName = '删除项目配置';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const testConfig: ProjectConfig = {
        id: 'test-project-001',
        title: '测试项目',
        theme: '测试主题',
        genre: '奇幻',
        targetWordCount: 100000,
        narrativePerspective: '第三人称',
        targetAudience: '青年',
        coreConflict: '测试冲突',
        mainPlot: '测试情节',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      projectConfigRepository.init(this.testDataDir);
      projectConfigRepository.save(testConfig);

      const deleteResult = projectConfigRepository.delete();

      if (!deleteResult) {
        return {
          testName,
          passed: false,
          message: '删除项目配置失败'
        };
      }

      const exists = projectConfigRepository.exists();
      if (exists) {
        return {
          testName,
          passed: false,
          message: '项目配置未被删除'
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '删除项目配置成功' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testEmptyRepository(): Promise<TestResult> {
    const testName = '空仓库处理';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      projectConfigRepository.init(this.testDataDir);

      const loaded = projectConfigRepository.load();
      if (loaded !== null) {
        return {
          testName,
          passed: false,
          message: '空仓库应返回null'
        };
      }

      const exists = projectConfigRepository.exists();
      if (exists) {
        return {
          testName,
          passed: false,
          message: '空仓库应返回不存在'
        };
      }

      const updateResult = projectConfigRepository.update({ targetWordCount: 1000 });
      if (updateResult) {
        return {
          testName,
          passed: false,
          message: '空仓库更新应返回false'
        };
      }

      const deleteResult = projectConfigRepository.delete();
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
