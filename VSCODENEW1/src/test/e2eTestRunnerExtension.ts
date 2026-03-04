import * as vscode from 'vscode';
import * as path from 'path';
import { E2ETestRunner } from '../tests/e2eTestRunner';

export async function runE2ETests(context: vscode.ExtensionContext) {
  const testDataDir = path.join(context.extensionPath, 'test-data', 'e2e');
  const logDir = path.join(context.extensionPath, 'test-logs');

  const runner = new E2ETestRunner(testDataDir, logDir);
  const results = await runner.runAllTests();

  const totalTests = results.reduce((sum, suite) => sum + suite.results.length, 0);
  const passedTests = results.reduce((sum, suite) => sum + suite.passedCount, 0);
  const failedTests = totalTests - passedTests;

  if (failedTests === 0) {
    vscode.window.showInformationMessage(`✅ 端到端测试全部通过！共 ${totalTests} 个测试`);
  } else {
    vscode.window.showWarningMessage(`⚠️ 端到端测试完成：${passedTests}/${totalTests} 通过，${failedTests} 失败`);
  }

  const reportPath = path.join(logDir, 'e2e-test-report.md');
  const doc = await vscode.workspace.openTextDocument(reportPath);
  await vscode.window.showTextDocument(doc);
}
