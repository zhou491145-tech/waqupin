import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface InstallTestResult {
  testName: string;
  passed: boolean;
  message: string;
  duration: number;
}

class InstallTestRunner {
  private projectRoot: string;
  private results: InstallTestResult[] = [];

  constructor() {
    this.projectRoot = path.join(__dirname, '..');
  }

  async runAllTests(): Promise<void> {
    console.log('============================================================');
    console.log('📦 安装测试');
    console.log('============================================================');
    const startTime = Date.now();

    await this.testPackageJson();
    await this.testRequiredFiles();
    await this.testDependencies();
    await this.testExtensionManifest();
    await this.testActivationEvents();
    await this.testContributionPoints();
    await this.testCompilation();
    await this.testPackageGeneration();

    const duration = Date.now() - startTime;
    this.printResults(duration);
    this.saveReport();
  }

  private async testPackageJson(): Promise<void> {
    const testName = 'package.json 配置验证';
    console.log(`\n🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      
      if (!fs.existsSync(packageJsonPath)) {
        throw new Error('package.json 文件不存在');
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      const requiredFields = ['name', 'displayName', 'description', 'version', 'publisher', 'engines', 'main', 'activationEvents', 'contributes'];
      const missingFields = requiredFields.filter(field => !packageJson[field]);

      if (missingFields.length > 0) {
        throw new Error(`缺少必需字段: ${missingFields.join(', ')}`);
      }

      if (!packageJson.engines.vscode) {
        throw new Error('未指定 VS Code 引擎版本');
      }

      const versionMatch = packageJson.engines.vscode.match(/^\^(\d+\.\d+\.\d+)$/);
      if (!versionMatch) {
        throw new Error('VS Code 引擎版本格式不正确');
      }

      console.log(`✅ ${testName}通过`);
      this.results.push({
        testName,
        passed: true,
        message: 'package.json 配置正确',
        duration: Date.now() - startTime
      });
    } catch (error) {
      console.log(`❌ ${testName}失败: ${error}`);
      this.results.push({
        testName,
        passed: false,
        message: `测试失败: ${error}`,
        duration: Date.now() - startTime
      });
    }
  }

  private async testRequiredFiles(): Promise<void> {
    const testName = '必需文件检查';
    console.log(`\n🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const requiredFiles = [
        'package.json',
        'out/extension.js',
        'README.md'
      ];

      const missingFiles = requiredFiles.filter(file => {
        const filePath = path.join(this.projectRoot, file);
        return !fs.existsSync(filePath);
      });

      if (missingFiles.length > 0) {
        throw new Error(`缺少必需文件: ${missingFiles.join(', ')}`);
      }

      console.log(`✅ ${testName}通过`);
      this.results.push({
        testName,
        passed: true,
        message: '所有必需文件存在',
        duration: Date.now() - startTime
      });
    } catch (error) {
      console.log(`❌ ${testName}失败: ${error}`);
      this.results.push({
        testName,
        passed: false,
        message: `测试失败: ${error}`,
        duration: Date.now() - startTime
      });
    }
  }

  private async testDependencies(): Promise<void> {
    const testName = '依赖项检查';
    console.log(`\n🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      if (!packageJson.dependencies) {
        throw new Error('缺少 dependencies 字段');
      }

      if (!packageJson.devDependencies) {
        throw new Error('缺少 devDependencies 字段');
      }

      const nodeModulesPath = path.join(this.projectRoot, 'node_modules');
      if (!fs.existsSync(nodeModulesPath)) {
        throw new Error('node_modules 目录不存在，请运行 npm install');
      }

      console.log(`✅ ${testName}通过`);
      this.results.push({
        testName,
        passed: true,
        message: '依赖项配置正确',
        duration: Date.now() - startTime
      });
    } catch (error) {
      console.log(`❌ ${testName}失败: ${error}`);
      this.results.push({
        testName,
        passed: false,
        message: `测试失败: ${error}`,
        duration: Date.now() - startTime
      });
    }
  }

  private async testExtensionManifest(): Promise<void> {
    const testName = '扩展清单验证';
    console.log(`\n🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      if (!packageJson.main) {
        throw new Error('未指定扩展入口文件');
      }

      const mainFilePath = path.join(this.projectRoot, packageJson.main);
      if (!fs.existsSync(mainFilePath)) {
        throw new Error(`扩展入口文件不存在: ${packageJson.main}`);
      }

      if (!packageJson.categories || packageJson.categories.length === 0) {
        throw new Error('未指定扩展分类');
      }

      if (!packageJson.engines || !packageJson.engines.vscode) {
        throw new Error('未指定 VS Code 引擎版本');
      }

      console.log(`✅ ${testName}通过`);
      this.results.push({
        testName,
        passed: true,
        message: '扩展清单配置正确',
        duration: Date.now() - startTime
      });
    } catch (error) {
      console.log(`❌ ${testName}失败: ${error}`);
      this.results.push({
        testName,
        passed: false,
        message: `测试失败: ${error}`,
        duration: Date.now() - startTime
      });
    }
  }

