import * as vscode from 'vscode';
import * as crypto from 'crypto';
import axios from 'axios';
import { getMachineId } from './machineId';

const LICENSE_KEY_STORAGE = 'novelAssistant.licenseKey';
const LICENSE_STATE_STORAGE = 'novelAssistant.licenseStateV2';
// 这是一个“盐”值，用于增加破解难度，您可以随意修改这串字符
const SECRET_SALT = 'NOVEL_ASSISTANT_SUPER_SECRET_2024';

export const PRO_FEATURE_REQUIRED_MESSAGE = '该功能为专业版功能，请升级到专业版后使用。';

export type Plan = 'basic' | 'pro' | 'custom';
export type FeatureId = 'ai' | 'refine' | 'styleTemplates';

interface LicenseEntitlements {
    plan: Plan;
    features: FeatureId[];
    expiresAt?: number; // ms epoch
    lastVerifiedAt: number; // ms epoch
    verifyTtlMs: number;
    graceMs: number;
    source: 'offline' | 'online' | 'cache';
}

export interface AuthResult {
    success: boolean;
    message: string;
}

function getDefaultFeaturesByPlan(plan: Plan): FeatureId[] {
    switch (plan) {
        case 'basic':
            return ['ai', 'styleTemplates'];
        case 'pro':
        case 'custom':
            return ['ai', 'refine', 'styleTemplates'];
        default:
            return ['ai'];
    }
}

function normalizeAuthUrl(url: string): string {
    return url.replace(/\/+$/, '');
}

function nowMs(): number {
    return Date.now();
}

function isEntitlementsValid(ent: LicenseEntitlements, atMs: number): boolean {
    if (ent.expiresAt && atMs > ent.expiresAt + ent.graceMs) {
        return false;
    }
    if (atMs > ent.lastVerifiedAt + ent.graceMs) {
        return false;
    }
    return true;
}

function hasFeature(ent: LicenseEntitlements | null, feature: FeatureId): boolean {
    if (!ent) return false;
    if (!isEntitlementsValid(ent, nowMs())) return false;
    return ent.features.includes(feature);
}

/**
 * 旧版离线激活兼容：根据设备标识（machineId）生成对应的离线校验码。
 * 注意：发布版默认强制联网授权，此逻辑仅在显式开启兼容开关时使用。
 */
function generateValidCode(machineId: string): string {
    return crypto.createHash('sha256')
        .update(machineId + SECRET_SALT)
        .digest('hex')
        .substring(0, 16)
        .toUpperCase();
}

async function loadCachedEntitlements(context: vscode.ExtensionContext): Promise<LicenseEntitlements | null> {
    const raw = context.globalState.get<any>(LICENSE_STATE_STORAGE);
    if (!raw || typeof raw !== 'object') return null;

    const plan: Plan = raw.plan;
    const features: FeatureId[] = Array.isArray(raw.features) ? raw.features : [];
    const expiresAt: number | undefined = typeof raw.expiresAt === 'number' ? raw.expiresAt : undefined;
    const lastVerifiedAt: number = typeof raw.lastVerifiedAt === 'number' ? raw.lastVerifiedAt : 0;
    const verifyTtlMs: number = typeof raw.verifyTtlMs === 'number' ? raw.verifyTtlMs : 24 * 60 * 60 * 1000;
    const graceMs: number = typeof raw.graceMs === 'number' ? raw.graceMs : 7 * 24 * 60 * 60 * 1000;

    if (!plan || !lastVerifiedAt) return null;

    return {
        plan,
        features: features.length ? features : getDefaultFeaturesByPlan(plan),
        expiresAt,
        lastVerifiedAt,
        verifyTtlMs,
        graceMs,
        source: 'cache'
    };
}

async function saveEntitlements(context: vscode.ExtensionContext, ent: LicenseEntitlements): Promise<void> {
    await context.globalState.update(LICENSE_STATE_STORAGE, {
        plan: ent.plan,
        features: ent.features,
        expiresAt: ent.expiresAt,
        lastVerifiedAt: ent.lastVerifiedAt,
        verifyTtlMs: ent.verifyTtlMs,
        graceMs: ent.graceMs
    });
}

