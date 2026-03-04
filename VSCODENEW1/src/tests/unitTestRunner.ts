import * as path from 'path';
import { testLogger } from '../utils/testLogger';
import { ContextServiceUnitTest } from './unit/contextServiceTest';
import { ForeshadowFilterServiceUnitTest } from './unit/foreshadowFilterServiceTest';
import { ChapterGenerationServiceUnitTest } from './unit/chapterGenerationServiceTest';
import { AIServiceUnitTest } from './unit/aiServiceTest';
import { AnalysisServiceUnitTest } from './unit/analysisServiceTest';
import { CharacterRepositoryUnitTest } from './unit/characterRepositoryTest';
import { ForeshadowRepositoryUnitTest } from './unit/foreshadowRepositoryTest';
import { SummaryRepositoryUnitTest } from './unit/summaryRepositoryTest';
import { OutlineRepositoryUnitTest } from './unit/outlineRepositoryTest';
import { WorldSettingRepositoryUnitTest } from './unit/worldSettingRepositoryTest';
import { ProjectConfigRepositoryUnitTest } from './unit/projectConfigRepositoryTest';
import { WritingStyleRepositoryUnitTest } from './unit/writingStyleRepositoryTest';

export interface UnitTestResult {
  testName: string;
  passed: boolean;
  message: string;
  duration?: number;
}

export interface UnitTestSuiteResult {
  suiteName: string;
  tests: UnitTestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
}

class UnitTestRunner {
  private testDataDir: string;

  constructor() {
    this.testDataDir = path.join(__dirname, '..', '..', '..', 'test-data', 'unit');
  }

  async runAllTests(): Promise<UnitTestSuiteResult[]> {
    const results: UnitTestSuiteResult[] = [];

    testLogger.log('============================================================');
    testLogger.log('🧪 开始单元测试...');
    testLogger.log('============================================================');

    const startTime = Date.now();

    try {
      results.push(await this.runContextServiceTests());
      results.push(await this.runForeshadowFilterServiceTests());
      results.push(await this.runChapterGenerationServiceTests());
      results.push(await this.runAIServiceTests());
      results.push(await this.runAnalysisServiceTests());
      results.push(await this.runCharacterRepositoryTests());
      results.push(await this.runForeshadowRepositoryTests());
      results.push(await this.runSummaryRepositoryTests());
      results.push(await this.runOutlineRepositoryTests());
      results.push(await this.runWorldSettingRepositoryTests());
      results.push(await this.runProjectConfigRepositoryTests());
      results.push(await this.runWritingStyleRepositoryTests());
    } catch (error) {
      testLogger.log(`❌ 单元测试执行失败: ${error}`);
    }

    const totalDuration = Date.now() - startTime;

    this.printSummary(results, totalDuration);
    await this.generateReport(results, totalDuration);

    return results;
  }

  private async runContextServiceTests(): Promise<UnitTestSuiteResult> {
    testLogger.log('\n📁 ContextService测试');
    testLogger.log('------------------------------------------------------------');

    const startTime = Date.now();
    const testSuite = new ContextServiceUnitTest(this.testDataDir);
    const tests = await testSuite.runAllTests();
    const duration = Date.now() - startTime;

    const result: UnitTestSuiteResult = {
      suiteName: 'ContextService',
      tests,
      totalTests: tests.length,
      passedTests: tests.filter((t) => t.passed).length,
      failedTests: tests.filter((t) => !t.passed).length,
      duration
    };

    testLogger.log(`------------------------------------------------------------`);
    testLogger.log(`✅ 通过: ${result.passedTests} | ❌ 失败: ${result.failedTests}`);
    testLogger.log(`⏱️  耗时: ${duration}ms`);

    return result;
  }

  private async runForeshadowFilterServiceTests(): Promise<UnitTestSuiteResult> {
    testLogger.log('\n📁 ForeshadowFilterService测试');
    testLogger.log('------------------------------------------------------------');

    const startTime = Date.now();
    const testSuite = new ForeshadowFilterServiceUnitTest(this.testDataDir);
    const tests = await testSuite.runAllTests();
    const duration = Date.now() - startTime;

    const result: UnitTestSuiteResult = {
      suiteName: 'ForeshadowFilterService',
      tests,
      totalTests: tests.length,
      passedTests: tests.filter((t) => t.passed).length,
      failedTests: tests.filter((t) => !t.passed).length,
      duration
    };

    testLogger.log(`------------------------------------------------------------`);
    testLogger.log(`✅ 通过: ${result.passedTests} | ❌ 失败: ${result.failedTests}`);
    testLogger.log(`⏱️  耗时: ${duration}ms`);

    return result;
  }

