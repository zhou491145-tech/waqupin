import { PerformanceTestRunner } from './tests/performanceTestRunner';
import * as path from 'path';

async function main() {
  const testDataDir = path.join(__dirname, '..', '..', 'test-data', 'performance');
  const logDir = path.join(__dirname, '..', '..', 'test-logs');

  const runner = new PerformanceTestRunner(testDataDir, logDir);
  await runner.runAllTests();
}

main().catch(error => {
  console.error('性能测试执行失败:', error);
  process.exit(1);
});
