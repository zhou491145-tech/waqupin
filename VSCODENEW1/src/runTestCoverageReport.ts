import { TestCoverageReporter } from './tests/testCoverageReporter';
import * as path from 'path';

async function main() {
  const logDir = path.join(__dirname, '..', '..', 'test-logs');
  const reporter = new TestCoverageReporter(logDir);
  await reporter.generateCoverageReport();
}

main().catch(error => {
  console.error('生成测试覆盖率报告失败:', error);
  process.exit(1);
});