  private async runChapterGenerationServiceTests(): Promise<UnitTestSuiteResult> {
    testLogger.log('\n📁 ChapterGenerationService测试');
    testLogger.log('------------------------------------------------------------');

    const startTime = Date.now();
    const testSuite = new ChapterGenerationServiceUnitTest(this.testDataDir);
    const tests = await testSuite.runAllTests();
    const duration = Date.now() - startTime;

    const result: UnitTestSuiteResult = {
      suiteName: 'ChapterGenerationService',
      tests,
      totalTests: tests.length,
      passedTests: tests.filter((t) => t.passed).length,
      failedTests: tests.filter((t) => !t.passed).length,
      duration
    };

    testLogger.log(`------------------------------------------------------------`);
    testLogger.log(`✅ 通过: ${result.passedTests} | ❌ 失败: ${result.failedTests}`);
    testLogger.log(`⏱️  耗时: ${duration}ms`);

    return result;
  }

  private async runAIServiceTests(): Promise<UnitTestSuiteResult> {
    testLogger.log('\n📁 AIService测试');
    testLogger.log('------------------------------------------------------------');

    const startTime = Date.now();
    const testSuite = new AIServiceUnitTest(this.testDataDir);
    const tests = await testSuite.runAllTests();
    const duration = Date.now() - startTime;

    const result: UnitTestSuiteResult = {
      suiteName: 'AIService',
      tests,
      totalTests: tests.length,
      passedTests: tests.filter((t) => t.passed).length,
      failedTests: tests.filter((t) => !t.passed).length,
      duration
    };

    testLogger.log(`------------------------------------------------------------`);
    testLogger.log(`✅ 通过: ${result.passedTests} | ❌ 失败: ${result.failedTests}`);
    testLogger.log(`⏱️  耗时: ${duration}ms`);

    return result;
  }

  private async runAnalysisServiceTests(): Promise<UnitTestSuiteResult> {
    testLogger.log('\n📁 AnalysisService测试');
    testLogger.log('------------------------------------------------------------');

    const startTime = Date.now();
    const testSuite = new AnalysisServiceUnitTest(this.testDataDir);
    const tests = await testSuite.runAllTests();
    const duration = Date.now() - startTime;

    const result: UnitTestSuiteResult = {
      suiteName: 'AnalysisService',
      tests,
      totalTests: tests.length,
      passedTests: tests.filter((t) => t.passed).length,
      failedTests: tests.filter((t) => !t.passed).length,
      duration
    };

    testLogger.log(`------------------------------------------------------------`);
    testLogger.log(`✅ 通过: ${result.passedTests} | ❌ 失败: ${result.failedTests}`);
    testLogger.log(`⏱️  耗时: ${duration}ms`);

    return result;
  }

  private async runCharacterRepositoryTests(): Promise<UnitTestSuiteResult> {
    testLogger.log('\n📁 CharacterRepository测试');
    testLogger.log('------------------------------------------------------------');

    const startTime = Date.now();
    const testSuite = new CharacterRepositoryUnitTest(this.testDataDir);
    const tests = await testSuite.runAllTests();
    const duration = Date.now() - startTime;

    const result: UnitTestSuiteResult = {
      suiteName: 'CharacterRepository',
      tests,
      totalTests: tests.length,
      passedTests: tests.filter((t) => t.passed).length,
      failedTests: tests.filter((t) => !t.passed).length,
      duration
    };

    testLogger.log(`------------------------------------------------------------`);
    testLogger.log(`✅ 通过: ${result.passedTests} | ❌ 失败: ${result.failedTests}`);
    testLogger.log(`⏱️  耗时: ${duration}ms`);

    return result;
  }

