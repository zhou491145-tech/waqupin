import { UITestRunner } from './tests/uiTestRunner';
import * as path from 'path';

async function main() {
  const testDataDir = path.join(__dirname, '..', '..', 'test-data', 'ui');
  const logDir = path.join(__dirname, '..', '..', 'test-logs');

  const runner = new UITestRunner(testDataDir, logDir);
  await runner.runAllTests();
}

main().catch(error => {
  console.error('UI测试执行失败:', error);
  process.exit(1);
});
