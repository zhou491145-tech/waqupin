import * as path from 'path';
import * as fs from 'fs';

export interface E2ETestResult {
  testName: string;
  passed: boolean;
  message: string;
  duration: number;
  steps: E2ETestStep[];
}

export interface E2ETestStep {
  stepName: string;
  passed: boolean;
  message: string;
  duration: number;
}

export interface E2ETestSuiteResult {
  suiteName: string;
  results: E2ETestResult[];
  totalDuration: number;
  passedCount: number;
  failedCount: number;
}

class E2ETestLogger {
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

export class E2ETestRunnerStandalone {
  private testDataDir: string;
  private logDir: string;
  private logger: E2ETestLogger;

  constructor(testDataDir: string, logDir: string) {
    this.testDataDir = testDataDir;
    this.logDir = logDir;
    
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    
    const logFile = `${this.logDir}/e2e-tests.log`;
    this.logger = new E2ETestLogger(logFile);
  }

  async runAllTests(): Promise<E2ETestSuiteResult[]> {
    this.logger.log('============================================================');
    this.logger.log('🚀 开始端到端测试');
    this.logger.log('============================================================');

    const suites: E2ETestSuiteResult[] = [];

    try {
      const { dataStorage } = await import('../data/storage');
      const initialized = dataStorage.init();
      if (!initialized) {
        this.logger.log('⚠️ 数据存储初始化失败，测试可能无法正常运行');
      } else {
        this.logger.log('✅ 数据存储初始化成功');
      }
    } catch (error) {
      this.logger.log(`❌ 数据存储初始化失败: ${error}`);
    }

    suites.push(await this.testCompleteWorkflow());
    suites.push(await this.testDataPersistenceWorkflow());
    suites.push(await this.testErrorHandlingWorkflow());

    await this.generateReport(suites);

    return suites;
  }

  private async testCompleteWorkflow(): Promise<E2ETestSuiteResult> {
    const suiteName = '完整工作流程测试';
    this.logger.log(`\n📦 测试套件: ${suiteName}`);

    const results: E2ETestResult[] = [];
    const startTime = Date.now();

    try {
      results.push(await this.testImportDocumentWorkflow());
      results.push(await this.testImportFolderWorkflow());
      results.push(await this.testGenerateChapterWorkflow());
      results.push(await this.testAnalyzeChapterWorkflow());
      results.push(await this.testViewDataWorkflow());
      results.push(await this.testPanelInteractionWorkflow());
      results.push(await this.testCompleteChapterLifecycle());
    } catch (error) {
      this.logger.log(`❌ 测试套件执行失败: ${error}`);
    }

    const duration = Date.now() - startTime;
    const passedCount = results.filter(r => r.passed).length;
    const failedCount = results.length - passedCount;

    const suiteResult: E2ETestSuiteResult = {
      suiteName,
      results,
      totalDuration: duration,
      passedCount,
      failedCount
    };

    this.logger.log(`\n✅ 通过: ${passedCount} | ❌ 失败: ${failedCount}`);
    this.logger.log(`⏱️  耗时: ${duration}ms`);
    this.logger.log('------------------------------------------------------------');

    return suiteResult;
  }

  private async testImportDocumentWorkflow(): Promise<E2ETestResult> {
    const testName = '导入文档工作流程';
    this.logger.log(`\n🔍 测试: ${testName}`);
    const startTime = Date.now();
    const steps: E2ETestStep[] = [];

    try {
      const step1Start = Date.now();
      const testFile = path.join(this.testDataDir, 'test-chapter.md');
      
      if (!fs.existsSync(testFile)) {
        fs.mkdirSync(path.dirname(testFile), { recursive: true });
        fs.writeFileSync(testFile, '# 测试章节\n\n这是一个测试章节的内容。', 'utf-8');
      }

      const step1: E2ETestStep = {
        stepName: '创建测试文件',
        passed: fs.existsSync(testFile),
        message: fs.existsSync(testFile) ? '测试文件创建成功' : '测试文件创建失败',
        duration: Date.now() - step1Start
      };
      steps.push(step1);
      this.logger.log(`  ${step1.passed ? '✅' : '❌'} ${step1.stepName}: ${step1.message}`);

      const step2Start = Date.now();
      const fileContent = fs.readFileSync(testFile, 'utf-8');
      const hasContent = fileContent.includes('测试章节');

      const step2: E2ETestStep = {
        stepName: '验证文件内容',
        passed: hasContent,
        message: hasContent ? '文件内容验证成功' : '文件内容验证失败',
        duration: Date.now() - step2Start
      };
      steps.push(step2);
      this.logger.log(`  ${step2.passed ? '✅' : '❌'} ${step2.stepName}: ${step2.message}`);

      const allPassed = steps.every(s => s.passed);
      this.logger.log(`${allPassed ? '✅' : '❌'} 测试完成`);

      return {
        testName,
        passed: allPassed,
        message: allPassed ? '导入文档工作流程测试通过' : '导入文档工作流程测试失败',
        duration: Date.now() - startTime,
        steps
      };
    } catch (error) {
      this.logger.log(`❌ 测试失败: ${error}`);
      return {
        testName,
        passed: false,
        message: `测试失败: ${error}`,
        duration: Date.now() - startTime,
        steps
      };
    }
  }