  private async runForeshadowRepositoryTests(): Promise<UnitTestSuiteResult> {
    testLogger.log('\n📁 ForeshadowRepository测试');
    testLogger.log('------------------------------------------------------------');

    const startTime = Date.now();
    const testSuite = new ForeshadowRepositoryUnitTest(this.testDataDir);
    const tests = await testSuite.runAllTests();
    const duration = Date.now() - startTime;

    const result: UnitTestSuiteResult = {
      suiteName: 'ForeshadowRepository',
      tests,
      totalTests: tests.length,
      passedTests: tests.filter((t) => t.passed).length,
      failedTests: tests.filter((t) => !t.passed).length,
      duration
    };

    testLogger.log(`------------------------------------------------------------`);
    testLogger.log(`✅ 通过: ${result.passedTests} | ❌ 失败: ${result.failedTests}`);
    testLogger.log(`⏱️  耗时: ${duration}ms`);

    return result;
  }

  private async runSummaryRepositoryTests(): Promise<UnitTestSuiteResult> {
    testLogger.log('\n📁 SummaryRepository测试');
    testLogger.log('------------------------------------------------------------');

    const startTime = Date.now();
    const testSuite = new SummaryRepositoryUnitTest(this.testDataDir);
    const tests = await testSuite.runAllTests();
    const duration = Date.now() - startTime;

    const result: UnitTestSuiteResult = {
      suiteName: 'SummaryRepository',
      tests,
      totalTests: tests.length,
      passedTests: tests.filter((t) => t.passed).length,
      failedTests: tests.filter((t) => !t.passed).length,
      duration
    };

    testLogger.log(`------------------------------------------------------------`);
    testLogger.log(`✅ 通过: ${result.passedTests} | ❌ 失败: ${result.failedTests}`);
    testLogger.log(`⏱️  耗时: ${duration}ms`);

    return result;
  }

  private async runOutlineRepositoryTests(): Promise<UnitTestSuiteResult> {
    testLogger.log('\n📁 OutlineRepository测试');
    testLogger.log('------------------------------------------------------------');

    const startTime = Date.now();
    const testSuite = new OutlineRepositoryUnitTest(this.testDataDir);
    const tests = await testSuite.runAllTests();
    const duration = Date.now() - startTime;

    const result: UnitTestSuiteResult = {
      suiteName: 'OutlineRepository',
      tests,
      totalTests: tests.length,
      passedTests: tests.filter((t) => t.passed).length,
      failedTests: tests.filter((t) => !t.passed).length,
      duration
    };

    testLogger.log(`------------------------------------------------------------`);
    testLogger.log(`✅ 通过: ${result.passedTests} | ❌ 失败: ${result.failedTests}`);
    testLogger.log(`⏱️  耗时: ${duration}ms`);

    return result;
  }

  private async runWorldSettingRepositoryTests(): Promise<UnitTestSuiteResult> {
    testLogger.log('\n📁 WorldSettingRepository测试');
    testLogger.log('------------------------------------------------------------');

    const startTime = Date.now();
    const testSuite = new WorldSettingRepositoryUnitTest(this.testDataDir);
    const tests = await testSuite.runAllTests();
    const duration = Date.now() - startTime;

    const result: UnitTestSuiteResult = {
      suiteName: 'WorldSettingRepository',
      tests,
      totalTests: tests.length,
      passedTests: tests.filter((t) => t.passed).length,
      failedTests: tests.filter((t) => !t.passed).length,
      duration
    };

    testLogger.log(`------------------------------------------------------------`);
    testLogger.log(`✅ 通过: ${result.passedTests} | ❌ 失败: ${result.failedTests}`);
    testLogger.log(`⏱️  耗时: ${duration}ms`);

    return result;
  }

  private async runProjectConfigRepositoryTests(): Promise<UnitTestSuiteResult> {
    testLogger.log('\n📁 ProjectConfigRepository测试');
    testLogger.log('------------------------------------------------------------');

    const startTime = Date.now();
    const testSuite = new ProjectConfigRepositoryUnitTest(this.testDataDir);
    const tests = await testSuite.runAllTests();
    const duration = Date.now() - startTime;

    const result: UnitTestSuiteResult = {
      suiteName: 'ProjectConfigRepository',
      tests,
      totalTests: tests.length,
      passedTests: tests.filter((t) => t.passed).length,
      failedTests: tests.filter((t) => !t.passed).length,
      duration
    };

    testLogger.log(`------------------------------------------------------------`);
    testLogger.log(`✅ 通过: ${result.passedTests} | ❌ 失败: ${result.failedTests}`);
    testLogger.log(`⏱️  耗时: ${duration}ms`);

    return result;
  }