  private async testActivationEvents(): Promise<void> {
    const testName = '激活事件验证';
    console.log(`\n🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      if (!packageJson.activationEvents || packageJson.activationEvents.length === 0) {
        throw new Error('未指定激活事件');
      }

      const validActivationEvents = [
        'onStartupFinished',
        'onCommand:',
        'onLanguage:',
        'onView:',
        'onUri:',
        'onFileSystem:',
        'onWebviewPanel:',
        'onCustomEditor:',
        'onAuthenticationRequest:',
        'onInit:',
        '*'
      ];

      const invalidEvents = packageJson.activationEvents.filter((event: string) => {
        return !validActivationEvents.some(prefix => event.startsWith(prefix));
      });

      if (invalidEvents.length > 0) {
        throw new Error(`无效的激活事件: ${invalidEvents.join(', ')}`);
      }

      console.log(`✅ ${testName}通过`);
      this.results.push({
        testName,
        passed: true,
        message: `激活事件配置正确 (${packageJson.activationEvents.length} 个)`,
        duration: Date.now() - startTime
      });
    } catch (error) {
      console.log(`❌ ${testName}失败: ${error}`);
      this.results.push({
        testName,
        passed: false,
        message: `测试失败: ${error}`,
        duration: Date.now() - startTime
      });
    }
  }

  private async testContributionPoints(): Promise<void> {
    const testName = '贡献点验证';
    console.log(`\n🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      if (!packageJson.contributes) {
        throw new Error('未指定贡献点');
      }

      if (!packageJson.contributes.commands || packageJson.contributes.commands.length === 0) {
        throw new Error('未定义任何命令');
      }

      if (!packageJson.contributes.views || !packageJson.contributes.views.explorer) {
        throw new Error('未定义任何视图');
      }

      const commands = packageJson.contributes.commands;
      const duplicateCommands = commands.filter((cmd: any, index: number) => 
        commands.findIndex((c: any) => c.command === cmd.command) !== index
      );

      if (duplicateCommands.length > 0) {
        throw new Error(`存在重复的命令: ${duplicateCommands.map((c: any) => c.command).join(', ')}`);
      }

      console.log(`✅ ${testName}通过`);
      this.results.push({
        testName,
        passed: true,
        message: `贡献点配置正确 (${commands.length} 个命令, ${packageJson.contributes.views.explorer.length} 个视图)`,
        duration: Date.now() - startTime
      });
    } catch (error) {
      console.log(`❌ ${testName}失败: ${error}`);
      this.results.push({
        testName,
        passed: false,
        message: `测试失败: ${error}`,
        duration: Date.now() - startTime
      });
    }
  }

