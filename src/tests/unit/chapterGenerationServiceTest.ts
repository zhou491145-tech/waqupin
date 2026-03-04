import * as path from 'path';
import { testLogger } from '../../utils/testLogger';

export interface UnitTestResult {
  testName: string;
  passed: boolean;
  message: string;
  duration?: number;
}

export class ChapterGenerationServiceUnitTest {
  private testDataDir: string;

  constructor(testDataDir: string) {
    this.testDataDir = testDataDir;
  }

  async runAllTests(): Promise<UnitTestResult[]> {
    const results: UnitTestResult[] = [];

    testLogger.log('🧪 开始ChapterGenerationService单元测试...');

    try {
      results.push(await this.testGetNextChapterNumber());
      results.push(await this.testBuildChapterOutline());
      results.push(await this.testBuildForeshadowContext());
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

  private async testGetNextChapterNumber(): Promise<UnitTestResult> {
    const testName = '获取下一章节号';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { chapterGenerationService } = await import('../../services/chapterGenerationService');

      const nextChapter = chapterGenerationService.getNextChapterNumber();

      if (typeof nextChapter !== 'number' || nextChapter < 1) {
        return {
          testName,
          passed: false,
          message: '获取下一章节号失败',
          duration: Date.now() - startTime
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return {
        testName,
        passed: true,
        message: `下一章节号: ${nextChapter}`,
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

  private async testBuildChapterOutline(): Promise<UnitTestResult> {
    const testName = '构建章节大纲';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { chapterGenerationService } = await import('../../services/chapterGenerationService');

      const outline = await (chapterGenerationService as any)._buildChapterOutline(1);

      if (typeof outline !== 'string') {
        return {
          testName,
          passed: false,
          message: '章节大纲构建失败',
          duration: Date.now() - startTime
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return {
        testName,
        passed: true,
        message: '章节大纲构建正常',
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

  private async testBuildForeshadowContext(): Promise<UnitTestResult> {
    const testName = '构建伏笔上下文';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { chapterGenerationService } = await import('../../services/chapterGenerationService');

      const context = (chapterGenerationService as any)._buildForeshadowContext([]);

      if (typeof context !== 'string') {
        return {
          testName,
          passed: false,
          message: '伏笔上下文构建失败',
          duration: Date.now() - startTime
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return {
        testName,
        passed: true,
        message: '伏笔上下文构建正常',
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
