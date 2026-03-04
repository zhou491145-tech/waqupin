import * as fs from 'fs';
import * as path from 'path';

export interface PerformanceTestResult {
  testName: string;
  passed: boolean;
  message: string;
  duration: number;
  memoryBefore?: number;
  memoryAfter?: number;
  memoryDelta?: number;
  metrics?: Record<string, number>;
}

export interface PerformanceTestSuiteResult {
  suiteName: string;
  results: PerformanceTestResult[];
  totalDuration: number;
  passedCount: number;
  failedCount: number;
}

export interface PerformanceTestReport {
  timestamp: string;
  totalDuration: number;
  suites: PerformanceTestSuiteResult[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    successRate: number;
  };
}

class PerformanceLogger {
  private logFile: string;

  constructor(logFile: string) {
    this.logFile = logFile;
  }

  log(message: string): void {
    console.log(message);
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(this.logFile, logEntry, 'utf-8');
  }
}

export class PerformanceTestRunner {
  private logger: PerformanceLogger;
  private testDataDir: string;
  private logDir: string;

  constructor(testDataDir: string, logDir: string) {
    this.testDataDir = testDataDir;
    this.logDir = logDir;
    
    if (!fs.existsSync(this.testDataDir)) {
      fs.mkdirSync(this.testDataDir, { recursive: true });
    }
    
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    const logFile = path.join(this.logDir, 'performance-tests.log');
    this.logger = new PerformanceLogger(logFile);
  }

  async runAllTests(): Promise<PerformanceTestReport> {
    const suites: PerformanceTestSuiteResult[] = [];
    const startTime = Date.now();

    this.logger.log('============================================================');
    this.logger.log('🚀 开始性能测试...');
    this.logger.log('============================================================');

    try {
      suites.push(await this.runLargeDataProcessingTests());
      suites.push(await this.runAIServiceResponseTimeTests());
      suites.push(await this.runRepositoryPerformanceTests());
      suites.push(await this.runServicePerformanceTests());
    } catch (error) {
      this.logger.log(`❌ 性能测试执行失败: ${error}`);
    }

    const totalDuration = Date.now() - startTime;

    const report: PerformanceTestReport = {
      timestamp: new Date().toISOString(),
      totalDuration,
      suites,
      summary: {
        totalTests: suites.reduce((sum, suite) => sum + suite.results.length, 0),
        passedTests: suites.reduce((sum, suite) => sum + suite.passedCount, 0),
        failedTests: suites.reduce((sum, suite) => sum + suite.failedCount, 0),
        successRate: 0
      }
    };

    report.summary.successRate = report.summary.totalTests > 0
      ? (report.summary.passedTests / report.summary.totalTests) * 100
      : 0;

    this.printSummary(report);
    await this.generateReport(report);

    return report;
  }

  private async runLargeDataProcessingTests(): Promise<PerformanceTestSuiteResult> {
    this.logger.log('\n📁 大数据量处理性能测试');
    this.logger.log('------------------------------------------------------------');

    const results: PerformanceTestResult[] = [];
    const startTime = Date.now();

    try {
      results.push(await this.testLargeCharacterSet());
      results.push(await this.testLargeForeshadowSet());
      results.push(await this.testLargeChapterSet());
    } catch (error) {
      this.logger.log(`❌ 大数据量处理测试失败: ${error}`);
    }

    const totalDuration = Date.now() - startTime;
    const passedCount = results.filter(r => r.passed).length;
    const failedCount = results.length - passedCount;

    this.logger.log('------------------------------------------------------------');
    this.logger.log(`✅ 通过: ${passedCount} | ❌ 失败: ${failedCount}`);
    this.logger.log(`⏱️  耗时: ${totalDuration}ms`);

    return {
      suiteName: '大数据量处理性能测试',
      results,
      totalDuration,
      passedCount,
      failedCount
    };
  }

