/**
 * 小说类别定义和配置
 * 用于自动推荐对应类别的精修模板
 */

import { CategoryConfig, NovelCategory } from '../types/refining';

export const NOVEL_CATEGORIES: Record<NovelCategory, CategoryConfig> = {
  historical: {
    id: 'historical',
    name: '历史类',
    emoji: '📜',
    description: '历史背景、年代感、历史人物设定',
    defaultTemplates: [
      'history-timeline',      // 时间线检查
      'history-characters',    // 历史人物设定
      'history-background',    // 历史背景和谐
      'logic-check',           // 逻辑自洽
      'atmosphere',            // 氛围烘托
    ],
    color: '#8B4513',
  },
  fantasy: {
    id: 'fantasy',
    name: '奇幻类',
    emoji: '🧙',
    description: '魔法设定、世界观、神秘元素',
    defaultTemplates: [
      'setting-consistency',   // 世界设定一致性
      'power-system',          // 能力体系检查
      'foreshadow-echo',       // 伏笔呼应
      'pacing-optimization',   // 节奏优化
      'dialogue-refine',       // 对话优化
    ],
    color: '#9370DB',
  },
  'science-fiction': {
    id: 'science-fiction',
    name: '科幻类',
    emoji: '🚀',
    description: '科学设定、未来背景、技术合理性',
    defaultTemplates: [
      'sci-fi-rationality',    // 科学合理性
      'technology-consistency', // 技术设定一致
      'worldbuilding',         // 世界建设
      'logic-check',           // 逻辑检查
      'exposition-balance',    // 科普叙述平衡
    ],
    color: '#1E90FF',
  },
  mystery: {
    id: 'mystery',
    name: '悬疑类',
    emoji: '🔍',
    description: '线索设置、逻辑严密、悬念营造',
    defaultTemplates: [
      'clue-tracking',         // 线索跟踪检查
      'logic-rigor',           // 逻辑严密性
      'suspense-buildup',      // 悬念营造
      'foreshadow-echo',       // 伏笔呼应
      'pacing-optimization',   // 节奏优化
    ],
    color: '#DC143C',
  },
  romance: {
    id: 'romance',
    name: '爱情类',
    emoji: '💕',
    description: '感情铺垫、细节温度、情感层级',
    defaultTemplates: [
      'emotion-pacing',        // 情感铺垫
      'character-interaction', // 角色互动
      'sensory-details',       // 感官细节
      'dialogue-emotion',      // 对话情感
      'atmosphere',            // 氛围烘托
    ],
    color: '#FF69B4',
  },
  'web-novel': {
    id: 'web-novel',
    name: '网络文学',
    emoji: '⚡',
    description: '爽点打磨、升级节奏、网文特色',
    defaultTemplates: [
      'highlight-boost',       // 爽点提升
      'pacing-optimization',   // 节奏优化
      'power-progression',     // 升级节奏
      'action-description',    // 动作描写
      'dialogue-personality',  // 对话性格
    ],
    color: '#FF6347',
  },
  urban: {
    id: 'urban',
    name: '都市类',
    emoji: '🏙️',
    description: '现代背景、社会细节、人物关系',
    defaultTemplates: [
      'modern-authenticity',   // 现代真实性
      'relationship-dynamics', // 人物关系
      'dialogue-refine',       // 对话优化
      'emotional-resonance',   // 情感共鸣
      'logic-check',           // 逻辑检查
    ],
    color: '#4169E1',
  },
  action: {
    id: 'action',
    name: '动作冒险',
    emoji: '⚔️',
    description: '战斗场景、动作描写、冒险感',
    defaultTemplates: [
      'action-description',    // 动作描写
      'battle-logic',          // 战斗逻辑
      'tension-buildup',       // 紧张感营造
      'pacing-optimization',   // 节奏优化
      'highlight-boost',       // 爽点提升
    ],
    color: '#FF4500',
  },
  general: {
    id: 'general',
    name: '通用',
    emoji: '✍️',
    description: '适用所有类别的基础精修',
    defaultTemplates: [
      'pacing-optimization',   // 节奏优化
      'logic-check',           // 逻辑检查
      'dialogue-refine',       // 对话优化
      'atmosphere',            // 氛围烘托
      'grammar-style',         // 文笔打磨
    ],
    color: '#696969',
  },
};

/**
 * 获取某个类别的配置
 */
export function getCategoryConfig(category: NovelCategory): CategoryConfig {
  return NOVEL_CATEGORIES[category];
}

/**
 * 获取某个类别的默认模板ID列表
 */
export function getDefaultTemplatesForCategory(category: NovelCategory): string[] {
  return NOVEL_CATEGORIES[category].defaultTemplates;
}

/**
 * 获取所有类别列表
 */
export function getAllCategories(): CategoryConfig[] {
  return Object.values(NOVEL_CATEGORIES);
}
