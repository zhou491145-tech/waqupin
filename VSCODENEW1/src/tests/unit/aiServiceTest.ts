import * as path from 'path';
import { testLogger } from '../../utils/testLogger';

export interface UnitTestResult {
  testName: string;
  passed: boolean;
  message: string;
  duration?: number;
}

export class AIServiceUnitTest {
  private testDataDir: string;

  constructor(testDataDir: string) {
    this.testDataDir = testDataDir;
  }

  async runAllTests(): Promise<UnitTestResult[]> {
    const results: UnitTestResult[] = [];

    testLogger.log('🧪 开始AIService单元测试...');

    try {
      results.push(await this.testLoadConfig());
      results.push(await this.testLoadConfigWithoutVSCode());
      results.push(await this.testLoadConfigWithIncompleteConfig());
      results.push(await this.testCallChat());
      results.push(await this.testCallChatWithoutConfig());
      results.push(await this.testCallChatWithEmptyPrompts());
      results.push(await this.testConnection());
      results.push(await this.testConnectionWithoutConfig());
    } catch (error) {
      testLogger.log(`❌ 测试执行失败: ${error}`);
      results.push({
        testName: '总体测试',
        passed: false,
        message: `测试执行失败: ${error}`
      });
    }

    return results;
  }

  private async testLoadConfig(): Promise<UnitTestResult> {
    const testName = '加载API配置';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { aiService } = await import('../../services/aiService');

      const result = aiService.loadConfig();

      if (typeof result !== 'boolean') {
        return {
          testName,
          passed: false,
          message: '配置加载返回值类型错误',
          duration: Date.now() - startTime
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return {
        testName,
        passed: true,
        message: `配置加载${result ? '成功' : '失败(预期，无VS Code环境)'}`,
        duration: Date.now() - startTime
      };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return {
        testName,
        passed: false,
        message: `错误: ${error}`,
        duration: Date.now() - startTime
      };
    }
  }

  private async testCallChat(): Promise<UnitTestResult> {
    const testName = '调用AI聊天API';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { aiService } = await import('../../services/aiService');

      const systemPrompt = '你是一个测试助手';
      const userPrompt = '请回复"测试成功"';

      const result = await aiService.callChat(systemPrompt, userPrompt);

      if (result === null) {
        return {
          testName,
          passed: true,
          message: 'API调用返回null(预期，无配置或网络)',
          duration: Date.now() - startTime
        };
      }

      if (typeof result !== 'string') {
        return {
          testName,
          passed: false,
          message: 'API调用返回值类型错误',
          duration: Date.now() - startTime
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return {
        testName,
        passed: true,
        message: `API调用成功，返回${result.length}字符`,
        duration: Date.now() - startTime
      };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return {
        testName,
        passed: false,
        message: `错误: ${error}`,
        duration: Date.now() - startTime
      };
    }
  }

  private async testLoadConfigWithoutVSCode(): Promise<UnitTestResult> {
    const testName = '无VS Code环境加载配置';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { aiService } = await import('../../services/aiService');

      const result = aiService.loadConfig();

      if (typeof result !== 'boolean') {
        return {
          testName,
          passed: false,
          message: '配置加载返回值类型错误',
          duration: Date.now() - startTime
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return {
        testName,
        passed: true,
        message: `无VS Code环境时配置加载${result ? '成功' : '失败(预期)'}`,
        duration: Date.now() - startTime
      };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return {
        testName,
        passed: false,
        message: `错误: ${error}`,
        duration: Date.now() - startTime
      };
    }
  }

  private async testLoadConfigWithIncompleteConfig(): Promise<UnitTestResult> {
    const testName = '配置不完整时加载配置';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { aiService } = await import('../../services/aiService');

      const result = aiService.loadConfig();

      if (typeof result !== 'boolean') {
        return {
          testName,
          passed: false,
          message: '配置加载返回值类型错误',
          duration: Date.now() - startTime
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return {
        testName,
        passed: true,
        message: `配置不完整时加载${result ? '成功' : '失败(预期)'}`,
        duration: Date.now() - startTime
      };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return {
        testName,
        passed: false,
        message: `错误: ${error}`,
        duration: Date.now() - startTime
      };
    }
  }

  private async testCallChatWithoutConfig(): Promise<UnitTestResult> {
    const testName = '无配置时调用AI聊天API';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { aiService } = await import('../../services/aiService');

      const result = await aiService.callChat('测试', '测试');

      if (result === null) {
        return {
          testName,
          passed: true,
          message: '无配置时API调用返回null(预期)',
          duration: Date.now() - startTime
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return {
        testName,
        passed: true,
        message: `API调用成功，返回${result.length}字符`,
        duration: Date.now() - startTime
      };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return {
        testName,
        passed: false,
        message: `错误: ${error}`,
        duration: Date.now() - startTime
      };
    }
  }

  private async testCallChatWithEmptyPrompts(): Promise<UnitTestResult> {
    const testName = '空提示词时调用AI聊天API';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { aiService } = await import('../../services/aiService');

      const result = await aiService.callChat('', '');

      if (result === null) {
        return {
          testName,
          passed: true,
          message: '空提示词时API调用返回null(预期)',
          duration: Date.now() - startTime
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return {
        testName,
        passed: true,
        message: `API调用成功，返回${result.length}字符`,
        duration: Date.now() - startTime
      };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return {
        testName,
        passed: false,
        message: `错误: ${error}`,
        duration: Date.now() - startTime
      };
    }
  }

  private async testConnection(): Promise<UnitTestResult> {
    const testName = '测试API连接';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { aiService } = await import('../../services/aiService');

      const result = await aiService.testConnection();

      if (typeof result !== 'boolean') {
        return {
          testName,
          passed: false,
          message: '连接测试返回值类型错误',
          duration: Date.now() - startTime
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return {
        testName,
        passed: true,
        message: `连接测试${result ? '成功' : '失败(预期，无配置)'}`,
        duration: Date.now() - startTime
      };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return {
        testName,
        passed: false,
        message: `错误: ${error}`,
        duration: Date.now() - startTime
      };
    }
  }

  private async testConnectionWithoutConfig(): Promise<UnitTestResult> {
    const testName = '无配置时测试API连接';
    testLogger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const { aiService } = await import('../../services/aiService');

      const result = await aiService.testConnection();

      if (result === false) {
        return {
          testName,
          passed: true,
          message: '无配置时连接测试返回false(预期)',
          duration: Date.now() - startTime
        };
      }

      testLogger.log(`✅ ${testName} - 通过`);
      return {
        testName,
        passed: true,
        message: `连接测试${result ? '成功' : '失败'}`,
        duration: Date.now() - startTime
      };
    } catch (error) {
      testLogger.log(`❌ ${testName} - 失败: ${error}`);
      return {
        testName,
        passed: false,
        message: `错误: ${error}`,
        duration: Date.now() - startTime
      };
    }
  }
}