function readAuthUrlFromSettings(): string {
    try {
        const settings = vscode.workspace.getConfiguration('novelAssistant');
        const authUrl = settings.get('authUrl') as string;
        return (authUrl || '').trim();
    } catch {
        return '';
    }
}

function readBooleanSetting(key: string, defaultValue: boolean): boolean {
    try {
        const settings = vscode.workspace.getConfiguration('novelAssistant');
        const v = settings.get(key) as unknown;
        return typeof v === 'boolean' ? v : defaultValue;
    } catch {
        return defaultValue;
    }
}

function isRequireOnlineLicense(): boolean {
    return readBooleanSetting('requireOnlineLicense', true);
}

function isAllowLegacyOfflineLicense(): boolean {
    return readBooleanSetting('allowLegacyOfflineLicense', false);
}

function getExtensionVersion(context: vscode.ExtensionContext): string {
    try {
        const ext = vscode.extensions.getExtension(context.extension.id);
        return (ext?.packageJSON?.version as string) || 'unknown';
    } catch {
        return 'unknown';
    }
}

async function verifyOnline(authUrl: string, licenseKey: string, context: vscode.ExtensionContext): Promise<LicenseEntitlements> {
    const machineId = getMachineId();
    const ts = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomBytes(16).toString('hex');
    const appVersion = getExtensionVersion(context);

    const url = `${normalizeAuthUrl(authUrl)}/v1/license/verify`;

    const response = await axios.post(
        url,
        {
            licenseKey,
            deviceId: machineId,
            appVersion,
            ts,
            nonce
        },
        {
            timeout: 12000,
            headers: {
                'Content-Type': 'application/json'
            }
        }
    );

    const data = response.data || {};
    if (!data.success) {
        throw new Error(data.message || '在线验证失败');
    }

    const plan: Plan = (data.plan as Plan) || 'pro';
    const features: FeatureId[] = Array.isArray(data.features) ? data.features : getDefaultFeaturesByPlan(plan);
    const expiresAt: number | undefined = typeof data.expiresAt === 'number' ? data.expiresAt : undefined;
    const verifyTtlMs: number = typeof data.verifyTtlSec === 'number'
        ? data.verifyTtlSec * 1000
        : 24 * 60 * 60 * 1000;
    const graceMs: number = typeof data.graceSec === 'number'
        ? data.graceSec * 1000
        : 7 * 24 * 60 * 60 * 1000;

    const ent: LicenseEntitlements = {
        plan,
        features,
        expiresAt,
        lastVerifiedAt: nowMs(),
        verifyTtlMs,
        graceMs,
        source: 'online'
    };

    return ent;
}

async function activateOnline(authUrl: string, licenseKey: string, context: vscode.ExtensionContext): Promise<LicenseEntitlements> {
    const machineId = getMachineId();
    const ts = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomBytes(16).toString('hex');
    const appVersion = getExtensionVersion(context);

    const url = `${normalizeAuthUrl(authUrl)}/v1/license/activate`;

    const response = await axios.post(
        url,
        {
            licenseKey,
            deviceId: machineId,
            appVersion,
            ts,
            nonce
        },
        {
            timeout: 12000,
            headers: {
                'Content-Type': 'application/json'
            }
        }
    );

    const data = response.data || {};
    if (!data.success) {
        throw new Error(data.message || '在线激活失败');
    }

    const plan: Plan = (data.plan as Plan) || 'pro';
    const features: FeatureId[] = Array.isArray(data.features) ? data.features : getDefaultFeaturesByPlan(plan);
    const expiresAt: number | undefined = typeof data.expiresAt === 'number' ? data.expiresAt : undefined;
    const verifyTtlMs: number = typeof data.verifyTtlSec === 'number'
        ? data.verifyTtlSec * 1000
        : 24 * 60 * 60 * 1000;
    const graceMs: number = typeof data.graceSec === 'number'
        ? data.graceSec * 1000
        : 7 * 24 * 60 * 60 * 1000;

    const ent: LicenseEntitlements = {
        plan,
        features,
        expiresAt,
        lastVerifiedAt: nowMs(),
        verifyTtlMs,
        graceMs,
        source: 'online'
    };

    return ent;
}

