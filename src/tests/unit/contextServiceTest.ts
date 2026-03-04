import * as path from 'path';
import { testLogger } from '../../utils/testLogger';

export interface UnitTestResult {
  testName: string;
  passed: boolean;
  message: string;
  duration?: number;
}

export class ContextServiceUnitTest {
  private testDataDir: string;

  constructor(testDataDir: string) {
    this.testDataDir = testDataDir;
  }

  async runAllTests(): Promise<UnitTestResult[]> {
    const results: UnitTestResult[] = [];

    testLogger.log('🧪 开始ContextService单元测试...');

    try {
      results.push(await this.testBuildGenerationContext());
      results.push(await this.testTruncate());
      results.push(await this.testEstimateTokens());
      results.push(await this.testLoadPreviousChaptersContent());
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

  private async testBuildGenerationContext(): Promise<UnitTestResult> {
    const testName = '构建生成上下文';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { contextService } = await import('../../services/contextService');

      const context = await contextService.buildGenerationContext(1);

      if (typeof context !== 'string') {
        return {
          testName,
          passed: false,
          message: '上下文生成失败',
          duration: Date.now() - startTime
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return {
        testName,
        passed: true,
        message: '上下文生成正常',
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

  private async testTruncate(): Promise<UnitTestResult> {
    const testName = '文本截断功能';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { contextService } = await import('../../services/contextService');

      const longText = '这是一个很长的文本。'.repeat(100);
      const truncated = (contextService as any).truncate(longText, 50);

      if (truncated.length > 60) {
        return {
          testName,
          passed: false,
          message: '文本截断失败',
          duration: Date.now() - startTime
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return {
        testName,
        passed: true,
        message: '文本截断正常',
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

  private async testEstimateTokens(): Promise<UnitTestResult> {
    const testName = 'Token估算功能';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { contextService } = await import('../../services/contextService');

      const text = '这是一个测试文本。';
      const tokens = (contextService as any).estimateTokens(text);

      if (typeof tokens !== 'number' || tokens <= 0) {
        return {
          testName,
          passed: false,
          message: 'Token估算失败',
          duration: Date.now() - startTime
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return {
        testName,
        passed: true,
        message: 'Token估算正常',
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

  private async testLoadPreviousChaptersContent(): Promise<UnitTestResult> {
    const testName = '加载前几章内容';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { contextService } = await import('../../services/contextService');

      const content = await contextService.loadPreviousChaptersContent(5, 3);

      if (typeof content !== 'string') {
        return {
          testName,
          passed: false,
          message: '前几章内容加载失败',
          duration: Date.now() - startTime
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return {
        testName,
        passed: true,
        message: '前几章内容加载正常',
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
}