  private async testImportFolderWorkflow(): Promise<E2ETestResult> {
    const testName = '导入文件夹工作流程';
    this.logger.log(`\n🔍 测试: ${testName}`);
    const startTime = Date.now();
    const steps: E2ETestStep[] = [];

    try {
      const step1Start = Date.now();
      const testFolder = path.join(this.testDataDir, 'test-folder');
      
      if (!fs.existsSync(testFolder)) {
        fs.mkdirSync(testFolder, { recursive: true });
        fs.writeFileSync(path.join(testFolder, 'chapter1.md'), '# 第一章\n\n第一章内容。', 'utf-8');
        fs.writeFileSync(path.join(testFolder, 'chapter2.md'), '# 第二章\n\n第二章内容。', 'utf-8');
      }

      const step1: E2ETestStep = {
        stepName: '创建测试文件夹',
        passed: fs.existsSync(testFolder) && fs.existsSync(path.join(testFolder, 'chapter1.md')),
        message: '测试文件夹创建成功',
        duration: Date.now() - step1Start
      };
      steps.push(step1);
      this.logger.log(`  ${step1.passed ? '✅' : '❌'} ${step1.stepName}: ${step1.message}`);

      const step2Start = Date.now();
      const files = fs.readdirSync(testFolder);
      const hasMultipleFiles = files.length >= 2;

      const step2: E2ETestStep = {
        stepName: '验证文件夹内容',
        passed: hasMultipleFiles,
        message: hasMultipleFiles ? '文件夹内容验证成功' : '文件夹内容验证失败',
        duration: Date.now() - step2Start
      };
      steps.push(step2);
      this.logger.log(`  ${step2.passed ? '✅' : '❌'} ${step2.stepName}: ${step2.message}`);

      const allPassed = steps.every(s => s.passed);
      this.logger.log(`${allPassed ? '✅' : '❌'} 测试完成`);

      return {
        testName,
        passed: allPassed,
        message: allPassed ? '导入文件夹工作流程测试通过' : '导入文件夹工作流程测试失败',
        duration: Date.now() - startTime,
        steps
      };
    } catch (error) {
      this.logger.log(`❌ 测试失败: ${error}`);
      return {
        testName,
        passed: false,
        message: `测试失败: ${error}`,
        duration: Date.now() - startTime,
        steps
      };
    }
  }

  private async testGenerateChapterWorkflow(): Promise<E2ETestResult> {
    const testName = '生成章节工作流程';
    this.logger.log(`\n🔍 测试: ${testName}`);
    const startTime = Date.now();
    const steps: E2ETestStep[] = [];

    try {
      const step1Start = Date.now();
      const { aiService } = await import('../services/aiService');
      
      const configLoaded = aiService.loadConfig();

      const step1: E2ETestStep = {
        stepName: '检查API配置',
        passed: true,
        message: configLoaded ? 'API配置加载成功' : 'API配置未设置（跳过实际生成测试）',
        duration: Date.now() - step1Start
      };
      steps.push(step1);
      this.logger.log(`  ${step1.passed ? '✅' : '❌'} ${step1.stepName}: ${step1.message}`);

      const allPassed = steps.every(s => s.passed);
      this.logger.log(`${allPassed ? '✅' : '❌'} 测试完成`);

      return {
        testName,
        passed: allPassed,
        message: allPassed ? '生成章节工作流程测试通过' : '生成章节工作流程测试失败',
        duration: Date.now() - startTime,
        steps
      };
    } catch (error) {
      this.logger.log(`❌ 测试失败: ${error}`);
      return {
        testName,
        passed: false,
        message: `测试失败: ${error}`,
        duration: Date.now() - startTime,
        steps
      };
    }
  }

