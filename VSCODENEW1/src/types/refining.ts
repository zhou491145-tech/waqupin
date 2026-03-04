/**
 * 精修功能相关类型定义
 */

/** 小说类别 */
export type NovelCategory = 
  | 'historical'      // 历史类
  | 'fantasy'         // 奇幻类
  | 'science-fiction' // 科幻类
  | 'mystery'         // 悬疑类
  | 'romance'         // 爱情类
  | 'web-novel'       // 网络文学
  | 'urban'           // 都市类
  | 'action'          // 动作冒险
  | 'general';        // 通用

/** 精修提示词模板 */
export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: NovelCategory[];  // 适用的小说类别
  emoji: string;
  promptText: string;         // 发给AI的完整提示词
  focusPoints: string[];      // 重点检查项
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number;      // 预估耗时（秒）
  tags: string[];
  isSystemTemplate: boolean;  // 是否系统模板（不可修改）
  defaultSelected?: boolean;  // 该类别是否默认选中
}

/** 小说类别配置 */
export interface CategoryConfig {
  id: NovelCategory;
  name: string;
  emoji: string;
  description: string;
  defaultTemplates: string[];  // 该类别默认选择的模板ID
  color: string;
}

/** 精修请求 */
export interface RefiningRequest {
  chapterText: string;
  templateIds: string[];
  novelCategory: NovelCategory;
  options?: {
    keepStyle?: boolean;
    temperature?: number;
    maxTokens?: number;
  };
}

/** 精修结果 */
export interface RefiningResult {
  originalText: string;
  refinedText: string;
  changes: ChangeLog[];
  statistics: {
    originalLength: number;
    refinedLength: number;
    changeCount: number;
    estimatedTime: number;
  };
  timestamp: number;
}

/** 修改日志 */
export interface ChangeLog {
  type: 'add' | 'delete' | 'modify';
  position: number;
  original: string;
  refined: string;
  reason: string;
}

/** 用户偏好设置 */
export interface UserRefiningPreferences {
  favoriteCategory: NovelCategory;
  selectedTemplates: Map<NovelCategory, string[]>;
  autoMarkChanges: boolean;
  keepStyle: boolean;
}

/** AI精修响应 */
export interface RefiningResponse {
  content: string;
  tokens?: number;
  model?: string;
}
