import * as path from 'path';
import { TestCoverageReporter } from './tests/testCoverageReporter';

async function main() {
  const logDir = path.join(__dirname, '..', '..', 'test-logs');
  const reporter = new TestCoverageReporter(logDir);
  await reporter.generateCoverageReport();
}

main();
