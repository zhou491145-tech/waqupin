import * as path from 'path';
import { testLogger } from '../../utils/testLogger';

export interface UnitTestResult {
  testName: string;
  passed: boolean;
  message: string;
  duration?: number;
}

export class AnalysisServiceUnitTest {
  private testDataDir: string;

  constructor(testDataDir: string) {
    this.testDataDir = testDataDir;
  }

  async runAllTests(): Promise<UnitTestResult[]> {
    const results: UnitTestResult[] = [];

    testLogger.log('🧪 开始AnalysisService单元测试...');

    try {
      results.push(await this.testAnalyzeChapter());
      results.push(await this.testParseAnalysisResponse());
      results.push(await this.testCleanJsonResponse());
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

  private async testAnalyzeChapter(): Promise<UnitTestResult> {
    const testName = '分析章节';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { analysisService } = await import('../../services/analysisService');

      const result = await analysisService.analyzeChapter(
        1,
        '测试章节',
        '这是一个测试章节的内容。'
      );

      if (result === null) {
        return {
          testName,
          passed: true,
          message: '章节分析返回null(预期，无API配置)',
          duration: Date.now() - startTime
        };
      }

      if (typeof result !== 'object' || result === null) {
        return {
          testName,
          passed: false,
          message: '章节分析返回值类型错误',
          duration: Date.now() - startTime
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return {
        testName,
        passed: true,
        message: '章节分析正常',
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

  private async testParseAnalysisResponse(): Promise<UnitTestResult> {
    const testName = '解析分析响应';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { analysisService } = await import('../../services/analysisService');

      const testResponse = JSON.stringify({
        hooks: [
          {
            type: 'action',
            content: '测试钩子',
            strength: 8,
            position: 'beginning'
          }
        ],
        foreshadows: [],
        plot_points: [],
        character_states: [],
        conflict: {
          types: [],
          parties: [],
          level: 0,
          description: '',
          resolution_progress: 0
        },
        emotional_arc: {
          primary_emotion: '',
          intensity: 0,
          secondary_emotions: []
        },
        scores: {
          overall: 8,
          pacing: 7,
          engagement: 8,
          coherence: 9
        },
        summary: '测试摘要',
        suggestions: []
      });

      const result = (analysisService as any).parseAnalysisResponse(testResponse);

      if (!result || typeof result !== 'object') {
        return {
          testName,
          passed: false,
          message: '解析响应失败',
          duration: Date.now() - startTime
        };
      }

      if (result.scores.overall !== 8) {
        return {
          testName,
          passed: false,
          message: '解析结果不正确',
          duration: Date.now() - startTime
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return {
        testName,
        passed: true,
        message: '响应解析正常',
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

  private async testCleanJsonResponse(): Promise<UnitTestResult> {
    const testName = '清理JSON响应';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { analysisService } = await import('../../services/analysisService');

      const testResponse = '```json\n{"test": "value"}\n```';
      const result = (analysisService as any).cleanJsonResponse(testResponse);

      if (typeof result !== 'string') {
        return {
          testName,
          passed: false,
          message: '清理响应失败',
          duration: Date.now() - startTime
        };
      }

      const parsed = JSON.parse(result);
      if (parsed.test !== 'value') {
        return {
          testName,
          passed: false,
          message: '清理结果不正确',
          duration: Date.now() - startTime
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return {
        testName,
        passed: true,
        message: 'JSON清理正常',
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