/**
 * 激活（优先在线 activate；否则回退本地 verify）
 * 用于“用户刚输入激活码”的场景，以便返回更明确的错误（如设备上限/到期/吊销）。
 */
export async function activateLicense(context: vscode.ExtensionContext): Promise<AuthResult> {
    const licenseKey = context.globalState.get<string>(LICENSE_KEY_STORAGE);
    if (!licenseKey) {
        return { success: false, message: '未输入激活码' };
    }

    const authUrl = readAuthUrlFromSettings();
    const requireOnline = isRequireOnlineLicense();
    if (requireOnline && !authUrl) {
        return { success: false, message: '未配置验证服务器地址（novelAssistant.authUrl），请联网授权后使用' };
    }
    if (authUrl) {
        try {
            const ent = await activateOnline(authUrl, licenseKey, context);
            globalEntitlements = ent;
            globalActivationStatus = true;
            await saveEntitlements(context, ent);
            return { success: true, message: '激活成功' };
        } catch (e: any) {
            globalEntitlements = null;
            globalActivationStatus = false;
            return { success: false, message: e?.message ?? String(e) };
        }
    }

    return verifyLicense(context);
}

/**
 * 验证激活状态 (本地脱机版)
 */
export async function verifyLicense(context: vscode.ExtensionContext): Promise<AuthResult> {
    const licenseKey = context.globalState.get<string>(LICENSE_KEY_STORAGE);

    if (!licenseKey) {
        return { success: false, message: '未输入激活码' };
    }

    // 1) 优先尝试读取缓存授权（支持离线宽限期）
    const cached = await loadCachedEntitlements(context);
    if (cached && isEntitlementsValid(cached, nowMs())) {
        globalEntitlements = cached;
        globalActivationStatus = true;

        // 缓存未到 TTL 时不强制联网
        if (nowMs() <= cached.lastVerifiedAt + cached.verifyTtlMs) {
            return { success: true, message: '验证通过（缓存）' };
        }
    }

    // 自校验：检查盐值是否被篡改（简单示例）
    if (SECRET_SALT.length < 20) {
        return { success: false, message: '系统核心组件损坏' };
    }

    const machineId = getMachineId();
    const expectedCode = generateValidCode(machineId);

    // 2) 联网校验（发布版默认强制）
    const authUrl = readAuthUrlFromSettings();
    const requireOnline = isRequireOnlineLicense();

    if (requireOnline && !authUrl) {
        globalEntitlements = null;
        globalActivationStatus = false;
        return { success: false, message: '未配置验证服务器地址（novelAssistant.authUrl），请联网授权后使用' };
    }

    if (authUrl) {
        try {
            const ent = await verifyOnline(authUrl, licenseKey, context);
            globalEntitlements = ent;
            globalActivationStatus = true;
            await saveEntitlements(context, ent);
            return { success: true, message: '验证通过' };
        } catch (e: any) {
            // 在线失败时，若缓存仍在宽限期内，继续允许使用
            if (cached && isEntitlementsValid(cached, nowMs())) {
                globalEntitlements = cached;
                globalActivationStatus = true;
                return { success: true, message: `验证通过（离线宽限期）` };
            }

            globalEntitlements = null;
            globalActivationStatus = false;
            const msg = e?.message ?? String(e);
            return { success: false, message: `在线验证失败：${msg}` };
        }
    }

    // 3) 离线校验（仅在未强制联网 + 显式允许兼容旧离线码时启用）
    if (!requireOnline && isAllowLegacyOfflineLicense() && licenseKey === expectedCode) {
        const ent: LicenseEntitlements = {
            plan: 'pro',
            features: getDefaultFeaturesByPlan('pro'),
            lastVerifiedAt: nowMs(),
            verifyTtlMs: 3650 * 24 * 60 * 60 * 1000,
            graceMs: 3650 * 24 * 60 * 60 * 1000,
            source: 'offline'
        };

        globalEntitlements = ent;
        globalActivationStatus = true;
        await saveEntitlements(context, ent);
        return { success: true, message: '验证通过（离线兼容）' };
    }

    globalEntitlements = null;
    globalActivationStatus = false;
    return { success: false, message: '激活码无效或与当前设备不匹配' };
}