  private async testLargeCharacterSet(): Promise<PerformanceTestResult> {
    const testName = '处理大量角色数据';
    this.logger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();
    const memoryBefore = process.memoryUsage().heapUsed / 1024 / 1024;

    try {
      const { characterRepository } = await import('../repositories/implementations/characterRepository');
      
      characterRepository.init(this.testDataDir);
      
      const largeCharacterCount = 1000;
      const characters = [];
      
      for (let i = 0; i < largeCharacterCount; i++) {
        characters.push({
          id: `PERF_C${String(i).padStart(4, '0')}`,
          name: `性能测试角色${i}`,
          aliases: [`别名${i}`],
          role: 'supporting' as const,
          description: `角色${i}的描述`,
          personality: `角色${i}的性格`,
          background: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      const addStartTime = Date.now();
      const success = characterRepository.saveAll(characters);
      const addDuration = Date.now() - addStartTime;

      if (!success) {
        throw new Error('批量保存角色失败');
      }

      const queryStartTime = Date.now();
      const allCharacters = characterRepository.loadAll();
      const queryDuration = Date.now() - queryStartTime;

      const memoryAfter = process.memoryUsage().heapUsed / 1024 / 1024;
      const memoryDelta = memoryAfter - memoryBefore;

      const duration = Date.now() - startTime;

      if (allCharacters.length !== largeCharacterCount) {
        return {
          testName,
          passed: false,
          message: `角色数量不匹配: 期望${largeCharacterCount}, 实际${allCharacters.length}`,
          duration,
          memoryBefore,
          memoryAfter,
          memoryDelta,
          metrics: {
            addDuration,
            queryDuration,
            addRate: largeCharacterCount / (addDuration / 1000)
          }
        };
      }

      this.logger.log(`✅ ${testName} - 通过`);
      this.logger.log(`   添加耗时: ${addDuration}ms (${(largeCharacterCount / (addDuration / 1000)).toFixed(0)} 个/秒)`);
      this.logger.log(`   查询耗时: ${queryDuration}ms`);
      this.logger.log(`   内存使用: ${memoryDelta.toFixed(2)}MB`);

      return {
        testName,
        passed: true,
        message: `成功处理${largeCharacterCount}个角色`,
        duration,
        memoryBefore,
        memoryAfter,
        memoryDelta,
        metrics: {
          addDuration,
          queryDuration,
          addRate: largeCharacterCount / (addDuration / 1000)
        }
      };
    } catch (error) {
      this.logger.log(`❌ ${testName} - 失败: ${error}`);
      return {
        testName,
        passed: false,
        message: `错误: ${error}`,
        duration: Date.now() - startTime,
        memoryBefore,
        memoryAfter: process.memoryUsage().heapUsed / 1024 / 1024,
        memoryDelta: (process.memoryUsage().heapUsed / 1024 / 1024) - memoryBefore
      };
    }
  }

  private async testLargeForeshadowSet(): Promise<PerformanceTestResult> {
    const testName = '处理大量伏笔数据';
    this.logger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();
    const memoryBefore = process.memoryUsage().heapUsed / 1024 / 1024;

    try {
      const { foreshadowRepository } = await import('../repositories/implementations/foreshadowRepository');
      
      foreshadowRepository.init(this.testDataDir);
      
      const largeForeshadowCount = 500;
      const foreshadows = [];
      
      for (let i = 0; i < largeForeshadowCount; i++) {
        foreshadows.push({
          id: `PERF_F${String(i).padStart(4, '0')}`,
          description: `性能测试伏笔${i}`,
          status: 'pending' as const,
          importance: 'medium' as const,
          plantedChapter: Math.floor(i / 10) + 1,
          resolvedChapter: Math.floor(i / 10) + 5,
          relatedCharacters: [],
          keyword: `关键词${i}`,
          notes: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      const addStartTime = Date.now();
      const success = foreshadowRepository.saveAll(foreshadows);
      const addDuration = Date.now() - addStartTime;

      if (!success) {
        throw new Error('批量保存伏笔失败');
      }

      const queryStartTime = Date.now();
      const allForeshadows = foreshadowRepository.loadAll();
      const queryDuration = Date.now() - queryStartTime;

      const filterStartTime = Date.now();
      const plantedForeshadows = foreshadowRepository.findByStatus('pending');
      const filterDuration = Date.now() - filterStartTime;

      const memoryAfter = process.memoryUsage().heapUsed / 1024 / 1024;
      const memoryDelta = memoryAfter - memoryBefore;

      const duration = Date.now() - startTime;

      if (allForeshadows.length !== largeForeshadowCount) {
        return {
          testName,
          passed: false,
          message: `伏笔数量不匹配: 期望${largeForeshadowCount}, 实际${allForeshadows.length}`,
          duration,
          memoryBefore,
          memoryAfter,
          memoryDelta,
          metrics: {
            addDuration,
            queryDuration,
            filterDuration,
            addRate: largeForeshadowCount / (addDuration / 1000)
          }
        };
      }

      this.logger.log(`✅ ${testName} - 通过`);
      this.logger.log(`   添加耗时: ${addDuration}ms (${(largeForeshadowCount / (addDuration / 1000)).toFixed(0)} 个/秒)`);
      this.logger.log(`   查询耗时: ${queryDuration}ms`);
      this.logger.log(`   过滤耗时: ${filterDuration}ms`);
      this.logger.log(`   内存使用: ${memoryDelta.toFixed(2)}MB`);

      return {
        testName,
        passed: true,
        message: `成功处理${largeForeshadowCount}个伏笔`,
        duration,
        memoryBefore,
        memoryAfter,
        memoryDelta,
        metrics: {
          addDuration,
          queryDuration,
          filterDuration,
          addRate: largeForeshadowCount / (addDuration / 1000)
        }
      };
    } catch (error) {
      this.logger.log(`❌ ${testName} - 失败: ${error}`);
      return {
        testName,
        passed: false,
        message: `错误: ${error}`,
        duration: Date.now() - startTime,
        memoryBefore,
        memoryAfter: process.memoryUsage().heapUsed / 1024 / 1024,
        memoryDelta: (process.memoryUsage().heapUsed / 1024 / 1024) - memoryBefore
      };
    }
  }

  private async testLargeChapterSet(): Promise<PerformanceTestResult> {
    const testName = '处理大量章节摘要数据';
    this.logger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();
    const memoryBefore = process.memoryUsage().heapUsed / 1024 / 1024;

    try {
      const { summaryRepository } = await import('../repositories/implementations/summaryRepository');
      
      summaryRepository.init(this.testDataDir);
      
      const largeChapterCount = 100;
      const chapters = [];
      
      for (let i = 0; i < largeChapterCount; i++) {
        chapters.push({
          id: `PERF_CH${String(i).padStart(3, '0')}`,
          chapterNumber: i + 1,
          chapterTitle: `第${i + 1}章`,
          summary: `这是第${i + 1}章的摘要内容。`.repeat(20),
          wordCount: 1000,
          keyCharacters: [`角色${i + 1}`],
          keyEvents: [`事件${i + 1}`],
          createdAt: new Date().toISOString()
        });
      }

      const addStartTime = Date.now();
      const success = summaryRepository.saveAll(chapters);
      const addDuration = Date.now() - addStartTime;

      if (!success) {
        throw new Error('批量保存章节摘要失败');
      }

      const queryStartTime = Date.now();
      const allChapters = summaryRepository.loadAll();
      const queryDuration = Date.now() - queryStartTime;

      const memoryAfter = process.memoryUsage().heapUsed / 1024 / 1024;
      const memoryDelta = memoryAfter - memoryBefore;

      const duration = Date.now() - startTime;

      if (allChapters.length !== largeChapterCount) {
        return {
          testName,
          passed: false,
          message: `章节数量不匹配: 期望${largeChapterCount}, 实际${allChapters.length}`,
          duration,
          memoryBefore,
          memoryAfter,
          memoryDelta,
          metrics: {
            addDuration,
            queryDuration,
            addRate: largeChapterCount / (addDuration / 1000)
          }
        };
      }

      this.logger.log(`✅ ${testName} - 通过`);
      this.logger.log(`   添加耗时: ${addDuration}ms (${(largeChapterCount / (addDuration / 1000)).toFixed(0)} 个/秒)`);
      this.logger.log(`   查询耗时: ${queryDuration}ms`);
      this.logger.log(`   内存使用: ${memoryDelta.toFixed(2)}MB`);

      return {
        testName,
        passed: true,
        message: `成功处理${largeChapterCount}个章节`,
        duration,
        memoryBefore,
        memoryAfter,
        memoryDelta,
        metrics: {
          addDuration,
          queryDuration,
          addRate: largeChapterCount / (addDuration / 1000)
        }
      };
    } catch (error) {
      this.logger.log(`❌ ${testName} - 失败: ${error}`);
      return {
        testName,
        passed: false,
        message: `错误: ${error}`,
        duration: Date.now() - startTime,
        memoryBefore,
        memoryAfter: process.memoryUsage().heapUsed / 1024 / 1024,
        memoryDelta: (process.memoryUsage().heapUsed / 1024 / 1024) - memoryBefore
      };
    }
  }

  private async runAIServiceResponseTimeTests(): Promise<PerformanceTestSuiteResult> {
    this.logger.log('\n📁 AI服务响应时间性能测试');
    this.logger.log('------------------------------------------------------------');

    const results: PerformanceTestResult[] = [];
    const startTime = Date.now();

    try {
      results.push(await this.testContextBuildingPerformance());
      results.push(await this.testForeshadowFilteringPerformance());
    } catch (error) {
      this.logger.log(`❌ AI服务响应时间测试失败: ${error}`);
    }

    const totalDuration = Date.now() - startTime;
    const passedCount = results.filter(r => r.passed).length;
    const failedCount = results.length - passedCount;

    this.logger.log('------------------------------------------------------------');
    this.logger.log(`✅ 通过: ${passedCount} | ❌ 失败: ${failedCount}`);
    this.logger.log(`⏱️  耗时: ${totalDuration}ms`);

    return {
      suiteName: 'AI服务响应时间性能测试',
      results,
      totalDuration,
      passedCount,
      failedCount
    };
  }

  private async testContextBuildingPerformance(): Promise<PerformanceTestResult> {
    const testName = '上下文构建性能';
    this.logger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();
    const memoryBefore = process.memoryUsage().heapUsed / 1024 / 1024;

    try {
      const { contextService } = await import('../services/contextService');
      
      const iterations = 100;
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const iterationStart = Date.now();
        
        await contextService.buildGenerationContext(50);
        
        durations.push(Date.now() - iterationStart);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);

      const memoryAfter = process.memoryUsage().heapUsed / 1024 / 1024;
      const memoryDelta = memoryAfter - memoryBefore;

      const duration = Date.now() - startTime;

      this.logger.log(`✅ ${testName} - 通过`);
      this.logger.log(`   平均耗时: ${avgDuration.toFixed(2)}ms`);
      this.logger.log(`   最大耗时: ${maxDuration}ms`);
      this.logger.log(`   最小耗时: ${minDuration}ms`);
      this.logger.log(`   吞吐量: ${(iterations / (duration / 1000)).toFixed(0)} 次/秒`);
      this.logger.log(`   内存使用: ${memoryDelta.toFixed(2)}MB`);

      return {
        testName,
        passed: true,
        message: `完成${iterations}次上下文构建`,
        duration,
        memoryBefore,
        memoryAfter,
        memoryDelta,
        metrics: {
          avgDuration,
          maxDuration,
          minDuration,
          throughput: iterations / (duration / 1000)
        }
      };
    } catch (error) {
      this.logger.log(`❌ ${testName} - 失败: ${error}`);
      return {
        testName,
        passed: false,
        message: `错误: ${error}`,
        duration: Date.now() - startTime,
        memoryBefore,
        memoryAfter: process.memoryUsage().heapUsed / 1024 / 1024,
        memoryDelta: (process.memoryUsage().heapUsed / 1024 / 1024) - memoryBefore
      };
    }
  }

  private async testForeshadowFilteringPerformance(): Promise<PerformanceTestResult> {
    const testName = '伏笔过滤性能';
    this.logger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();
    const memoryBefore = process.memoryUsage().heapUsed / 1024 / 1024;

    try {
      const { foreshadowFilterService } = await import('../services/foreshadowFilterService');
      
      const iterations = 100;
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const iterationStart = Date.now();
        
        const testForeshadows = [
          {
            id: `PERF_TEST_${i}`,
            description: `测试伏笔${i}`,
            status: 'pending' as const,
            importance: 'medium' as const,
            plantedChapter: 40,
            resolvedChapter: 60,
            relatedCharacters: [],
            keyword: `关键词${i}`,
            notes: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];
        
        foreshadowFilterService.filterForeshadows(testForeshadows, {
          currentChapter: 50,
          maxForeshadows: 5
        });
        
        durations.push(Date.now() - iterationStart);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);

      const memoryAfter = process.memoryUsage().heapUsed / 1024 / 1024;
      const memoryDelta = memoryAfter - memoryBefore;

      const duration = Date.now() - startTime;

      this.logger.log(`✅ ${testName} - 通过`);
      this.logger.log(`   平均耗时: ${avgDuration.toFixed(2)}ms`);
      this.logger.log(`   最大耗时: ${maxDuration}ms`);
      this.logger.log(`   最小耗时: ${minDuration}ms`);
      this.logger.log(`   吞吐量: ${(iterations / (duration / 1000)).toFixed(0)} 次/秒`);
      this.logger.log(`   内存使用: ${memoryDelta.toFixed(2)}MB`);

      return {
        testName,
        passed: true,
        message: `完成${iterations}次伏笔过滤`,
        duration,
        memoryBefore,
        memoryAfter,
        memoryDelta,
        metrics: {
          avgDuration,
          maxDuration,
          minDuration,
          throughput: iterations / (duration / 1000)
        }
      };
    } catch (error) {
      this.logger.log(`❌ ${testName} - 失败: ${error}`);
      return {
        testName,
        passed: false,
        message: `错误: ${error}`,
        duration: Date.now() - startTime,
        memoryBefore,
        memoryAfter: process.memoryUsage().heapUsed / 1024 / 1024,
        memoryDelta: (process.memoryUsage().heapUsed / 1024 / 1024) - memoryBefore
      };
    }
  }

  private async runRepositoryPerformanceTests(): Promise<PerformanceTestSuiteResult> {
    this.logger.log('\n📁 Repository性能测试');
    this.logger.log('------------------------------------------------------------');

    const results: PerformanceTestResult[] = [];
    const startTime = Date.now();

    try {
      results.push(await this.testRepositoryCRUDPerformance());
    } catch (error) {
      this.logger.log(`❌ Repository性能测试失败: ${error}`);
    }

    const totalDuration = Date.now() - startTime;
    const passedCount = results.filter(r => r.passed).length;
    const failedCount = results.length - passedCount;

    this.logger.log('------------------------------------------------------------');
    this.logger.log(`✅ 通过: ${passedCount} | ❌ 失败: ${failedCount}`);
    this.logger.log(`⏱️  耗时: ${totalDuration}ms`);

    return {
      suiteName: 'Repository性能测试',
      results,
      totalDuration,
      passedCount,
      failedCount
    };
  }

  private async testRepositoryCRUDPerformance(): Promise<PerformanceTestResult> {
    const testName = 'Repository CRUD操作性能';
    this.logger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();
    const memoryBefore = process.memoryUsage().heapUsed / 1024 / 1024;

    try {
      const { characterRepository } = await import('../repositories/implementations/characterRepository');
      
      characterRepository.init(this.testDataDir);
      
      const iterations = 100;
      const addDurations: number[] = [];
      const updateDurations: number[] = [];
      const queryDurations: number[] = [];
      const deleteDurations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const character = {
          id: `PERF_CRUD_${i}`,
          name: `CRUD测试角色${i}`,
          aliases: [`别名${i}`],
          role: 'supporting' as const,
          description: `角色${i}的描述`,
          personality: `角色${i}的性格`,
          background: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const addStart = Date.now();
        await characterRepository.add(character);
        addDurations.push(Date.now() - addStart);

        const updateStart = Date.now();
        await characterRepository.update(character.id, { description: `更新后的描述${i}` });
        updateDurations.push(Date.now() - updateStart);

        const queryStart = Date.now();
        await characterRepository.findById(character.id);
        queryDurations.push(Date.now() - queryStart);

        const deleteStart = Date.now();
        await characterRepository.delete(character.id);
        deleteDurations.push(Date.now() - deleteStart);
      }

      const avgAddDuration = addDurations.reduce((a, b) => a + b, 0) / addDurations.length;
      const avgUpdateDuration = updateDurations.reduce((a, b) => a + b, 0) / updateDurations.length;
      const avgQueryDuration = queryDurations.reduce((a, b) => a + b, 0) / queryDurations.length;
      const avgDeleteDuration = deleteDurations.reduce((a, b) => a + b, 0) / deleteDurations.length;

      const memoryAfter = process.memoryUsage().heapUsed / 1024 / 1024;
      const memoryDelta = memoryAfter - memoryBefore;

      const duration = Date.now() - startTime;

      this.logger.log(`✅ ${testName} - 通过`);
      this.logger.log(`   平均添加耗时: ${avgAddDuration.toFixed(2)}ms`);
      this.logger.log(`   平均更新耗时: ${avgUpdateDuration.toFixed(2)}ms`);
      this.logger.log(`   平均查询耗时: ${avgQueryDuration.toFixed(2)}ms`);
      this.logger.log(`   平均删除耗时: ${avgDeleteDuration.toFixed(2)}ms`);
      this.logger.log(`   内存使用: ${memoryDelta.toFixed(2)}MB`);

      return {
        testName,
        passed: true,
        message: `完成${iterations}次CRUD操作`,
        duration,
        memoryBefore,
        memoryAfter,
        memoryDelta,
        metrics: {
          avgAddDuration,
          avgUpdateDuration,
          avgQueryDuration,
          avgDeleteDuration
        }
      };
    } catch (error) {
      this.logger.log(`❌ ${testName} - 失败: ${error}`);
      return {
        testName,
        passed: false,
        message: `错误: ${error}`,
        duration: Date.now() - startTime,
        memoryBefore,
        memoryAfter: process.memoryUsage().heapUsed / 1024 / 1024,
        memoryDelta: (process.memoryUsage().heapUsed / 1024 / 1024) - memoryBefore
      };
    }
  }

  private async runServicePerformanceTests(): Promise<PerformanceTestSuiteResult> {
    this.logger.log('\n📁 Service性能测试');
    this.logger.log('------------------------------------------------------------');

    const results: PerformanceTestResult[] = [];
    const startTime = Date.now();

    try {
      results.push(await this.testChapterGenerationPerformance());
    } catch (error) {
      this.logger.log(`❌ Service性能测试失败: ${error}`);
    }

    const totalDuration = Date.now() - startTime;
    const passedCount = results.filter(r => r.passed).length;
    const failedCount = results.length - passedCount;

    this.logger.log('------------------------------------------------------------');
    this.logger.log(`✅ 通过: ${passedCount} | ❌ 失败: ${failedCount}`);
    this.logger.log(`⏱️  耗时: ${totalDuration}ms`);

    return {
      suiteName: 'Service性能测试',
      results,
      totalDuration,
      passedCount,
      failedCount
    };
  }

  private async testChapterGenerationPerformance(): Promise<PerformanceTestResult> {
    const testName = '章节生成上下文准备性能';
    this.logger.log(`🔍 测试: ${testName}`);
    const startTime = Date.now();
    const memoryBefore = process.memoryUsage().heapUsed / 1024 / 1024;

    try {
      const { contextService } = await import('../services/contextService');
      
      const iterations = 50;
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const iterationStart = Date.now();
        
        await contextService.buildGenerationContext(i + 1);
        
        durations.push(Date.now() - iterationStart);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);

      const memoryAfter = process.memoryUsage().heapUsed / 1024 / 1024;
      const memoryDelta = memoryAfter - memoryBefore;

      const duration = Date.now() - startTime;

      this.logger.log(`✅ ${testName} - 通过`);
      this.logger.log(`   平均耗时: ${avgDuration.toFixed(2)}ms`);
      this.logger.log(`   最大耗时: ${maxDuration}ms`);
      this.logger.log(`   最小耗时: ${minDuration}ms`);
      this.logger.log(`   吞吐量: ${(iterations / (duration / 1000)).toFixed(0)} 次/秒`);
      this.logger.log(`   内存使用: ${memoryDelta.toFixed(2)}MB`);

      return {
        testName,
        passed: true,
        message: `完成${iterations}次章节生成上下文准备`,
        duration,
        memoryBefore,
        memoryAfter,
        memoryDelta,
        metrics: {
          avgDuration,
          maxDuration,
          minDuration,
          throughput: iterations / (duration / 1000)
        }
      };
    } catch (error) {
      this.logger.log(`❌ ${testName} - 失败: ${error}`);
      return {
        testName,
        passed: false,
        message: `错误: ${error}`,
        duration: Date.now() - startTime,
        memoryBefore,
        memoryAfter: process.memoryUsage().heapUsed / 1024 / 1024,
        memoryDelta: (process.memoryUsage().heapUsed / 1024 / 1024) - memoryBefore
      };
    }
  }

  private printSummary(report: PerformanceTestReport): void {
    this.logger.log('\n============================================================');
    this.logger.log('📊 性能测试总结');
    this.logger.log('============================================================');
    this.logger.log(`📅 测试时间: ${report.timestamp}`);
    this.logger.log(`⏱️  总耗时: ${report.totalDuration}ms`);
    this.logger.log(`✅ 通过: ${report.summary.passedTests}`);
    this.logger.log(`❌ 失败: ${report.summary.failedTests}`);
    this.logger.log(`📈 成功率: ${report.summary.successRate.toFixed(2)}%`);
    this.logger.log('============================================================');

    if (report.summary.successRate === 100) {
      this.logger.log('\n✅ 性能测试全部通过！');
    } else {
      this.logger.log(`\n⚠️ 性能测试完成：${report.summary.passedTests}/${report.summary.totalTests} 通过，${report.summary.failedTests} 失败`);
    }
  }

  private async generateReport(report: PerformanceTestReport): Promise<void> {
    const reportPath = path.join(this.logDir, 'performance-test-report.md');
    let markdown = '# 性能测试报告\n\n';
    markdown += `**生成时间**: ${report.timestamp}\n\n`;
    markdown += `**总耗时**: ${report.totalDuration}ms\n\n`;
    markdown += `**总测试数**: ${report.summary.totalTests}\n\n`;
    markdown += `**通过数**: ${report.summary.passedTests}\n\n`;
    markdown += `**失败数**: ${report.summary.failedTests}\n\n`;
    markdown += `**成功率**: ${report.summary.successRate.toFixed(2)}%\n\n`;

    markdown += '---\n\n';

    for (const suite of report.suites) {
      markdown += `## ${suite.suiteName}\n\n`;
      markdown += `**耗时**: ${suite.totalDuration}ms\n\n`;
      markdown += `**通过**: ${suite.passedCount} | **失败**: ${suite.failedCount}\n\n`;

      markdown += '| 测试名称 | 状态 | 耗时 | 内存使用 | 详情 |\n';
      markdown += '|---------|------|------|----------|------|\n';

      for (const result of suite.results) {
        const status = result.passed ? '✅ 通过' : '❌ 失败';
        const memoryDelta = result.memoryDelta ? `${result.memoryDelta.toFixed(2)}MB` : 'N/A';
        const details = result.metrics ? 
          Object.entries(result.metrics).map(([k, v]) => `${k}: ${typeof v === 'number' ? v.toFixed(2) : v}`).join(', ') : 
          result.message;

        markdown += `| ${result.testName} | ${status} | ${result.duration}ms | ${memoryDelta} | ${details} |\n`;
      }

      markdown += '\n';
    }

    markdown += '---\n\n';
    markdown += '*此报告由性能测试运行器自动生成*\n';

    fs.writeFileSync(reportPath, markdown, 'utf-8');
    this.logger.log(`\n📄 性能测试报告已生成: ${reportPath}`);
  }
}
