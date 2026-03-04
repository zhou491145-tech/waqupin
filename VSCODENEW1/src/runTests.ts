import * as path from 'path';
import * as fs from 'fs';
import { IntegrationTestRunner } from './tests/integrationTestRunner';
import { testLogger } from './utils/testLogger';

async function main() {
  testLogger.init();
  testLogger.log('🚀 开始运行集成测试并生成报告...');

  const runner = new IntegrationTestRunner();
  
  try {
    const report = await runner.runAllTests();

    const markdownReport = runner.generateMarkdownReport(report);

    const workspaceRoot = process.cwd();
    const reportPath = path.join(workspaceRoot, 'integration-test-report.md');
    fs.writeFileSync(reportPath, markdownReport, 'utf-8');
    testLogger.log(`📄 测试报告已生成: ${reportPath}`);

    console.log('\n' + '='.repeat(60));
    console.log('📋 集成测试报告');
    console.log('='.repeat(60));
    console.log(`📅 测试时间: ${report.timestamp}`);
    console.log(`⏱️  测试耗时: ${report.duration}ms`);
    console.log(`📊 总测试数: ${report.totalTests}`);
    console.log(`✅ 通过: ${report.passedTests}`);
    console.log(`❌ 失败: ${report.failedTests}`);
    console.log(`📈 成功率: ${((report.passedTests / report.totalTests) * 100).toFixed(2)}%`);
    console.log('='.repeat(60));

    if (report.failedTests === 0) {
      console.log('\n✅ 集成测试全部通过！');
    } else {
      console.log(`\n⚠️ 集成测试完成：${report.passedTests}/${report.totalTests} 通过，${report.failedTests} 失败`);
    }

    console.log(`\n📄 详细报告已保存到: ${reportPath}`);
    console.log('='.repeat(60) + '\n');

    process.exit(report.failedTests === 0 ? 0 : 1);
  } catch (error) {
    testLogger.log(`❌ 集成测试执行失败: ${error}`);
    console.error(`❌ 集成测试执行失败: ${error}`);
    process.exit(1);
  }
}

main();