/**
 * 静默校验函数 (用于核心服务)
 * 不弹出任何提示，仅返回布尔值
 */
export function isActivatedSync(): boolean {
    // 注意：在 VS Code 插件中，同步获取 globalState 比较困难
    // 这里我们通过一个内存变量来缓存激活状态
    return globalActivationStatus;
}

let globalActivationStatus = false;
let globalEntitlements: LicenseEntitlements | null = null;

/**
 * 同步判断是否拥有某个功能权限
 */
export function isEntitledSync(feature: FeatureId): boolean {
    let result = hasFeature(globalEntitlements, feature);
    
    // 临时修复方案：强制授予 styleTemplates 权限给所有计划用户
    if (feature === 'styleTemplates') {
        const plan = getPlanSync();
        const isBasicProOrCustom = plan === 'basic' || plan === 'pro' || plan === 'custom';
        
        console.log(`[风格模板权限诊断] ========== 权限检查开始 ==========`);
        console.log(`[风格模板权限诊断] 检查功能: ${feature}`);
        console.log(`[风格模板权限诊断] 当前计划: ${plan}`);
        console.log(`[风格模板权限诊断] 是否为基础/专业/定制版: ${isBasicProOrCustom}`);
        console.log(`[风格模板权限诊断] 原始权限结果: ${result}`);
        console.log(`[风格模板权限诊断] globalEntitlements:`, JSON.stringify(globalEntitlements, null, 2));
        
        // 强制授权：如果 plan 是 basic、pro 或 custom，直接授予 styleTemplates 权限
        if (isBasicProOrCustom) {
            result = true;
            console.log(`[风格模板权限诊断] ✅ 强制授权已应用！最终结果: ${result}`);
        } else {
            console.log(`[风格模板权限诊断] ❌ 未应用强制授权，最终结果: ${result}`);
        }
        
        console.log(`[风格模板权限诊断] ========== 权限检查结束 ==========\n`);
    }
    
    return result;
}

/**
 * 获取当前授权 plan（无授权时为 null）
 */
export function getPlanSync(): Plan | null {
    if (!globalEntitlements) return null;
    if (!isEntitlementsValid(globalEntitlements, nowMs())) return null;
    return globalEntitlements.plan;
}

/**
 * 初始化激活状态缓存
 */
export async function initActivationStatus(context: vscode.ExtensionContext): Promise<void> {
    const result = await verifyLicense(context);
    globalActivationStatus = result.success;
}

/**
 * 弹出激活框
 */
export async function showActivationDialog(context: vscode.ExtensionContext): Promise<boolean> {
    const machineId = getMachineId();

    // 显示设备标识（用于服务端设备绑定）
    const licenseKey = await vscode.window.showInputBox({
        prompt: `您的设备标识为: ${machineId}`,
        placeHolder: '在此输入授权码/激活码',
        value: '',
        ignoreFocusOut: true
    });

    if (licenseKey) {
        await context.globalState.update(LICENSE_KEY_STORAGE, licenseKey.trim().toUpperCase());
        const result = await activateLicense(context);
        if (result.success) {
            vscode.window.showInformationMessage('激活成功！感谢支持。');
            return true;
        } else {
            vscode.window.showErrorMessage(`激活失败: ${result.message}`);
            return false;
        }
    }
    return false;
}
