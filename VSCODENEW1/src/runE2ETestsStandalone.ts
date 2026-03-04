import * as path from 'path';
import { E2ETestRunnerStandalone } from './tests/e2eTestRunnerStandalone';

async function main() {
  const testDataDir = path.join(__dirname, '..', '..', 'test-data', 'e2e');
  const logDir = path.join(__dirname, '..', '..', 'test-logs');

  const runner = new E2ETestRunnerStandalone(testDataDir, logDir);
  await runner.runAllTests();
}

main();