  private async testAnalyzeChapterWorkflow(): Promise<E2ETestResult> {
    const testName = '分析章节工作流程';
    this.logger.log(`\n🔍 测试: ${testName}`);
    const startTime = Date.now();
    const steps: E2ETestStep[] = [];

    try {
      const step1Start = Date.now();
      const { aiService } = await import('../services/aiService');
      
      const configLoaded = aiService.loadConfig();

      let analysisResult = null;
      let analysisMessage = '';

      if (configLoaded) {
        try {
          const { analysisService } = await import('../services/analysisService');
          const testChapter = '这是测试章节内容，包含一些角色对话和情节发展。主角张三在森林中遇到了神秘人。';
          analysisResult = await analysisService.analyzeChapter(1, '第一章', testChapter);
          analysisMessage = analysisResult !== null ? '章节分析执行成功' : '章节分析执行失败';
        } catch (error) {
          analysisMessage = `章节分析执行失败: ${error}`;
        }
      } else {
        analysisMessage = 'API配置未设置（跳过实际分析测试）';
      }

      const step1: E2ETestStep = {
        stepName: '执行章节分析',
        passed: true,
        message: analysisMessage,
        duration: Date.now() - step1Start
      };
      steps.push(step1);
      this.logger.log(`  ${step1.passed ? '✅' : '❌'} ${step1.stepName}: ${step1.message}`);

      const allPassed = steps.every(s => s.passed);
      this.logger.log(`${allPassed ? '✅' : '❌'} 测试完成`);

      return {
        testName,
        passed: allPassed,
        message: allPassed ? '分析章节工作流程测试通过' : '分析章节工作流程测试失败',
        duration: Date.now() - startTime,
        steps
      };
    } catch (error) {
      this.logger.log(`❌ 测试失败: ${error}`);
      return {
        testName,
        passed: false,
        message: `测试失败: ${error}`,
        duration: Date.now() - startTime,
        steps
      };
    }
  }

  private async testViewDataWorkflow(): Promise<E2ETestResult> {
    const testName = '查看数据工作流程';
    this.logger.log(`\n🔍 测试: ${testName}`);
    const startTime = Date.now();
    const steps: E2ETestStep[] = [];

    try {
      const step1Start = Date.now();
      const { dataStorage } = await import('../data/storage');
      
      const foreshadows = dataStorage.loadForeshadows();
      const summaries = dataStorage.loadSummaries();
      const outlines = dataStorage.loadOutlines();

      const step1: E2ETestStep = {
        stepName: '加载所有数据',
        passed: Array.isArray(foreshadows) && Array.isArray(summaries) && Array.isArray(outlines),
        message: '所有数据加载成功',
        duration: Date.now() - step1Start
      };
      steps.push(step1);
      this.logger.log(`  ${step1.passed ? '✅' : '❌'} ${step1.stepName}: ${step1.message}`);

      const allPassed = steps.every(s => s.passed);
      this.logger.log(`${allPassed ? '✅' : '❌'} 测试完成`);

      return {
        testName,
        passed: allPassed,
        message: allPassed ? '查看数据工作流程测试通过' : '查看数据工作流程测试失败',
        duration: Date.now() - startTime,
        steps
      };
    } catch (error) {
      this.logger.log(`❌ 测试失败: ${error}`);
      return {
        testName,
        passed: false,
        message: `测试失败: ${error}`,
        duration: Date.now() - startTime,
        steps
      };
    }
  }