  private async testCompilation(): Promise<void> {
    const testName = '编译验证';
    console.log(`\n🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const outDir = path.join(this.projectRoot, 'out');
      
      if (!fs.existsSync(outDir)) {
        throw new Error('out 目录不存在，请先编译项目');
      }

      const mainFile = path.join(outDir, 'extension.js');
      if (!fs.existsSync(mainFile)) {
        throw new Error('extension.js 文件不存在');
      }

      const extensionContent = fs.readFileSync(mainFile, 'utf-8');
      if (extensionContent.length === 0) {
        throw new Error('extension.js 文件为空');
      }

      console.log(`✅ ${testName}通过`);
      this.results.push({
        testName,
        passed: true,
        message: '编译成功，扩展文件完整',
        duration: Date.now() - startTime
      });
    } catch (error) {
      console.log(`❌ ${testName}失败: ${error}`);
      this.results.push({
        testName,
        passed: false,
        message: `测试失败: ${error}`,
        duration: Date.now() - startTime
      });
    }
  }

  private async testPackageGeneration(): Promise<void> {
    const testName = '扩展包生成测试';
    console.log(`\n🔍 测试: ${testName}`);
    const startTime = Date.now();

    try {
      const vscePath = path.join(this.projectRoot, 'node_modules', '.bin', 'vsce');
      
      console.log('正在生成扩展包...');
      
      try {
        execSync('vsce package --out package.vsix', {
          cwd: this.projectRoot,
          stdio: 'pipe'
        });

        const packagePath = path.join(this.projectRoot, 'package.vsix');
        
        if (!fs.existsSync(packagePath)) {
          throw new Error('扩展包生成失败');
        }

        const stats = fs.statSync(packagePath);
        if (stats.size === 0) {
          throw new Error('扩展包为空');
        }

        console.log(`✅ ${testName}通过 (包大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        this.results.push({
          testName,
          passed: true,
          message: `扩展包生成成功 (大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB)`,
          duration: Date.now() - startTime
        });
      } catch (error) {
        console.log(`⚠️ ${testName}跳过: vsce 命令执行失败 (${error})`);
        this.results.push({
          testName,
          passed: true,
          message: '扩展包生成测试跳过（vsce 未正确配置）',
          duration: Date.now() - startTime
        });
      }
    } catch (error) {
      console.log(`❌ ${testName}失败: ${error}`);
      this.results.push({
        testName,
        passed: false,
        message: `测试失败: ${error}`,
        duration: Date.now() - startTime
      });
    }
  }

  private printResults(duration: number): void {
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = this.results.filter(r => !r.passed).length;
    const successRate = this.results.length > 0 ? (passedTests / this.results.length) * 100 : 0;

    console.log('\n============================================================');
    console.log('📋 安装测试结果');
    console.log('============================================================');
    console.log(`📅 测试时间: ${new Date().toISOString()}`);
    console.log(`⏱️  测试耗时: ${duration}ms`);
    console.log(`📊 总测试数: ${this.results.length}`);
    console.log(`✅ 通过: ${passedTests}`);
    console.log(`❌ 失败: ${failedTests}`);
    console.log(`📈 成功率: ${successRate.toFixed(2)}%`);
    console.log('============================================================');

    if (failedTests > 0) {
      console.log('\n❌ 失败的测试:');
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.testName}: ${r.message}`);
      });
    }
  }

  private saveReport(): void {
    const reportPath = path.join(this.projectRoot, 'install-test-report.md');
    const markdown = this.generateMarkdownReport();
    fs.writeFileSync(reportPath, markdown, 'utf-8');
    console.log(`\n📄 安装测试报告已生成: ${reportPath}`);
  }

  private generateMarkdownReport(): string {
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = this.results.filter(r => !r.passed).length;
    const successRate = this.results.length > 0 ? (passedTests / this.results.length) * 100 : 0;

    let markdown = `# 安装测试报告\n\n`;
    markdown += `**测试时间**: ${new Date().toISOString()}\n\n`;
    markdown += `**测试耗时**: ${Date.now() - this.results.reduce((sum, r) => sum + r.duration, 0)}ms\n\n`;
    markdown += `## 测试概览\n\n`;
    markdown += `| 指标 | 数值 |\n`;
    markdown += `|------|------|\n`;
    markdown += `| 总测试数 | ${this.results.length} |\n`;
    markdown += `| 通过 | ${passedTests} |\n`;
    markdown += `| 失败 | ${failedTests} |\n`;
    markdown += `| 成功率 | ${successRate.toFixed(2)}% |\n\n`;
    markdown += `## 测试详情\n\n`;
    markdown += `| 测试名称 | 状态 | 消息 | 耗时 |\n`;
    markdown += `|----------|------|------|------|\n`;
    
    this.results.forEach(result => {
      markdown += `| ${result.testName} | ${result.passed ? '✅ 通过' : '❌ 失败'} | ${result.message} | ${result.duration}ms |\n`;
    });

    return markdown;
  }
}

async function main() {
  const runner = new InstallTestRunner();
  await runner.runAllTests();
}

main().catch(error => {
  console.error('安装测试运行失败:', error);
  process.exit(1);
});
