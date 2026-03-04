import * as vscode from 'vscode';
import * as path from 'path';
import { DataPersistenceTest } from './dataPersistenceTest';
import { CrossModuleTest } from './crossModuleTest';
import { ErrorHandlingTest } from './errorHandlingTest';
import { ServiceIntegrationTest } from './serviceIntegrationTest';
import { testLogger } from '../utils/testLogger';

export class IntegrationTestRunner {
  async runAllTests(): Promise<TestReport> {
    const startTime = Date.now();
    testLogger.log('🚀 开始集成测试...');

    const testDataDir = path.join(__dirname, '..', '..', 'test-data');
    const report: TestReport = {
      timestamp: new Date().toISOString(),
      duration: 0,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      categories: []
    };

    try {
      const persistenceTest = new DataPersistenceTest(testDataDir);
      const persistenceResults = await persistenceTest.runAllTests();

      const crossModuleTest = new CrossModuleTest(testDataDir);
      const crossModuleResults = await crossModuleTest.runAllTests();

      const errorHandlingTest = new ErrorHandlingTest(testDataDir);
      const errorHandlingResults = await errorHandlingTest.runAllTests();

      const serviceIntegrationTest = new ServiceIntegrationTest(testDataDir);
      const serviceIntegrationResults = await serviceIntegrationTest.runAllTests();

      const persistenceCategory: TestCategory = {
        name: '数据持久化测试',
        tests: persistenceResults,
        passed: persistenceResults.filter(r => r.passed).length,
        failed: persistenceResults.filter(r => !r.passed).length
      };

      const crossModuleCategory: TestCategory = {
        name: '跨模块功能测试',
        tests: crossModuleResults,
        passed: crossModuleResults.filter(r => r.passed).length,
        failed: crossModuleResults.filter(r => !r.passed).length
      };

      const errorHandlingCategory: TestCategory = {
        name: '错误处理和边界情况测试',
        tests: errorHandlingResults,
        passed: errorHandlingResults.filter(r => r.passed).length,
        failed: errorHandlingResults.filter(r => !r.passed).length
      };

      const serviceIntegrationCategory: TestCategory = {
        name: '服务集成测试',
        tests: serviceIntegrationResults,
        passed: serviceIntegrationResults.filter(r => r.passed).length,
        failed: serviceIntegrationResults.filter(r => !r.passed).length
      };

      report.categories.push(persistenceCategory);
      report.categories.push(crossModuleCategory);
      report.categories.push(errorHandlingCategory);
      report.categories.push(serviceIntegrationCategory);

      report.totalTests = persistenceResults.length + crossModuleResults.length + errorHandlingResults.length + serviceIntegrationResults.length;
      report.passedTests = report.categories.reduce((sum, cat) => sum + cat.passed, 0);
      report.failedTests = report.categories.reduce((sum, cat) => sum + cat.failed, 0);
      report.duration = Date.now() - startTime;

      testLogger.log('📊 测试完成，生成报告...');
      this.displayReport(report);

      return report;
    } catch (error) {
      testLogger.log(`❌ 测试执行失败: ${error}`);
      throw error;
    }
  }

  private displayReport(report: TestReport) {
    testLogger.log('\n' + '='.repeat(60));
    testLogger.log('📋 集成测试报告');
    testLogger.log('='.repeat(60));
    testLogger.log(`📅 测试时间: ${report.timestamp}`);
    testLogger.log(`⏱️  测试耗时: ${report.duration}ms`);
    testLogger.log(`📊 总测试数: ${report.totalTests}`);
    testLogger.log(`✅ 通过: ${report.passedTests}`);
    testLogger.log(`❌ 失败: ${report.failedTests}`);
    testLogger.log(`📈 成功率: ${((report.passedTests / report.totalTests) * 100).toFixed(2)}%`);
    testLogger.log('='.repeat(60));

    for (const category of report.categories) {
      testLogger.log(`\n📁 ${category.name}`);
      testLogger.log('-'.repeat(60));
      testLogger.log(`✅ 通过: ${category.passed} | ❌ 失败: ${category.failed}`);

      for (const test of category.tests) {
        const icon = test.passed ? '✅' : '❌';
        testLogger.log(`  ${icon} ${test.testName}`);
        if (!test.passed) {
          testLogger.log(`     💬 ${test.message}`);
        }
      }
    }

    testLogger.log('\n' + '='.repeat(60));
  }

  generateMarkdownReport(report: TestReport): string {
    let markdown = `# 集成测试报告\n\n`;
    markdown += `**测试时间**: ${report.timestamp}\n`;
    markdown += `**测试耗时**: ${report.duration}ms\n\n`;
    markdown += `## 测试概览\n\n`;
    markdown += `| 指标 | 数值 |\n`;
    markdown += `|------|------|\n`;
    markdown += `| 总测试数 | ${report.totalTests} |\n`;
    markdown += `| 通过 | ${report.passedTests} |\n`;
    markdown += `| 失败 | ${report.failedTests} |\n`;
    markdown += `| 成功率 | ${((report.passedTests / report.totalTests) * 100).toFixed(2)}% |\n\n`;

    for (const category of report.categories) {
      markdown += `## ${category.name}\n\n`;
      markdown += `| 测试名称 | 状态 | 消息 |\n`;
      markdown += `|----------|------|------|\n`;

      for (const test of category.tests) {
        const status = test.passed ? '✅ 通过' : '❌ 失败';
        markdown += `| ${test.testName} | ${status} | ${test.message} |\n`;
      }

      markdown += `\n`;
    }

    return markdown;
  }
}

export interface TestReport {
  timestamp: string;
  duration: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  categories: TestCategory[];
}

export interface TestCategory {
  name: string;
  tests: TestResult[];
  passed: number;
  failed: number;
}

export interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
}
