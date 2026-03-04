import * as vscode from 'vscode';
import * as path from 'path';
import { UITestRunner } from '../tests/uiTestRunner';

export async function runUITests(context: vscode.ExtensionContext) {
  const testDataDir = path.join(context.extensionPath, 'test-data', 'ui');
  const logDir = path.join(context.extensionPath, 'test-logs');

  const runner = new UITestRunner(testDataDir, logDir);
  const results = await runner.runAllTests();

  const totalTests = results.reduce((sum, suite) => sum + suite.results.length, 0);
  const passedTests = results.reduce((sum, suite) => sum + suite.passedCount, 0);
  const failedTests = totalTests - passedTests;

  if (failedTests === 0) {
    vscode.window.showInformationMessage(`✅ UI测试全部通过！共 ${totalTests} 个测试`);
  } else {
    vscode.window.showWarningMessage(`⚠️ UI测试完成：${passedTests}/${totalTests} 通过，${failedTests} 失败`);
  }

  const reportPath = path.join(logDir, 'ui-test-report.md');
  const doc = await vscode.workspace.openTextDocument(reportPath);
  await vscode.window.showTextDocument(doc);
}
