import { unitTestRunner } from './tests/unitTestRunner';

async function runUnitTests() {
  try {
    await unitTestRunner.runAllTests();
    process.exit(0);
  } catch (error) {
    console.error('单元测试执行失败:', error);
    process.exit(1);
  }
}

runUnitTests();
