import * as path from 'path';
import { E2ETestRunner } from './tests/e2eTestRunner';

async function main() {
  const testDataDir = path.join(__dirname, '..', '..', 'test-data', 'e2e');
  const logDir = path.join(__dirname, '..', '..', 'test-logs');

  const runner = new E2ETestRunner(testDataDir, logDir);
  await runner.runAllTests();
}

main();
