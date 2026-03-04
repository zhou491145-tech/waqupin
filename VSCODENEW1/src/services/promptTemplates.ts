/**
 * 提示词模板定义
 * 包含所有系统默认的提示词模板
 */

export interface PromptTemplate {
  key: string;
  name: string;
  category: string;
  description: string;
  content: string;
  parameters: string[];
}

export const PROMPT_CATEGORIES = {
  WORLD_BUILDING: '世界构建',
  CHARACTER: '角色生成',
  OUTLINE: '大纲生成',
  CHAPTER: '章节创作',
  ANALYSIS: '情节分析',
  REWRITE: '章节重写',
  AUXILIARY: '辅助功能'
};

/**
 * 系统默认提示词模板
 */
export const SYSTEM_PROMPTS: PromptTemplate[] = [
  {
    key: 'CHAPTER_GENERATION_SIMPLE',
    name: '基础章节生成',
    category: PROMPT_CATEGORIES.CHAPTER,
    description: '根据大纲创作章节内容的基础模板',
    content: `你是专业的小说创作助手，擅长根据上下文和大纲创作章节。

请根据以下信息创作本章内容：

项目信息：
- 书名：{title}
- 主题：{theme}
- 类型：{genre}
- 叙事视角：{narrative_perspective}

世界观：
- 时间背景：{time_period}
- 地理位置：{location}
- 氛围基调：{atmosphere}
- 世界规则：{rules}

角色信息：
{characters_info}

本章信息：
- 章节序号：第{chapter_number}章
- 章节标题：{chapter_title}
- 章节大纲：{chapter_outline}
- 本章目标：{chapter_goal}

创作要求：
1. 严格按照大纲内容展开情节
2. 保持与前后章节的连贯性
3. 符合角色性格设定
4. 体现世界观特色
5. 使用{narrative_perspective}视角
6. 字数要求：目标{target_word_count}字，不得低于{target_word_count}字
7. 语言自然流畅，避免AI痕迹

请直接输出章节正文内容，不要包含章节标题和其他说明文字。`,
    parameters: ['title', 'theme', 'genre', 'narrative_perspective', 'time_period', 'location', 
                'atmosphere', 'rules', 'characters_info', 'chapter_number', 'chapter_title', 
                'chapter_outline', 'chapter_goal', 'target_word_count']
  },
  {
    key: 'CHAPTER_GENERATION_WITH_CONTEXT',
    name: '章节创作（带上下文）',
    category: PROMPT_CATEGORIES.CHAPTER,
    description: '基于前置章节内容创作新章节',
    content: `你是一位专业的小说作家。请根据以下信息创作本章内容：

项目信息：
- 书名：{title}
- 主题：{theme}
- 类型：{genre}
- 叙事视角：{narrative_perspective}

世界观：
- 时间背景：{time_period}
- 地理位置：{location}
- 氛围基调：{atmosphere}
- 世界规则：{rules}

角色信息：
{characters_info}

【已完成的前置章节内容】
{previous_content}

本章信息：
- 章节序号：第{chapter_number}章
- 章节标题：{chapter_title}
- 章节大纲：{chapter_outline}
- 本章目标：{chapter_goal}

创作要求：
1. **剧情连贯性（最重要）**：
   - 必须承接前面章节的剧情发展
   - 注意角色状态、情节进展、时间线的连续性
   - 不能出现与前文矛盾的内容
   - 自然过渡，避免突兀的跳跃

2. **防止内容重复（关键）**：
   - 仔细阅读【上一章结尾内容】，绝对不要重复叙述已经发生的事件
   - 本章必须从新的情节点开始，不要重新描述上一章的场景或对话
   - 如果上一章以某个动作或对话结束，本章应该从紧接着的下一个动作或反应开始

3. **情节推进**：
   - 严格按照本章大纲展开情节
   - 推动故事向前发展，不要原地踏步
   - 确保本章有独特的叙事价值

4. **角色一致性**：
   - 符合角色性格设定
   - 延续角色在前文中的成长和变化

5. **写作风格**：
   - 使用{narrative_perspective}视角
   - 字数要求：目标{target_word_count}字，不得低于{target_word_count}字
   - 语言自然流畅，避免AI痕迹

请直接输出章节正文内容，不要包含章节标题和其他说明文字。`,
    parameters: ['title', 'theme', 'genre', 'narrative_perspective', 'time_period', 'location',
                'atmosphere', 'rules', 'characters_info', 'previous_content', 'chapter_number',
                'chapter_title', 'chapter_outline', 'chapter_goal', 'target_word_count']
  },
  {
    key: 'CHAPTER_ANALYSIS',
    name: '章节分析',
    category: PROMPT_CATEGORIES.ANALYSIS,
    description: '深度分析章节内容，提取伏笔、钩子、情节点等',
    content: `你是一位专业的小说编辑和剧情分析师。请深度分析以下章节内容：

**章节信息:**
- 章节: 第{chapter_number}章
- 标题: {title}
- 字数: {word_count}字

**章节内容:**
{content}

---

**分析任务:**
请从专业编辑的角度,全面分析这一章节:

### 1. 剧情钩子 (Hooks) - 吸引读者的元素
识别能够吸引读者继续阅读的关键元素:
- **悬念钩子**: 未解之谜、疑问、谜团
- **情感钩子**: 引发共鸣的情感点
- **冲突钩子**: 矛盾对抗、紧张局势
- **认知钩子**: 颠覆认知的信息、惊人真相

每个钩子需要:
- 类型分类
- 具体内容描述
- 强度评分(1-10)
- 出现位置(开头/中段/结尾)

### 2. 伏笔分析 (Foreshadowing)
- **埋下的新伏笔**: 描述内容、预期作用、隐藏程度(1-10)
- **回收的旧伏笔**: 呼应哪一章、回收效果评分
- **伏笔质量**: 巧妙性和合理性评估

### 3. 冲突分析 (Conflict)
- 冲突类型: 人与人/人与己/人与环境/人与社会
- 冲突各方及其立场
- 冲突强度评分(1-10)

### 4. 情感曲线 (Emotional Arc)
- 主导情绪: 紧张/温馨/悲伤/激昂/平静等
- 情感强度(1-10)
- 情绪变化轨迹描述

### 5. 角色状态追踪
对每个出场角色分析:
- 心理状态变化(前→后)
- 关系变化
- 关键行动和决策

### 6. 关键情节点
列出3-5个核心情节点:
- 情节内容
- 类型(revelation/conflict/resolution/transition)
- 重要性(0.0-1.0)

### 7. 改进建议
提供3-5条具体的改进建议

**重要：必须返回标准JSON格式，字段名必须是英文，格式如下：**

{
  "hooks": [
    {
      "type": "suspense|emotion|conflict|cognitive",
      "content": "具体内容描述",
      "strength": 9,
      "position": "开头|中段|结尾"
    }
  ],
  "foreshadows": [
    {
      "content": "伏笔描述",
      "type": "planted|resolved",
      "strength": 8,
      "subtlety": 7,
      "keyword": "关键词"
    }
  ],
  "plot_points": [
    {
      "content": "情节点内容",
      "type": "revelation|conflict|resolution|transition",
      "importance": 0.8,
      "impact": "影响描述"
    }
  ],
  "character_states": [
    {
      "character_name": "角色名",
      "state_before": "状态前",
      "state_after": "状态后",
      "psychological_change": "心理变化",
      "key_event": "关键事件"
    }
  ],
  "conflict": {
    "types": ["人与人", "人与己"],
    "parties": ["甲方", "乙方"],
    "level": 8,
    "description": "冲突描述",
    "resolution_progress": 0.5
  },
  "emotional_arc": {
    "primary_emotion": "紧张",
    "intensity": 8,
    "secondary_emotions": ["恐惧", "愤怒"]
  },
  "scores": {
    "overall": 8,
    "pacing": 7,
    "engagement": 9,
    "coherence": 8
  },
  "summary": "章节摘要",
  "suggestions": ["建议1", "建议2", "建议3"]
}

请严格按照上述JSON结构返回，不要使用中文作为键名。`,
    parameters: ['chapter_number', 'title', 'content', 'word_count']
  },
  {
    key: 'FORESHADOW_EXTRACTION',
    name: '伏笔提取',
    category: PROMPT_CATEGORIES.ANALYSIS,
    description: '从章节中提取伏笔信息',
    content: `你是专业的剧情分析师。请从以下章节中提取所有伏笔：

章节：第{chapter_number}章
内容：
{content}

请识别：
1. **埋下的伏笔**：
   - 伏笔内容描述
   - 预期在哪一章回收
   - 重要性等级(1-10)
   - 隐藏程度(1-10，10表示非常隐蔽)

2. **回收的伏笔**：
   - 回收了哪个伏笔
   - 埋设在第几章
   - 回收效果评分(1-10)

以JSON格式输出：
{
  "planted": [
    {
      "content": "伏笔描述",
      "expectedChapter": 预期章节号,
      "importance": 重要性,
      "subtlety": 隐蔽度
    }
  ],
  "resolved": [
    {
      "content": "回收描述",
      "plantedChapter": 埋设章节,
      "effectiveness": 效果评分
    }
  ]
}`,
    parameters: ['chapter_number', 'content']
  },
  {
    key: 'SUMMARY_GENERATION',
    name: '章节摘要生成',
    category: PROMPT_CATEGORIES.ANALYSIS,
    description: '生成章节摘要',
    content: `请为以下章节生成摘要：

章节：第{chapter_number}章
标题：{title}
内容：
{content}

请生成：
1. **简短摘要** (50-100字)：概括本章核心剧情
2. **详细摘要** (200-300字)：包含主要事件、角色互动、关键转折
3. **关键词** (3-5个)：代表本章的核心元素

以JSON格式输出：
{
  "brief": "简短摘要",
  "detailed": "详细摘要",
  "keywords": ["关键词1", "关键词2", "关键词3"]
}`,
    parameters: ['chapter_number', 'title', 'content']
  },
  {
    key: 'AI_DENOISING',
    name: 'AI去味',
    category: PROMPT_CATEGORIES.AUXILIARY,
    description: '将AI生成的文本改写得更自然',
    content: `你是一位追求自然写作风格的编辑。你的任务是将AI生成的文本改写得更像人类作家的手笔。

原文：
{original_text}

修改要求：
1. 去除AI痕迹：
   - 删除过于工整的排比句
   - 减少重复的修辞手法
   - 去掉刻意的对称结构
   - 避免机械式的总结陈词

2. 增加人性化：
   - 使用更口语化的表达
   - 添加不完美的细节
   - 保留适度的随意性
   - 增加真实的情感波动

3. 优化叙事：
   - 让节奏更自然不做作
   - 用简单词汇替换华丽辞藻
   - 保持叙述的松弛感
   - 让对话更生活化

4. 保持原意：
   - 不改变核心情节
   - 保留关键信息点
   - 维持角色性格
   - 确保逻辑连贯

修改风格：
- 像是一个喜欢讲故事的普通人写的
- 有点粗糙但很真诚
- 自然流畅不刻意
- 让人读起来很舒服

请直接输出修改后的文本，无需解释。`,
    parameters: ['original_text']
  },
  {
    key: 'WORLD_BUILDING',
    name: '世界观构建',
    category: PROMPT_CATEGORIES.WORLD_BUILDING,
    description: '基于项目信息生成世界观设定',
    content: `你是一位资深的世界观设计师。基于以下输入信息，构建一个高度原创、深度自洽、充满戏剧冲突的小说世界观。

# 输入信息
书名：{title}
主题：{theme}
类型：{genre}
简介：{description}

# 核心要求
* **简介契合性**：世界观设定必须能够支撑简介中描述的故事情节和核心矛盾
* **类型适配性**：世界观必须符合小说类型的特征
* **主题贴合性**：时代背景要能有效支撑和体现小说主题
* **原创性**：在类型框架内发挥创意，创造独特但合理的世界设定
* **具象化**：避免空洞概念，用具体可感的细节描述世界
* **逻辑自洽**：确保所有设定相互支撑，形成完整体系

# 输出要求
生成包含以下四个字段的JSON对象，每个字段用300-500字的连贯段落描述：

1. **time_period**（时间背景与社会状态）
   - 根据类型和主题，设定合适规模的时间背景
   - 阐明时代核心矛盾和社会焦虑

2. **location**（空间环境与地理特征）
   - 描绘故事主要发生的空间环境
   - 说明环境如何影响居民的生存方式

3. **atmosphere**（感官体验与情感基调）
   - 描述身临其境的感官细节
   - 阐述世界的美学风格和色彩基调

4. **rules**（世界规则与社会结构）
   - 阐明世界运行的核心法则和底层逻辑
   - 描述权力结构和利益格局

请以纯JSON格式输出，不要包含markdown标记。`,
    parameters: ['title', 'theme', 'genre', 'description']
  },
  {
    key: 'CHARACTER_GENERATION',
    name: '角色生成',
    category: PROMPT_CATEGORIES.CHARACTER,
    description: '生成单个角色的详细设定',
    content: `你是一位专业的角色设定师。请根据以下信息创建一个立体饱满的小说角色。

项目上下文：
{project_context}

用户需求：
{user_input}

请生成一个完整的角色卡片，包含：

1. **基本信息**：姓名、年龄、性别
2. **外貌特征** (100-150字)
3. **性格特点** (150-200字)：核心性格、优缺点、特殊习惯
4. **背景故事** (200-300字)：家庭背景、成长经历、重要转折
5. **人际关系**：与其他角色的关系
6. **特殊能力/特长**

请以JSON格式输出角色信息。`,
    parameters: ['project_context', 'user_input']
  }
];

/**
 * 格式化提示词模板
 * @param template 模板内容
 * @param params 参数对象
 * @returns 格式化后的提示词
 */
export function formatPrompt(template: string, params: Record<string, any>): string {
  let result = template;
  for (const [key, value] of Object.entries(params)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, String(value || ''));
  }
  return result;
}

/**
 * 根据key获取系统模板
 */
export function getSystemPrompt(key: string): PromptTemplate | undefined {
  return SYSTEM_PROMPTS.find(p => p.key === key);
}

/**
 * 根据分类获取模板
 */
export function getPromptsByCategory(category: string): PromptTemplate[] {
  return SYSTEM_PROMPTS.filter(p => p.category === category);
}