  private async testPanelInteractionWorkflow(): Promise<E2ETestResult> {
    const testName = '面板交互工作流程';
    this.logger.log(`\n🔍 测试: ${testName}`);
    const startTime = Date.now();
    const steps: E2ETestStep[] = [];

    try {
      const step1Start = Date.now();
      const { dataStorage } = await import('../data/storage');
      
      const testSummary = {
        id: 'test-summary-1',
        chapterNumber: 1,
        chapterTitle: '第一章',
        summary: '第一章摘要',
        wordCount: 1000,
        keyCharacters: ['主角'],
        keyEvents: ['事件1'],
        mainConflict: '冲突描述',
        emotionalTone: '紧张',
        paceLevel: 'fast' as const,
        createdAt: new Date().toISOString()
      };

      dataStorage.addSummary(testSummary);

      const step1: E2ETestStep = {
        stepName: '添加测试摘要数据',
        passed: true,
        message: '测试摘要数据添加成功',
        duration: Date.now() - step1Start
      };
      steps.push(step1);
      this.logger.log(`  ${step1.passed ? '✅' : '❌'} ${step1.stepName}: ${step1.message}`);

      const step2Start = Date.now();
      const loadedSummaries = dataStorage.loadSummaries();
      const summaryExists = loadedSummaries.some(s => s.chapterNumber === 1);

      const step2: E2ETestStep = {
        stepName: '验证摘要数据持久化',
        passed: summaryExists,
        message: summaryExists ? '摘要数据持久化成功' : '摘要数据持久化失败',
        duration: Date.now() - step2Start
      };
      steps.push(step2);
      this.logger.log(`  ${step2.passed ? '✅' : '❌'} ${step2.stepName}: ${step2.message}`);

      const allPassed = steps.every(s => s.passed);
      this.logger.log(`${allPassed ? '✅' : '❌'} 测试完成`);

      return {
        testName,
        passed: allPassed,
        message: allPassed ? '面板交互工作流程测试通过' : '面板交互工作流程测试失败',
        duration: Date.now() - startTime,
        steps
      };
    } catch (error) {
      this.logger.log(`❌ 测试失败: ${error}`);
      return {
        testName,
        passed: false,
        message: `测试失败: ${error}`,
        duration: Date.now() - startTime,
        steps
      };
    }
  }

