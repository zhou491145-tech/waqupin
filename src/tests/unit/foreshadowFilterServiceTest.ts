import * as path from 'path';
import { testLogger } from '../../utils/testLogger';

export interface UnitTestResult {
  testName: string;
  passed: boolean;
  message: string;
  duration?: number;
}

export class ForeshadowFilterServiceUnitTest {
  private testDataDir: string;

  constructor(testDataDir: string) {
    this.testDataDir = testDataDir;
  }

  async runAllTests(): Promise<UnitTestResult[]> {
    const results: UnitTestResult[] = [];

    testLogger.log('🧪 开始ForeshadowFilterService单元测试...');

    try {
      results.push(await this.testFilterForeshadows());
      results.push(await this.testCalculateChapterDistanceScore());
      results.push(await this.testCalculateCharacterRelevanceScore());
      results.push(await this.testCalculateImportanceScore());
      results.push(await this.testApplyMinImportanceFilter());
      results.push(await this.testGetForeshadowSummary());
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

  private async testFilterForeshadows(): Promise<UnitTestResult> {
    const testName = '过滤伏笔';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { foreshadowFilterService } = await import('../../services/foreshadowFilterService');

      const foreshadows = [
        {
          id: 'F001',
          description: '测试伏笔1',
          status: 'pending' as const,
          importance: 'high' as const,
          plantedChapter: 1,
          relatedCharacters: ['角色A'],
          keyword: '测试',
          notes: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'F002',
          description: '测试伏笔2',
          status: 'resolved' as const,
          importance: 'medium' as const,
          plantedChapter: 2,
          relatedCharacters: [],
          keyword: '测试',
          notes: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      const filtered = foreshadowFilterService.filterForeshadows(foreshadows, {
        currentChapter: 5,
        chapterCharacters: ['角色A'],
        maxForeshadows: 5,
        minImportance: 'medium'
      });

      if (filtered.length !== 1 || filtered[0].id !== 'F001') {
        return {
          testName,
          passed: false,
          message: '伏笔过滤失败',
          duration: Date.now() - startTime
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return {
        testName,
        passed: true,
        message: '伏笔过滤正常',
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

  private async testCalculateChapterDistanceScore(): Promise<UnitTestResult> {
    const testName = '计算章节距离评分';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { foreshadowFilterService } = await import('../../services/foreshadowFilterService');

      const score1 = (foreshadowFilterService as any).calculateChapterDistanceScore(1, 5);
      const score2 = (foreshadowFilterService as any).calculateChapterDistanceScore(1, 50);

      if (score1 <= 0 || score2 <= 0) {
        return {
          testName,
          passed: false,
          message: '章节距离评分计算失败',
          duration: Date.now() - startTime
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return {
        testName,
        passed: true,
        message: '章节距离评分计算正常',
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

  private async testCalculateCharacterRelevanceScore(): Promise<UnitTestResult> {
    const testName = '计算角色相关性评分';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { foreshadowFilterService } = await import('../../services/foreshadowFilterService');

      const score1 = (foreshadowFilterService as any).calculateCharacterRelevanceScore(
        ['角色A', '角色B'],
        ['角色A', '角色C']
      );

      const score2 = (foreshadowFilterService as any).calculateCharacterRelevanceScore(
        [],
        ['角色A']
      );

      if (score1 <= 0 || score2 <= 0) {
        return {
          testName,
          passed: false,
          message: '角色相关性评分计算失败',
          duration: Date.now() - startTime
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return {
        testName,
        passed: true,
        message: '角色相关性评分计算正常',
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

  private async testCalculateImportanceScore(): Promise<UnitTestResult> {
    const testName = '计算重要性评分';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { foreshadowFilterService } = await import('../../services/foreshadowFilterService');

      const highScore = (foreshadowFilterService as any).calculateImportanceScore('high');
      const mediumScore = (foreshadowFilterService as any).calculateImportanceScore('medium');
      const lowScore = (foreshadowFilterService as any).calculateImportanceScore('low');

      if (highScore <= mediumScore || mediumScore <= lowScore) {
        return {
          testName,
          passed: false,
          message: '重要性评分计算失败',
          duration: Date.now() - startTime
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return {
        testName,
        passed: true,
        message: '重要性评分计算正常',
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

  private async testApplyMinImportanceFilter(): Promise<UnitTestResult> {
    const testName = '应用最小重要性过滤';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { foreshadowFilterService } = await import('../../services/foreshadowFilterService');

      const scored = [
        {
          foreshadow: {
            id: 'F001',
            description: '测试',
            status: 'pending' as const,
            importance: 'high' as const,
            plantedChapter: 1,
            relatedCharacters: [],
            keyword: '测试',
            notes: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          score: 0.9,
          reasons: []
        },
        {
          foreshadow: {
            id: 'F002',
            description: '测试',
            status: 'pending' as const,
            importance: 'low' as const,
            plantedChapter: 1,
            relatedCharacters: [],
            keyword: '测试',
            notes: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          score: 0.5,
          reasons: []
        }
      ];

      const filtered = (foreshadowFilterService as any).applyMinImportanceFilter(scored, 'medium');

      if (filtered.length !== 1 || filtered[0].foreshadow.id !== 'F001') {
        return {
          testName,
          passed: false,
          message: '最小重要性过滤失败',
          duration: Date.now() - startTime
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return {
        testName,
        passed: true,
        message: '最小重要性过滤正常',
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

  private async testGetForeshadowSummary(): Promise<UnitTestResult> {
    const testName = '获取伏笔摘要';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { foreshadowFilterService } = await import('../../services/foreshadowFilterService');

      const foreshadows = [
        {
          id: 'F001',
          description: '测试伏笔1',
          status: 'pending' as const,
          importance: 'high' as const,
          plantedChapter: 1,
          relatedCharacters: [],
          keyword: '测试',
          notes: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'F002',
          description: '测试伏笔2',
          status: 'resolved' as const,
          importance: 'medium' as const,
          plantedChapter: 2,
          relatedCharacters: [],
          keyword: '测试',
          notes: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      const summary = foreshadowFilterService.getForeshadowSummary(foreshadows);

      if (!summary.includes('待回收') || !summary.includes('已回收')) {
        return {
          testName,
          passed: false,
          message: '伏笔摘要生成失败',
          duration: Date.now() - startTime
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return {
        testName,
        passed: true,
        message: '伏笔摘要生成正常',
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
