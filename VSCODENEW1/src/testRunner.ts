import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { IntegrationTestRunner } from './tests/integrationTestRunner';
import { logger } from './utils/logger';

export async function runIntegrationTestsAndGenerateReport() {
  logger.init();
  logger.log('🚀 开始运行集成测试并生成报告...');

  const runner = new IntegrationTestRunner();
  
  try {
    const report = await runner.runAllTests();

    const markdownReport = runner.generateMarkdownReport(report);

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (workspaceRoot) {
      const reportPath = path.join(workspaceRoot, 'integration-test-report.md');
      fs.writeFileSync(reportPath, markdownReport, 'utf-8');
      logger.log(`📄 测试报告已生成: ${reportPath}`);

      const document = await vscode.workspace.openTextDocument(reportPath);
      await vscode.window.showTextDocument(document);
    }

    if (report.failedTests === 0) {
      vscode.window.showInformationMessage(`✅ 集成测试全部通过！共 ${report.totalTests} 个测试，耗时 ${report.duration}ms`);
    } else {
      vscode.window.showWarningMessage(`⚠️ 集成测试完成：${report.passedTests}/${report.totalTests} 通过，${report.failedTests} 失败，耗时 ${report.duration}ms`);
    }

    return report;
  } catch (error) {
    logger.log(`❌ 集成测试执行失败: ${error}`);
    vscode.window.showErrorMessage('集成测试执行失败，请查看输出面板');
    throw error;
  }
}
