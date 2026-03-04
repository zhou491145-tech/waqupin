import * as crypto from 'crypto';
import { execSync } from 'child_process';

/**
 * 获取机器唯一标识 (Machine ID)
 * 结合 CPU ID 和主板序列号生成哈希值
 */
export function getMachineId(): string {
    try {
        let id = '';
        if (process.platform === 'win32') {
            // Windows: 获取 CPU ID 和主板序列号
            const cpuId = execSync('wmic cpu get processorid').toString().split('\n')[1].trim();
            const baseboardId = execSync('wmic baseboard get serialnumber').toString().split('\n')[1].trim();
            id = `win-${cpuId}-${baseboardId}`;
        } else if (process.platform === 'darwin') {
            // macOS: 获取硬件 UUID
            id = execSync("ioreg -rd1 -c IOPlatformExpertDevice | grep -E 'IOPlatformUUID' | awk '{print $3}' | sed 's/\"//g'").toString().trim();
        } else {
            // Linux: 获取 machine-id
            try {
                id = execSync('cat /etc/machine-id').toString().trim();
            } catch {
                id = execSync('cat /var/lib/dbus/machine-id').toString().trim();
            }
        }

        // 使用 SHA-256 生成固定长度的哈希值，避免暴露原始硬件信息
        return crypto.createHash('sha256').update(id).digest('hex').substring(0, 32).toUpperCase();
    } catch (error) {
        console.error('获取机器码失败:', error);
        // 备选方案：返回一个基于随机数和时间的标识（不推荐，但在极端情况下保证程序不崩溃）
        return 'UNKNOWN-' + crypto.randomBytes(8).toString('hex').toUpperCase();
    }
}
