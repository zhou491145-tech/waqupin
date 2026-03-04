import * as crypto from 'crypto';
import { ActivationPanel } from '../../src/views/activationPanel';

/**
 * 激活验证面板集成测试
 * 
 * 这个测试文件验证激活面板的核心功能：
 * - 激活码生成算法
 * - 机器码验证
 * - 加密一致性
 */

// ============================================================
// 激活码生成算法测试
// ============================================================

/**
 * 测试激活码生成算法的正确性
 */
export function testActivationCodeGeneration(): void {
  const machineId = '123456789ABCDEF0123456789ABCDEF01';
  const SECRET_SALT = 'NOVEL_ASSISTANT_SUPER_SECRET_2024';
  
  const activationCode = crypto.createHash('sha256')
    .update(machineId + SECRET_SALT)
    .digest('hex')
    .substring(0, 16)
    .toUpperCase();

  // 验证激活码格式
  if (activationCode.length !== 16) {
    throw new Error(`激活码长度应该是 16，实际: ${activationCode.length}`);
  }

  // 验证激活码是大写十六进制
  if (!/^[0-9A-F]{16}$/.test(activationCode)) {
    throw new Error(`激活码格式不正确: ${activationCode}`);
  }

  console.log('✅ 激活码生成测试通过');
}

/**
 * 测试机器码与激活码的一一对应关系
 */
export function testMachineIdToActivationCodeMapping(): void {
  const SECRET_SALT = 'NOVEL_ASSISTANT_SUPER_SECRET_2024';
  const machineId1 = 'MACHINE_ID_001';
  const machineId2 = 'MACHINE_ID_002';

  const code1 = crypto.createHash('sha256')
    .update(machineId1 + SECRET_SALT)
    .digest('hex')
    .substring(0, 16)
    .toUpperCase();

  const code2 = crypto.createHash('sha256')
    .update(machineId2 + SECRET_SALT)
    .digest('hex')
    .substring(0, 16)
    .toUpperCase();

  if (code1 === code2) {
    throw new Error('不同的机器码应该生成不同的激活码');
  }

  console.log('✅ 机器码映射测试通过');
}

/**
 * 测试激活算法的一致性（确定性）
 */
export function testActivationAlgorithmConsistency(): void {
  const testMachineId = 'WINDOWS_MACHINE_ID_2024';
  const SECRET_SALT = 'NOVEL_ASSISTANT_SUPER_SECRET_2024';

  // 第一次生成
  const code1 = crypto.createHash('sha256')
    .update(testMachineId + SECRET_SALT)
    .digest('hex')
    .substring(0, 16)
    .toUpperCase();

  // 第二次生成
  const code2 = crypto.createHash('sha256')
    .update(testMachineId + SECRET_SALT)
    .digest('hex')
    .substring(0, 16)
    .toUpperCase();

  if (code1 !== code2) {
    throw new Error('相同的输入应该生成相同的激活码');
  }

  console.log('✅ 算法一致性测试通过');
}

/**
 * 测试激活码不可逆性
 */
export function testActivationCodeIrreversibility(): void {
  const machineId = 'TEST_MACHINE_ID';
  const SECRET_SALT = 'NOVEL_ASSISTANT_SUPER_SECRET_2024';

  const code = crypto.createHash('sha256')
    .update(machineId + SECRET_SALT)
    .digest('hex')
    .substring(0, 16)
    .toUpperCase();

  // 激活码不应该等于机器码
  if (code === machineId) {
    throw new Error('激活码不应该等于机器码');
  }

  // 激活码应该是完全不同的值
  if (code.includes(machineId) || machineId.includes(code)) {
    throw new Error('激活码不应该包含机器码信息');
  }

  console.log('✅ 不可逆性测试通过');
}

/**
 * 测试激活码对输入变化的敏感性
 */
export function testActivationCodeSensitivity(): void {
  const machineId1 = 'ABCDEF0123456789';
  const machineId2 = 'ABCDEF0123456788'; // 最后一位不同
  const SECRET_SALT = 'NOVEL_ASSISTANT_SUPER_SECRET_2024';

  const code1 = crypto.createHash('sha256')
    .update(machineId1 + SECRET_SALT)
    .digest('hex')
    .substring(0, 16)
    .toUpperCase();

  const code2 = crypto.createHash('sha256')
    .update(machineId2 + SECRET_SALT)
    .digest('hex')
    .substring(0, 16)
    .toUpperCase();

  if (code1 === code2) {
    throw new Error('机器码的微小变化应该产生完全不同的激活码');
  }

  console.log('✅ 敏感性测试通过');
}

// ============================================================
// ActivationPanel 类测试
// ============================================================

/**
 * 测试 ActivationPanel 导出
 */
export function testActivationPanelExport(): void {
  if (typeof ActivationPanel !== 'function') {
    throw new Error('ActivationPanel 应该是一个类');
  }

  console.log('✅ ActivationPanel 导出测试通过');
}

/**
 * 测试 ActivationPanel viewType
 */
export function testActivationPanelViewType(): void {
  if (ActivationPanel.viewType !== 'novelAssistant.activation') {
    throw new Error(`viewType 应该是 'novelAssistant.activation'，实际: ${ActivationPanel.viewType}`);
  }

  console.log('✅ viewType 测试通过');
}

// ============================================================
// 运行所有测试
// ============================================================

export function runAllTests(): void {
  console.log('\n🧪 开始运行激活验证面板测试...\n');

  try {
    testActivationCodeGeneration();
    testMachineIdToActivationCodeMapping();
    testActivationAlgorithmConsistency();
    testActivationCodeIrreversibility();
    testActivationCodeSensitivity();
    testActivationPanelExport();
    testActivationPanelViewType();

    console.log('\n✨ 所有测试通过！\n');
  } catch (error) {
    console.error('\n❌ 测试失败:\n', error);
    process.exit(1);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runAllTests();
}