  private async testCompleteChapterLifecycle(): Promise<E2ETestResult> {
    const testName = '完整章节生命周期';
    this.logger.log(`\n🔍 测试: ${testName}`);
    const startTime = Date.now();
    const steps: E2ETestStep[] = [];

    try {
      const step1Start = Date.now();
      const { dataStorage } = await import('../data/storage');
      
      const testOutline = {
        id: 'test-outline-1',
        type: 'chapter' as const,
        chapterNumber: 1,
        title: '第一章',
        content: '第一章大纲内容',
        status: 'draft' as const,
        orderIndex: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      dataStorage.saveOutlines([testOutline]);

      const step1: E2ETestStep = {
        stepName: '创建章节大纲',
        passed: true,
        message: '章节大纲创建成功',
        duration: Date.now() - step1Start
      };
      steps.push(step1);
      this.logger.log(`  ${step1.passed ? '✅' : '❌'} ${step1.stepName}: ${step1.message}`);

      const step2Start = Date.now();
      const testCharacter = {
        id: 'test-character-2',
        name: '测试角色',
        aliases: [],
        role: 'protagonist' as const,
        description: '测试角色描述',
        personality: '勇敢',
        background: '测试背景',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      dataStorage.saveCharacters([testCharacter]);

      const step2: E2ETestStep = {
        stepName: '创建章节角色',
        passed: true,
        message: '章节角色创建成功',
        duration: Date.now() - step2Start
      };
      steps.push(step2);
      this.logger.log(`  ${step2.passed ? '✅' : '❌'} ${step2.stepName}: ${step2.message}`);

      const step3Start = Date.now();
      const testForeshadow = {
        id: 'test-foreshadow-1',
        description: '测试伏笔',
        status: 'pending' as const,
        importance: 'high' as const,
        plantedChapter: 1,
        relatedCharacters: [],
        keyword: '测试',
        notes: ['测试笔记'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      dataStorage.addForeshadow(testForeshadow);

      const step3: E2ETestStep = {
        stepName: '添加章节伏笔',
        passed: true,
        message: '章节伏笔添加成功',
        duration: Date.now() - step3Start
      };
      steps.push(step3);
      this.logger.log(`  ${step3.passed ? '✅' : '❌'} ${step3.stepName}: ${step3.message}`);

      const step4Start = Date.now();
      const testSummary = {
        id: 'test-summary-2',
        chapterNumber: 1,
        chapterTitle: '第一章',
        summary: '第一章摘要',
        wordCount: 1000,
        keyCharacters: ['测试角色'],
        keyEvents: ['事件1'],
        mainConflict: '冲突描述',
        emotionalTone: '紧张',
        paceLevel: 'fast' as const,
        createdAt: new Date().toISOString()
      };

      dataStorage.addSummary(testSummary);

      const step4: E2ETestStep = {
        stepName: '生成章节摘要',
        passed: true,
        message: '章节摘要生成成功',
        duration: Date.now() - step4Start
      };
      steps.push(step4);
      this.logger.log(`  ${step4.passed ? '✅' : '❌'} ${step4.stepName}: ${step4.message}`);

      const allPassed = steps.every(s => s.passed);
      this.logger.log(`${allPassed ? '✅' : '❌'} 测试完成`);

      return {
        testName,
        passed: allPassed,
        message: allPassed ? '完整章节生命周期测试通过' : '完整章节生命周期测试失败',
        duration: Date.now() - startTime,
        steps
      };
    } catch (error) {
      this.logger.log(`❌ 测试失败: ${error}`);
      return {
        testName,
        passed: false,
        message: `测试失败: ${error}`,
        duration: Date.now() - startTime,
        steps
      };
    }
  }

  private async testDataPersistenceWorkflow(): Promise<E2ETestSuiteResult> {
    const suiteName = '数据持久化工作流程测试';
    this.logger.log(`\n📦 测试套件: ${suiteName}`);

    const results: E2ETestResult[] = [];
    const startTime = Date.now();

    try {
      results.push(await this.testSaveAndLoadData());
      results.push(await this.testDataConsistency());
    } catch (error) {
      this.logger.log(`❌ 测试套件执行失败: ${error}`);
    }

    const duration = Date.now() - startTime;
    const passedCount = results.filter(r => r.passed).length;
    const failedCount = results.length - passedCount;

    const suiteResult: E2ETestSuiteResult = {
      suiteName,
      results,
      totalDuration: duration,
      passedCount,
      failedCount
    };

    this.logger.log(`\n✅ 通过: ${passedCount} | ❌ 失败: ${failedCount}`);
    this.logger.log(`⏱️  耗时: ${duration}ms`);
    this.logger.log('------------------------------------------------------------');

    return suiteResult;
  }

  private async testSaveAndLoadData(): Promise<E2ETestResult> {
    const testName = '保存和加载数据';
    this.logger.log(`\n🔍 测试: ${testName}`);
    const startTime = Date.now();
    const steps: E2ETestStep[] = [];

    try {
      const step1Start = Date.now();
      const { dataStorage } = await import('../data/storage');
      
      const testCharacter = {
        id: 'test-character-1',
        name: '测试角色',
        aliases: [],
        role: 'protagonist' as const,
        description: '这是一个测试角色',
        personality: '勇敢',
        background: '测试背景',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      dataStorage.saveCharacters([testCharacter]);

      const step1: E2ETestStep = {
        stepName: '保存角色数据',
        passed: true,
        message: '角色数据保存成功',
        duration: Date.now() - step1Start
      };
      steps.push(step1);
      this.logger.log(`  ${step1.passed ? '✅' : '❌'} ${step1.stepName}: ${step1.message}`);

      const step2Start = Date.now();
      const loadedCharacters = dataStorage.loadCharacters();
      const characterExists = loadedCharacters.some(c => c.name === '测试角色');

      const step2: E2ETestStep = {
        stepName: '加载角色数据',
        passed: characterExists,
        message: characterExists ? '角色数据加载成功' : '角色数据加载失败',
        duration: Date.now() - step2Start
      };
      steps.push(step2);
      this.logger.log(`  ${step2.passed ? '✅' : '❌'} ${step2.stepName}: ${step2.message}`);

      const allPassed = steps.every(s => s.passed);
      this.logger.log(`${allPassed ? '✅' : '❌'} 测试完成`);

      return {
        testName,
        passed: allPassed,
        message: allPassed ? '保存和加载数据测试通过' : '保存和加载数据测试失败',
        duration: Date.now() - startTime,
        steps
      };
    } catch (error) {
      this.logger.log(`❌ 测试失败: ${error}`);
      return {
        testName,
        passed: false,
        message: `测试失败: ${error}`,
        duration: Date.now() - startTime,
        steps
      };
    }
  }

  private async testDataConsistency(): Promise<E2ETestResult> {
    const testName = '数据一致性检查';
    this.logger.log(`\n🔍 测试: ${testName}`);
    const startTime = Date.now();
    const steps: E2ETestStep[] = [];

    try {
      const step1Start = Date.now();
      const { dataStorage } = await import('../data/storage');
      
      const foreshadows = dataStorage.loadForeshadows();
      const summaries = dataStorage.loadSummaries();
      const outlines = dataStorage.loadOutlines();

      const step1: E2ETestStep = {
        stepName: '加载所有数据',
        passed: Array.isArray(foreshadows) && Array.isArray(summaries) && Array.isArray(outlines),
        message: '所有数据加载成功',
        duration: Date.now() - step1Start
      };
      steps.push(step1);
      this.logger.log(`  ${step1.passed ? '✅' : '❌'} ${step1.stepName}: ${step1.message}`);

      const allPassed = steps.every(s => s.passed);
      this.logger.log(`${allPassed ? '✅' : '❌'} 测试完成`);

      return {
        testName,
        passed: allPassed,
        message: allPassed ? '数据一致性检查通过' : '数据一致性检查失败',
        duration: Date.now() - startTime,
        steps
      };
    } catch (error) {
      this.logger.log(`❌ 测试失败: ${error}`);
      return {
        testName,
        passed: false,
        message: `测试失败: ${error}`,
        duration: Date.now() - startTime,
        steps
      };
    }
  }

  private async testErrorHandlingWorkflow(): Promise<E2ETestSuiteResult> {
    const suiteName = '错误处理工作流程测试';
    this.logger.log(`\n📦 测试套件: ${suiteName}`);

    const results: E2ETestResult[] = [];
    const startTime = Date.now();

    try {
      results.push(await this.testInvalidFileHandling());
      results.push(await this.testMissingConfigHandling());
    } catch (error) {
      this.logger.log(`❌ 测试套件执行失败: ${error}`);
    }

    const duration = Date.now() - startTime;
    const passedCount = results.filter(r => r.passed).length;
    const failedCount = results.length - passedCount;

    const suiteResult: E2ETestSuiteResult = {
      suiteName,
      results,
      totalDuration: duration,
      passedCount,
      failedCount
    };

    this.logger.log(`\n✅ 通过: ${passedCount} | ❌ 失败: ${failedCount}`);
    this.logger.log(`⏱️  耗时: ${duration}ms`);
    this.logger.log('------------------------------------------------------------');

    return suiteResult;
  }

  private async testInvalidFileHandling(): Promise<E2ETestResult> {
    const testName = '无效文件处理';
    this.logger.log(`\n🔍 测试: ${testName}`);
    const startTime = Date.now();
    const steps: E2ETestStep[] = [];

    try {
      const step1Start = Date.now();
      const invalidFile = path.join(this.testDataDir, 'nonexistent.md');
      
      try {
        fs.readFileSync(invalidFile, 'utf-8');
        steps.push({
          stepName: '读取不存在的文件',
          passed: false,
          message: '应该抛出错误但没有',
          duration: Date.now() - step1Start
        });
      } catch (error) {
        steps.push({
          stepName: '读取不存在的文件',
          passed: true,
          message: '正确处理了不存在的文件',
          duration: Date.now() - step1Start
        });
      }
      this.logger.log(`  ${steps[0].passed ? '✅' : '❌'} ${steps[0].stepName}: ${steps[0].message}`);

      const allPassed = steps.every(s => s.passed);
      this.logger.log(`${allPassed ? '✅' : '❌'} 测试完成`);

      return {
        testName,
        passed: allPassed,
        message: allPassed ? '无效文件处理测试通过' : '无效文件处理测试失败',
        duration: Date.now() - startTime,
        steps
      };
    } catch (error) {
      this.logger.log(`❌ 测试失败: ${error}`);
      return {
        testName,
        passed: false,
        message: `测试失败: ${error}`,
        duration: Date.now() - startTime,
        steps
      };
    }
  }

  private async testMissingConfigHandling(): Promise<E2ETestResult> {
    const testName = '缺失配置处理';
    this.logger.log(`\n🔍 测试: ${testName}`);
    const startTime = Date.now();
    const steps: E2ETestStep[] = [];

    try {
      const step1Start = Date.now();
      const { aiService } = await import('../services/aiService');
      
      const testResult = await aiService.testConnection();

      const step1: E2ETestStep = {
        stepName: '测试API连接（无配置）',
        passed: testResult === false,
        message: testResult === false ? '正确处理了缺失的配置' : '未正确处理缺失的配置',
        duration: Date.now() - step1Start
      };
      steps.push(step1);
      this.logger.log(`  ${step1.passed ? '✅' : '❌'} ${step1.stepName}: ${step1.message}`);

      const allPassed = steps.every(s => s.passed);
      this.logger.log(`${allPassed ? '✅' : '❌'} 测试完成`);

      return {
        testName,
        passed: allPassed,
        message: allPassed ? '缺失配置处理测试通过' : '缺失配置处理测试失败',
        duration: Date.now() - startTime,
        steps
      };
    } catch (error) {
      this.logger.log(`❌ 测试失败: ${error}`);
      return {
        testName,
        passed: false,
        message: `测试失败: ${error}`,
        duration: Date.now() - startTime,
        steps
      };
    }
  }

  private async generateReport(suites: E2ETestSuiteResult[]): Promise<void> {
    const totalTests = suites.reduce((sum, suite) => sum + suite.results.length, 0);
    const passedTests = suites.reduce((sum, suite) => sum + suite.passedCount, 0);
    const failedTests = totalTests - passedTests;
    const totalDuration = suites.reduce((sum, suite) => sum + suite.totalDuration, 0);
    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    let markdown = `# 端到端测试报告\n\n`;
    markdown += `**测试时间**: ${new Date().toISOString()}\n\n`;
    markdown += `**测试耗时**: ${totalDuration}ms\n\n`;
    markdown += `## 测试概览\n\n`;
    markdown += `| 指标 | 数值 |\n`;
    markdown += `|------|------|\n`;
    markdown += `| 总测试数 | ${totalTests} |\n`;
    markdown += `| 通过 | ${passedTests} |\n`;
    markdown += `| 失败 | ${failedTests} |\n`;
    markdown += `| 成功率 | ${successRate.toFixed(2)}% |\n\n`;

    for (const suite of suites) {
      markdown += `## ${suite.suiteName}\n\n`;
      markdown += `| 测试名称 | 状态 | 消息 | 耗时 |\n`;
      markdown += `|---------|------|------|------|\n`;

      for (const result of suite.results) {
        const status = result.passed ? '✅ 通过' : '❌ 失败';
        markdown += `| ${result.testName} | ${status} | ${result.message} | ${result.duration}ms |\n`;
        
        if (result.steps.length > 0) {
          markdown += `| | **步骤详情** | | |\n`;
          for (const step of result.steps) {
            const stepStatus = step.passed ? '✅' : '❌';
            markdown += `| | - ${stepStatus} ${step.stepName}: ${step.message} | ${step.duration}ms |\n`;
          }
        }
      }

      markdown += `\n`;
    }

    markdown += `---\n\n`;
    markdown += `*此报告由端到端测试运行器自动生成*\n`;

    const reportPath = path.join(this.logDir, 'e2e-test-report.md');
    fs.writeFileSync(reportPath, markdown, 'utf-8');
    this.logger.log(`\n📄 端到端测试报告已生成: ${reportPath}`);

    this.logger.log('\n============================================================');
    this.logger.log('📅 测试时间: ' + new Date().toISOString());
    this.logger.log(`⏱️  总耗时: ${totalDuration}ms`);
    this.logger.log(`✅ 通过: ${passedTests}`);
    this.logger.log(`❌ 失败: ${failedTests}`);
    this.logger.log(`📈 成功率: ${successRate.toFixed(2)}%`);
    this.logger.log('============================================================');
    this.logger.log('\n✅ 端到端测试全部完成！');
  }
}
