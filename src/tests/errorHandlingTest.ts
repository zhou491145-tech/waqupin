import * as vscode from 'vscode';
import * as path from 'path';
import { characterRepository } from '../repositories';
import { foreshadowRepository } from '../repositories';
import { summaryRepository } from '../repositories';
import { outlineRepository } from '../repositories';
import { chapterGenerationService } from '../services/chapterGenerationService';
import { contextService } from '../services/contextService';
import { foreshadowFilterService } from '../services/foreshadowFilterService';
import { testLogger } from '../utils/testLogger';

export class ErrorHandlingTest {
  private testDataDir: string;

  constructor(testDataDir: string) {
    this.testDataDir = testDataDir;
  }

  async runAllTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    testLogger.log('🧪 开始错误处理和边界情况测试...');

    try {
      results.push(await this.testEmptyDataHandling());
      results.push(await this.testInvalidDataHandling());
      results.push(await this.testDuplicateDataHandling());
      results.push(await this.testMissingFileHandling());
      results.push(await this.testConcurrentAccessHandling());
      results.push(await this.testLargeDataHandling());
      results.push(await this.testSpecialCharacterHandling());
      results.push(await this.testBoundaryValueHandling());
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

  private async testEmptyDataHandling(): Promise<TestResult> {
    const testName = '空数据处理';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      characterRepository.init(this.testDataDir);

      const allCharacters = characterRepository.loadAll();
      if (allCharacters.length !== 0) {
        return {
          testName,
          passed: false,
          message: '空数据加载失败'
        };
      }

      const emptyCharacter = characterRepository.findById('NONEXISTENT');
      if (emptyCharacter !== null) {
        return {
          testName,
          passed: false,
          message: '空数据查询失败'
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '空数据处理正常' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testInvalidDataHandling(): Promise<TestResult> {
    const testName = '无效数据处理';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      characterRepository.init(this.testDataDir);

      const invalidCharacter = {
        id: '',
        name: '',
        aliases: [],
        role: 'protagonist' as const,
        description: '',
        personality: '',
        background: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = characterRepository.add(invalidCharacter);

      if (result) {
        return {
          testName,
          passed: false,
          message: '无效数据未被拒绝'
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '无效数据处理正常' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testDuplicateDataHandling(): Promise<TestResult> {
    const testName = '重复数据处理';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      characterRepository.init(this.testDataDir);

      const testCharacter = {
        id: 'DUPT001',
        name: '重复角色',
        aliases: ['别名'],
        role: 'protagonist' as const,
        description: '测试',
        personality: '测试',
        background: '测试',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      characterRepository.add(testCharacter);

      const duplicateCharacter = {
        id: 'DUPT001',
        name: '重复角色2',
        aliases: ['别名2'],
        role: 'antagonist' as const,
        description: '测试2',
        personality: '测试2',
        background: '测试2',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      characterRepository.add(duplicateCharacter);

      const loaded = characterRepository.findById('DUPT001');

      characterRepository.delete('DUPT001');

      if (!loaded) {
        return {
          testName,
          passed: false,
          message: '重复数据处理失败'
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '重复数据处理正常' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testMissingFileHandling(): Promise<TestResult> {
    const testName = '缺失文件处理';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      const missingDataDir = path.join(this.testDataDir, 'missing');
      characterRepository.init(missingDataDir);

      const allCharacters = characterRepository.loadAll();

      if (allCharacters.length !== 0) {
        return {
          testName,
          passed: false,
          message: '缺失文件处理失败'
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '缺失文件处理正常' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testConcurrentAccessHandling(): Promise<TestResult> {
    const testName = '并发访问处理';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      characterRepository.init(this.testDataDir);

      const promises = [];
      for (let i = 0; i < 10; i++) {
        const testCharacter = {
          id: `CONC${i}`,
          name: `并发角色${i}`,
          aliases: [`别名${i}`],
          role: 'protagonist' as const,
          description: '测试',
          personality: '测试',
          background: '测试',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        promises.push(characterRepository.add(testCharacter));
      }

      await Promise.all(promises);

      const allCharacters = characterRepository.loadAll();

      for (let i = 0; i < 10; i++) {
        characterRepository.delete(`CONC${i}`);
      }

      if (allCharacters.length < 10) {
        return {
          testName,
          passed: false,
          message: '并发访问处理失败'
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '并发访问处理正常' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testLargeDataHandling(): Promise<TestResult> {
    const testName = '大数据处理';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      characterRepository.init(this.testDataDir);

      const largeDescription = 'x'.repeat(10000);

      const testCharacter = {
        id: 'LARGET001',
        name: '大数据角色',
        aliases: ['别名'],
        role: 'protagonist' as const,
        description: largeDescription,
        personality: largeDescription,
        background: largeDescription,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const addResult = characterRepository.add(testCharacter);
      if (!addResult) {
        return {
          testName,
          passed: false,
          message: '大数据添加失败'
        };
      }

      const loaded = characterRepository.findById('LARGET001');
      characterRepository.delete('LARGET001');

      if (!loaded || loaded.description.length !== largeDescription.length) {
        return {
          testName,
          passed: false,
          message: '大数据加载失败'
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '大数据处理正常' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testSpecialCharacterHandling(): Promise<TestResult> {
    const testName = '特殊字符处理';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      characterRepository.init(this.testDataDir);

      const specialCharacters = '特殊字符: < > & " \' \n \t \\ / : * ? |';

      const testCharacter = {
        id: 'SPECT001',
        name: specialCharacters,
        aliases: [specialCharacters],
        role: 'protagonist' as const,
        description: specialCharacters,
        personality: specialCharacters,
        background: specialCharacters,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const addResult = characterRepository.add(testCharacter);
      if (!addResult) {
        return {
          testName,
          passed: false,
          message: '特殊字符添加失败'
        };
      }

      const loaded = characterRepository.findById('SPECT001');
      characterRepository.delete('SPECT001');

      if (!loaded || loaded.name !== specialCharacters) {
        return {
          testName,
          passed: false,
          message: '特殊字符加载失败'
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '特殊字符处理正常' };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return { testName, passed: false, message: `错误: ${error}` };
    }
  }

  private async testBoundaryValueHandling(): Promise<TestResult> {
    const testName = '边界值处理';
    testLogger.log(`🔍 测试: ${testName}`);

    try {
      foreshadowRepository.init(this.testDataDir);

      const testForeshadow1 = {
        id: 'BOUND1',
        description: '边界测试1',
        status: 'pending' as const,
        importance: 'medium' as const,
        plantedChapter: 499990,
        relatedCharacters: [],
        keyword: '测试',
        notes: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const testForeshadow2 = {
        id: 'BOUND2',
        description: '边界测试2',
        status: 'resolved' as const,
        importance: 'high' as const,
        plantedChapter: 999999,
        relatedCharacters: [],
        keyword: '测试',
        notes: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      foreshadowRepository.add(testForeshadow1);
      foreshadowRepository.add(testForeshadow2);

      const filtered = foreshadowFilterService.filterForeshadows(
        foreshadowRepository.loadAll(),
        {
          currentChapter: 500000,
          chapterCharacters: [],
          maxForeshadows: 5,
          minImportance: 'medium'
        }
      );

      foreshadowRepository.delete('BOUND1');
      foreshadowRepository.delete('BOUND2');

      if (filtered.length !== 1 || filtered[0].id !== 'BOUND1') {
        return {
          testName,
          passed: false,
          message: '边界值处理失败'
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return { testName, passed: true, message: '边界值处理正常' };
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