  private async runWritingStyleRepositoryTests(): Promise<UnitTestSuiteResult> {
    testLogger.log('\n📁 WritingStyleRepository测试');
    testLogger.log('------------------------------------------------------------');

    const startTime = Date.now();
    const testSuite = new WritingStyleRepositoryUnitTest(this.testDataDir);
    const tests = await testSuite.runAllTests();
    const duration = Date.now() - startTime;

    const result: UnitTestSuiteResult = {
      suiteName: 'WritingStyleRepository',
      tests,
      totalTests: tests.length,
      passedTests: tests.filter((t) => t.passed).length,
      failedTests: tests.filter((t) => !t.passed).length,
      duration
    };

    testLogger.log(`------------------------------------------------------------`);
    testLogger.log(`✅ 通过: ${result.passedTests} | ❌ 失败: ${result.failedTests}`);
    testLogger.log(`⏱️  耗时: ${duration}ms`);

    return result;
  }

  private printSummary(results: UnitTestSuiteResult[], totalDuration: number) {
    const totalTests = results.reduce((sum, r) => sum + r.totalTests, 0);
    const passedTests = results.reduce((sum, r) => sum + r.passedTests, 0);
    const failedTests = results.reduce((sum, r) => sum + r.failedTests, 0);
    const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(2) : '0.00';

    testLogger.log('\n============================================================');
    testLogger.log('📊 单元测试总结');
    testLogger.log('============================================================');
    testLogger.log(`📅 测试时间: ${new Date().toISOString()}`);
    testLogger.log(`⏱️  总耗时: ${totalDuration}ms`);
    testLogger.log(`📊 总测试数: ${totalTests}`);
    testLogger.log(`✅ 通过: ${passedTests}`);
    testLogger.log(`❌ 失败: ${failedTests}`);
    testLogger.log(`📈 成功率: ${successRate}%`);
    testLogger.log('============================================================');

    if (failedTests === 0) {
      testLogger.log('\n✅ 单元测试全部通过！');
    } else {
      testLogger.log(`\n⚠️ 单元测试完成：${passedTests}/${totalTests} 通过，${failedTests} 失败`);
    }
  }

  private async generateReport(results: UnitTestSuiteResult[], totalDuration: number) {
    const totalTests = results.reduce((sum, r) => sum + r.totalTests, 0);
    const passedTests = results.reduce((sum, r) => sum + r.passedTests, 0);
    const failedTests = results.reduce((sum, r) => sum + r.failedTests, 0);
    const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(2) : '0.00';

    let report = `============================================================\n`;
    report += `📋 单元测试报告\n`;
    report += `============================================================\n`;
    report += `📅 测试时间: ${new Date().toISOString()}\n`;
    report += `⏱️  总耗时: ${totalDuration}ms\n`;
    report += `📊 总测试数: ${totalTests}\n`;
    report += `✅ 通过: ${passedTests}\n`;
    report += `❌ 失败: ${failedTests}\n`;
    report += `📈 成功率: ${successRate}%\n`;
    report += `============================================================\n\n`;

    for (const suite of results) {
      report += `📁 ${suite.suiteName}测试\n`;
      report += `------------------------------------------------------------\n`;
      report += `✅ 通过: ${suite.passedTests} | ❌ 失败: ${suite.failedTests}\n`;
      report += `⏱️  耗时: ${suite.duration}ms\n`;

      for (const test of suite.tests) {
        const status = test.passed ? '✅' : '❌';
        report += `  ${status} ${test.testName}\n`;
        if (!test.passed) {
          report += `     💬 ${test.message}\n`;
        }
      }

      report += '\n';
    }

    report += `============================================================\n`;

    const reportPath = path.join(__dirname, '..', '..', '..', 'test-logs', 'unit-test-report.md');
    const fs = await import('fs');
    
    if (!fs.existsSync(path.dirname(reportPath))) {
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    }
    
    fs.writeFileSync(reportPath, report, 'utf-8');

    testLogger.log(`\n📄 单元测试报告已生成: ${reportPath}`);
    testLogger.log('============================================================\n');
  }
}

export const unitTestRunner = new UnitTestRunner();
