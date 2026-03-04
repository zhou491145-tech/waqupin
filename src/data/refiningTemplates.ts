/**
 * 系统精修模板库 (25个不可修改的核心模板)
 * 
 * 设计原则：
 * 1. 每个模板都有明确的聚焦点
 * 2. 提示词包含具体的检查标准
 * 3. 适用于不同小说类别
 * 4. 难度和耗时差异化
 */

import { PromptTemplate, NovelCategory } from '../types/refining';

export const SYSTEM_TEMPLATES: Record<string, PromptTemplate> = {
  // ============ 节奏与结构类 (4个) ============
  
  'pacing-optimization': {
    id: 'pacing-optimization',
    name: '节奏优化',
    description: '优化叙事节奏，确保快慢搭配合理，阅读体验流畅',
    category: ['general', 'web-novel', 'mystery', 'action'],
    emoji: '⏱️',
    promptText: `【节奏优化精修方向】

检查并优化以下节奏要素：

1. **开篇节奏**：是否迅速进入主题（避免冗长铺垫）
2. **段落分布**：长短段落搭配是否合理（紧张用短句，舒缓用长句）
3. **快慢交替**：是否有紧张和缓和的节奏变化
4. **冗余删减**：删除重复描写和不必要的铺垫
5. **高潮充实**：关键情节是否描写充分，避免仓促
6. **结尾设计**：章节结尾是否留有余韵或悬念

修改原则：
- 快节奏场景：多用短句、动词、紧凑对话
- 慢节奏场景：可用环境描写、心理活动营造氛围
- 字数变化控制在 ±15% 以内
- 删除冗余但不删除必要信息`,
    focusPoints: ['快慢搭配', '段落长度', '高潮处理', '铺垫充分度'],
    difficulty: 'medium',
    estimatedTime: 120,
    tags: ['快速', '网文', '必选'],
    isSystemTemplate: true,
    defaultSelected: true,
  },

  'highlight-boost': {
    id: 'highlight-boost',
    name: '爽点提升',
    description: '强化故事的爽点和爆点，增加情感冲击力',
    category: ['web-novel', 'action', 'fantasy'],
    emoji: '💥',
    promptText: `【爽点提升精修方向】

识别并强化本章的核心爽点：

1. **爽点识别**：找出主角获胜、突破、反杀、获得认可等关键时刻
2. **细节强化**：爽点时刻的动作、神态、心理描写是否足够生动
3. **反差营造**：强化前后对比（之前的困境 vs 现在的胜利）
4. **铺垫检查**：胜利是否来之不易（困难体现是否充分）
5. **干扰删除**：删除分散注意力的无关描写
6. **情绪递进**：爽点前的压抑、爽点中的释放、爽点后的满足

强化技巧：
- 放慢时间：关键时刻用更多细节和慢动作
- 多角度：主角感受 + 旁观者反应 + 敌人震惊
- 数据支撑：用具体数字体现提升/差距
- 连续爽点：一波未平一波又起`,
    focusPoints: ['爽点识别', '细节强化', '反差对比', '困境体现'],
    difficulty: 'hard',
    estimatedTime: 150,
    tags: ['网文', '重点', '调性'],
    isSystemTemplate: true,
    defaultSelected: true,
  },

  'suspense-buildup': {
    id: 'suspense-buildup',
    name: '悬念营造',
    description: '强化悬念设置，增加翻页欲望和吸引力',
    category: ['mystery', 'general'],
    emoji: '❓',
    promptText: `【悬念营造精修方向】

优化悬念设置，让读者欲罢不能：

1. **悬念植入**：在适当位置埋下疑问和未解之谜
2. **信息控制**：适度揭露信息，保持神秘感（不要一次说完）
3. **多层悬念**：设置主悬念（贯穿全章）和小悬念（段落级别）
4. **时间压力**：强调倒计时或紧迫性
5. **意外转折**：在读者预期之外设置转折
6. **章节结尾**：必须有强力钩子（突然中断、意外揭露、新危机）

悬念技巧：
- 欲扬先抑：先不说关键，铺垫气氛
- 视角差异：角色知道但读者不知道（或反过来）
- 打断叙述：关键时刻突然切换视角或时间线
- 环境暗示：用细节暗示不寻常之处`,
    focusPoints: ['悬念设置', '信息节奏', '结尾钩子', '逻辑严密'],
    difficulty: 'hard',
    estimatedTime: 150,
    tags: ['悬疑', '重点'],
    isSystemTemplate: true,
    defaultSelected: false,
  },

  'tension-buildup': {
    id: 'tension-buildup',
    name: '紧张感营造',
    description: '强化紧张感和危机感，增加阅读的心理张力',
    category: ['action', 'mystery'],
    emoji: '😰',
    promptText: `【紧张感营造精修方向】

让读者感受压力和危险：

1. **危机设置**：危险真实、主角被动、后果严重（生死/失败/损失）
2. **压力来源**：倒计时、时间压缩、环境压抑、敌人强大、同伴危险
3. **物理细节**：心跳加速、呼吸急促、手心出汗、肌肉紧绷
4. **环境烘托**：压迫感场景、阴暗光线、刺耳声音、狭窄空间
5. **句式节奏**：多用短句、碎片化描写增加紧迫感

营造技巧：
- 信息不对称：角色不知危险近在眼前
- 多线并行：A线危机+B线倒计时同时推进
- 失败累积：小失误不断叠加
- 濒临崩溃：角色快撑不住的真实反应`,
    focusPoints: ['危机设置', '环境细节', '句子节奏', '角色反应'],
    difficulty: 'medium',
    estimatedTime: 120,
    tags: ['动作', '悬疑'],
    isSystemTemplate: true,
    defaultSelected: false,
  },

  // ============ 描写与细节类 (5个) ============

  'action-description': {
    id: 'action-description',
    name: '动作描写',
    description: '优化人物动作描写，增加清晰度和力度感',
    category: ['action', 'web-novel', 'fantasy'],
    emoji: '⚔️',
    promptText: `【动作描写精修方向】

让动作场景清晰有力、视觉化：

1. **具体化**：用精准动词代替笼统描述（不说"他冲了上去"，说"他一脚蹬地，身形暴起"）
2. **分解步骤**：复杂动作拆成小步骤（起手-发力-接触-收招）
3. **身体部位**：写明哪个部位怎么动（"右拳内旋，肘部收紧"）
4. **力度表现**：用声音、物理反馈体现力量（"骨骼咯吱作响"）
5. **物理逻辑**：动作符合重力、惯性、人体极限
6. **节奏控制**：快动作用短句，慢动作可详写细节

战斗场景要点：
- 攻守交替（不能只写一方）
- 环境互动（利用地形、物品）
- 连续性（前一招的收尾影响下一招）
- 视角稳定（不要突然变上帝视角）`,
    focusPoints: ['动词准确性', '动作顺序', '力度感', '视觉化'],
    difficulty: 'hard',
    estimatedTime: 180,
    tags: ['动作', '战斗'],
    isSystemTemplate: true,
    defaultSelected: false,
  },

  'dialogue-refine': {
    id: 'dialogue-refine',
    name: '对话优化',
    description: '优化人物对话，确保符合性格，自然流畅',
    category: ['general', 'urban', 'romance'],
    emoji: '💬',
    promptText: `【对话优化精修方向】

让对话真实可信、推动情节：

1. **人物声音**：不同角色用词、语气、口头禅差异化
2. **口语化**：删除书面语，用自然口语（"我去看一下"而非"我前去查看"）
3. **信息精炼**：删除无意义问候、客套，直奔主题
4. **动作穿插**：对话中插入神态、动作、停顿
5. **功能性**：每句对话必须推进情节或展现性格
6. **避免讲述**：不用对话灌输背景（角色不会说"你知道，三年前那次..."）

对话技巧：
- 打断与抢接（紧张时增加真实感）
- 沉默的力量（关键时刻少说多做）
- 问答错位（不直接回答，暗示潜台词）
- 简化标签（少用"他愤怒地说"，多用动作暗示）`,
    focusPoints: ['性格符合度', '自然度', '个性特色', '冗余删除'],
    difficulty: 'medium',
    estimatedTime: 140,
    tags: ['通用', '必选'],
    isSystemTemplate: true,
    defaultSelected: true,
  },

  'sensory-details': {
    id: 'sensory-details',
    name: '感官细节',
    description: '强化五感描写，增加代入感和沉浸感',
    category: ['romance', 'general', 'fantasy'],
    emoji: '👁️',
    promptText: `【感官细节强化方向】

让读者身临其境的五感描写：

1. **视觉**：颜色、光影、表情、氛围（不只说"很亮"，说"阳光透过窗帘洒下斑驳光影"）
2. **听觉**：声音质感和环境音（"沙哑的嗓音"、"远处的犬吠"）
3. **触觉**：温度、质地、接触感（"冰冷的门把手"、"粗糙的墙面"）
4. **嗅觉**：环境气味（"潮湿的霉味"、"淡淡的花香"）
5. **味觉**：食物或情绪（"苦涩的咖啡"、"嘴里泛起血腥味"）
6. **本体感**：心跳、呼吸、肌肉紧张

应用技巧：
- 每个场景至少用2-3种感官
- 关键时刻强化感官细节（如紧张时心跳、呼吸）
- 避免列举式堆砌，服务于情绪表达
- 感官描写带角色主观色彩`,
    focusPoints: ['五感均衡', '代入感', '沉浸度', '适度原则'],
    difficulty: 'medium',
    estimatedTime: 130,
    tags: ['爱情', '代入感'],
    isSystemTemplate: true,
    defaultSelected: false,
  },

  'atmosphere': {
    id: 'atmosphere',
    name: '氛围烘托',
    description: '强化场景的氛围营造，增强情感感染力',
    category: ['general', 'mystery', 'romance'],
    emoji: '🌫️',
    promptText: `【氛围烘托精修方向】

让环境为情感服务：

1. **情绪匹配**：环境与角色情绪呼应（悲伤→阴雨、欢快→明媚）
2. **细节筛选**：只保留支撑氛围的细节，删除无关描写
3. **渐进变化**：氛围随情节推进而变化（从温暖到压抑）
4. **意象运用**：用象征性物体强化氛围（枯叶、寒风、暖炉）
5. **避免生硬**：不直白说"他很难过，所以天变黑了"，自然融入

氛围类型技巧：
- 压抑：昏暗光线、狭小空间、沉闷声音
- 温暖：柔和光线、舒适温度、熟悉物品
- 恐怖：未知声音、突然变化、孤立感
- 浪漫：朦胧灯光、轻柔音乐、私密空间`,
    focusPoints: ['情感呼应', '细节选择', '层级感', '意象运用'],
    difficulty: 'hard',
    estimatedTime: 150,
    tags: ['氛围', '代入感'],
    isSystemTemplate: true,
    defaultSelected: false,
  },

  // ============ 逻辑与世观类 (6个) ============

  'logic-check': {
    id: 'logic-check',
    name: '逻辑自洽',
    description: '检查故事逻辑，确保因果关系清晰，无矛盾',
    category: ['general'],
    emoji: '🔗',
    promptText: `【逻辑自洽检查方向】

确保故事经得起推敲：

1. **因果关系**：事件发生必须有合理原因，结果与原因相符
2. **时间线**：事件顺序清晰，时间间隔合理（移动需要时间）
3. **人物动机**：角色行为符合性格设定和能力范围（避免OOC）
4. **空间逻辑**：地点、距离、移动路线合理可信
5. **前后一致**：与前文信息、世界观设定无矛盾
6. **能力边界**：角色突然用出超出设定的能力需要解释

检查要点：
- 删除无原因的突兀转折
- 补充必要的铺垫和过渡
- 修正时间/空间矛盾
- 确保角色行为有动机支撑`,
    focusPoints: ['因果关系', '时间线', '人物动机', '前后一致'],
    difficulty: 'hard',
    estimatedTime: 160,
    tags: ['逻辑', '严谨'],
    isSystemTemplate: true,
    defaultSelected: true,
  },

  'setting-consistency': {
    id: 'setting-consistency',
    name: '设定一致性',
    description: '检查魔法、能力、道具等设定的一致性',
    category: ['fantasy', 'science-fiction'],
    emoji: '⚙️',
    promptText: `【设定一致性检查方向】

确保设定前后统一、无矛盾：

1. **能力系统**：魔法/超能力使用方式、消耗代价、威力范围与前文一致
2. **道具属性**：武器/装备的功能、限制条件、耐久度保持稳定
3. **世界规则**：物理法则、魔法规律、禁忌规则不被随意打破
4. **实力等级**：角色战力符合当前等级，升级需合理铺垫
5. **环境背景**：地理、建筑、技术水平与时代设定吻合

检查要点：
- 能力突然变强/变弱无解释
- 道具属性与首次出场不符
- 违反世界观设定（如"不可能XX"却做到了）
- 前文说A城在东，后文变成西
- 等级制度、法律禁忌被忽视`,
    focusPoints: ['能力规则', '道具属性', '世界观', '升级合理性'],
    difficulty: 'hard',
    estimatedTime: 160,
    tags: ['奇幻', '科幻', '严谨'],
    isSystemTemplate: true,
    defaultSelected: false,
  },

  'foreshadow-echo': {
    id: 'foreshadow-echo',
    name: '伏笔呼应',
    description: '检查伏笔设置和呼应，确保完整和合理',
    category: ['mystery', 'general'],
    emoji: '🎭',
    promptText: `【伏笔呼应检查方向】

让伏笔铺得巧妙、收得惊喜：

1. **新伏笔设置**：读者可察觉但不突兀，时机恰当（冲突前、转折前）
2. **伏笔呼应**：意料之外情理之中，细节与伏笔对应（人物、物品、对话）
3. **伏笔层次**：表层+深层（首次看忽略，回顾时恍然大悟）
4. **可见度平衡**：不能太隐蔽（永远发现不了）也不能太明显（失去惊喜）
5. **伏笔追踪**：列出未揭示伏笔，标注预期揭示时机

设置技巧：
- 三次法则：重要伏笔出现3次（铺垫→强化→揭示）
- 分散注意：夹在日常对话/场景中不刻意强调
- 细节呼应：物品、台词、动作前后对应
- 重读价值：揭示后重看伏笔段落有新认知`,
    focusPoints: ['伏笔设置', '呼应合理性', '可见度平衡', '追踪完整'],
    difficulty: 'hard',
    estimatedTime: 160,
    tags: ['悬疑', '伏笔'],
    isSystemTemplate: true,
    defaultSelected: false,
  },

  'worldbuilding': {
    id: 'worldbuilding',
    name: '世界建设',
    description: '优化世界设定的呈现，让世界观更自然立体',
    category: ['fantasy', 'science-fiction'],
    emoji: '🌍',
    promptText: `【世界建设精修方向】

让世界观自然展现，不说教：

1. **展示优先**：用故事展示世界特色，不用角色讲解
2. **日常融入**：世界观通过角色日常行为、对话自然渗透
3. **环境代表性**：场景描写体现世界独特性（建筑、气候、生物）
4. **文化细节**：货币、称呼、礼仪、禁忌等细节建立世界感
5. **矛盾张力**：世界观设定本身带来的冲突和矛盾

世界建设技巧：
- 冰山原理：只展示10%，暗示90%的深度
- 视角限制：角色只知道他该知道的
- 陌生化：熟悉事物的异世界版本
- 细节堆积：用小细节（货币、称呼、礼仪）建立世界感`,
    focusPoints: ['特色体现', '信息自然度', '环境代表性', '文化呈现'],
    difficulty: 'hard',
    estimatedTime: 170,
    tags: ['奇幻', '科幻'],
    isSystemTemplate: true,
    defaultSelected: false,
  },

  // ============ 表达与文笔类 (4个) ============

  'grammar-style': {
    id: 'grammar-style',
    name: '文笔打磨',
    description: '修正表达、优化词汇、提升文采',
    category: ['general'],
    emoji: '✨',
    promptText: `【文笔打磨精修方向】

提升表达质量和文学性：

1. **错误纠正**：修正错别字、语法错误、标点符号
2. **词汇精准**：用更准确的词（避免"大词小用""小词大用"）
3. **去重复**：同段落避免重复词汇，用同义词替换
4. **句式多样**：长短句搭配，避免单调
5. **自然表达**：删除翻译腔、生硬排比，符合汉语习惯
6. **文采提升**：用意象、比喻优化平白表达

打磨技巧：
- 动词优先：少用"进行XX"，多用直接动词
- 删除废话：删除"可以说""事实上"等无意义词
- 具体化：少用抽象词（"情况""方面"），多用具体描述
- 节奏感：通过句长变化控制阅读节奏`,
    focusPoints: ['词汇准确性', '句式多样性', '错别字修正', '文采提升'],
    difficulty: 'medium',
    estimatedTime: 140,
    tags: ['通用', '必选'],
    isSystemTemplate: true,
    defaultSelected: true,
  },

  'dialogue-personality': {
    id: 'dialogue-personality',
    name: '对话性格',
    description: '突出人物的性格特色，增强对话的个性',
    category: ['general', 'web-novel'],
    emoji: '🎭',
    promptText: `【对话性格强化方向】

让对话透露性格、人物有声音辨识度：

1. **说话特色**：词汇选择、口头禅、句式习惯反映身份和性格
2. **性格体现**：急躁→短句、打断；温柔→舒缓语气；聪慧→言简意赅、一针见血
3. **对话标签多样化**：少用"说""问"，多用动作穿插（"他扬起眉毛"代替"他惊讶地问"）
4. **音调语速**：描写语速、音量、语调变化（低语/怒吼/轻笑）
5. **辨识度测试**：去掉名字仍能从对话判断是谁

差异化技巧：
- 教育差异：受教育高→完整句式；草根→省略、方言
- 职业习惯：军人→命令式；学者→专业术语
- 年龄代际：老人→"你们这些年轻人"；少年→流行语
- 性格极端化：让特质更明显（沉默寡言的能少说绝不多说）`,
    focusPoints: ['说话特色', '性格体现', '动作穿插', '对话标签'],
    difficulty: 'medium',
    estimatedTime: 130,
    tags: ['人物', '对话'],
    isSystemTemplate: true,
    defaultSelected: false,
  },

  'exposition-balance': {
    id: 'exposition-balance',
    name: '科普平衡',
    description: '平衡科学解释与故事节奏，避免生硬科普',
    category: ['science-fiction'],
    emoji: '🔬',
    promptText: `【科普平衡精修方向】

让科学设定自然融入，不打断节奏：

1. **科普分散**：避免长段连续科普，分散到多个场景中
2. **展示优先**：能通过行动展示的不用语言解释（"演示实验"胜过"讲解原理"）
3. **对话交代**：通过角色自然对话引入科学知识（提问-解答）
4. **必要性筛选**：只解释影响情节理解的科学点，技术细节可模糊
5. **讲解者匹配**：专家身份合理性（科学家讲专业，外行问常识）

科普技巧：
- 类比法：用生活常识类比专业概念（"量子纠缠就像双胞胎心灵感应"）
- 术语控制：每段最多2-3个专业术语，配通俗解释
- 情节结合：科普融入冲突（"必须在3分钟内完成核聚变，否则..."）
- 角色反应：用外行角色的困惑、惊叹自然引出解释`,
    focusPoints: ['科普分散', '讲解方式', '信息必要性', '术语密度'],
    difficulty: 'hard',
    estimatedTime: 150,
    tags: ['科幻', '平衡'],
    isSystemTemplate: true,
    defaultSelected: false,
  },

  'emotion-expression': {
    id: 'emotion-expression',
    name: '情感表达',
    description: '优化情感表现，增强感染力和真实度',
    category: ['romance', 'general'],
    emoji: '💖',
    promptText: `【情感表达精修方向】

让情感真实动人、有感染力：

1. **真实度**：情感符合人物性格和处境（避免作秀或过度抑制）
2. **层次感**：强烈与微妙交织，情感有递进和转变
3. **表现手段**：少用"心想""感到"，多用动作、对话、生理反应
4. **细微描写**：捕捉矛盾情感（"不知道自己在想什么"的真实感）
5. **情节结合**：情感转变由情节引起，有充分铺垫

表达技巧：
- 身体语言：脸红、心跳、呼吸、手抖
- 环境映射：情感通过对环境的感知体现
- 意识流：短句式内心独白表现混乱情绪
- 留白：不说破，让读者体会`,
    focusPoints: ['真实度', '层次感', '表现手段', '细微描写'],
    difficulty: 'hard',
    estimatedTime: 140,
    tags: ['情感', '人物'],
    isSystemTemplate: true,
    defaultSelected: false,
  },

  'history-authenticity': {
    id: 'history-authenticity',
    name: '历史真实性',
    description: '检查历史背景的准确性，避免常见历史错误',
    category: ['historical'],
    emoji: '📜',
    promptText: `【历史真实性检查方向】

避免历史错误，保持基本准确：

1. **时代背景**：物质文明、服饰、建筑、工具符合时代
2. **历史人物**：真实人物的身份、性格、年龄、时间线基本符合
3. **历史事件**：重大事件不冲突，虚拟情节与真实历史自然融合
4. **社会风俗**：日常生活、礼仪、风俗、忌讳、等级体系准确
5. **文化背景**：宗教、哲学、价值观、语言风格得当

检查重点：
- 常见错误：唐朝用椅子、宋朝吃辣椒、清朝称"陛下"
- 细节查证：官职、货币、计量单位、称呼
- 虚实结合：可虚拟情节，但符合历史框架`,
    focusPoints: ['时代准确', '人物真实', '风俗准确', '文化恰当'],
    difficulty: 'hard',
    estimatedTime: 150,
    tags: ['历史', '严谨'],
    isSystemTemplate: true,
    defaultSelected: false,
  },

  'historical-atmosphere': {
    id: 'historical-atmosphere',
    name: '历史氛围',
    description: '强化历史感和时代氛围，让读者沉浸其中',
    category: ['historical'],
    emoji: '🏯',
    promptText: `【历史氛围强化方向】

营造沉浸式历史感：

1. **环境时代感**：建筑、街道、景物体现时代特色
2. **生活细节**：衣食住行、用品工具、行为习惯符合时代
3. **语言风格**：适度古文气息、时代特色表述（不过度文言）
4. **社会结构**：等级、权力关系、时代特有冲突
5. **心理时代感**：价值观、世界观符合时代

营造技巧：
- 色彩调性：冷调古旧感（青灰、暗黄）
- 沧桑感：残破、斑驳、岁月痕迹
- 仪式感：礼仪、称呼、行为规范
- 对比：古今差异暗示（不直说）`,
    focusPoints: ['环境时代感', '生活细节', '语言风格', '社会结构'],
    difficulty: 'hard',
    estimatedTime: 160,
    tags: ['历史', '氛围'],
    isSystemTemplate: true,
    defaultSelected: false,
  },

  'character-interaction': {
    id: 'character-interaction',
    name: '角色互动',
    description: '检查角色之间的互动，增强关系张力和化学反应',
    category: ['romance', 'general'],
    emoji: '👥',
    promptText: `【角色互动精修方向】

让人物关系更生动有张力：

1. **关系状态**：互动体现当前关系（陌生/试探/亲密/矛盾等）
2. **性格碰撞**：展现性格差异产生的化学反应或摩擦
3. **潜台词**：对话有言外之意，不全说透
4. **肢体语言**：动作、表情、距离感体现关系微妙变化
5. **情绪递进**：互动推动关系发展，有微妙进展

互动技巧：
- 对话错位：问非所答、打断、沉默的运用
- 细节捕捉：一方观察另一方的小动作、表情
- 距离变化：物理距离暗示心理距离
- 反差：说话内容与真实情感不一致`,
    focusPoints: ['关系体现', '性格碰撞', '潜台词', '肢体语言'],
    difficulty: 'hard',
    estimatedTime: 140,
    tags: ['人物', '关系'],
    isSystemTemplate: true,
    defaultSelected: false,
  },

  'power-progression': {
    id: 'power-progression',
    name: '升级节奏',
    description: '优化力量或能力的升级，确保节奏和合理性',
    category: ['web-novel', 'fantasy', 'action'],
    emoji: '📈',
    promptText: `【升级节奏精修方向】

让升级既合理又爽快：

1. **合理性**：升级有铺垫（历练、感悟、机缘），非无理由突破
2. **过程展示**：升级瞬间的身体反应、能力变化、感悟描写
3. **代价体现**：升级消耗资源、承受风险，避免轻松升级
4. **能力展示**：升级后立即展示新能力的威力（实战或测试）
5. **系统一致**：新能力符合既定能力体系和世界规则

升级爽点技巧：
- 时机：困境中突破（绝境爆发）或积累后质变
- 对比：升级前后实力对比展示
- 旁观者：他人震惊反应衬托
- 频率：保持稀缺感，避免升级疲劳`,
    focusPoints: ['升级合理性', '代价体现', '能力展示', '频率节奏'],
    difficulty: 'hard',
    estimatedTime: 140,
    tags: ['网文', '爽点'],
    isSystemTemplate: true,
    defaultSelected: false,
  },

  'clue-tracking': {
    id: 'clue-tracking',
    name: '线索跟踪',
    description: '检查悬疑线索的完整性和连贯性',
    category: ['mystery'],
    emoji: '🔎',
    promptText: `【线索跟踪检查方向】

让线索清晰可追踪：

1. **线索清单**：列出本章所有线索（新线索、线索进展、线索否定）
2. **连贯性**：本章线索与前文是否呼应，有无遗漏或矛盾
3. **显隐平衡**：明显线索引导推理，隐藏线索埋伏笔（二刷能发现）
4. **真假混合**：红鲱鱼（假线索）与真线索比例适当，不过度误导
5. **推理空间**：读者可凭线索推理，但不至于太明显

线索处理技巧：
- 三次法则：重要线索出现3次（引入→深化→揭示）
- 分散注意：重要线索夹在日常细节中
- 时间差：埋线索时不重点强调，揭示时回溯
- 真相碎片：真相分散在多条线索中需拼接`,
    focusPoints: ['线索清晰性', '逻辑连贯', '真假线索平衡', '推理空间'],
    difficulty: 'hard',
    estimatedTime: 170,
    tags: ['悬疑', '严谨'],
    isSystemTemplate: true,
    defaultSelected: false,
  },

  'sci-fi-rationality': {
    id: 'sci-fi-rationality',
    name: '科学合理性',
    description: '检查科幻设定的科学合理性和创意融合',
    category: ['science-fiction'],
    emoji: '🧬',
    promptText: `【科学合理性检查方向】

让科幻设定有说服力：

1. **科学基础**：涉及真实科学时准确（物理、化学、生物学原理）
2. **虚拟逻辑**：虚拟科技原理清晰，有明确能力边界和限制
3. **代价系统**：高科技有使用成本（能源、材料、寿命、副作用）
4. **技术一致**：科技发展水平统一，技术树逻辑自洽
5. **后果考量**：科技对环境、社会的长期影响

科幻写作技巧：
- 硬核度：专业术语适量，外行能理解核心概念
- 限制性：越强的能力限制越大（避免万能科技）
- 成本展示：使用科技的复杂过程、准备时间
- 常见错误：真空传声、太空爆炸有火焰、忽视惯性`,
    focusPoints: ['科学准确性', '科技逻辑', '代价平衡', '系统一致'],
    difficulty: 'hard',
    estimatedTime: 160,
    tags: ['科幻', '严谨'],
    isSystemTemplate: true,
    defaultSelected: false,
  },
};

/**
 * 获取所有系统模板
 */
export function getAllSystemTemplates(): PromptTemplate[] {
  return Object.values(SYSTEM_TEMPLATES);
}

/**
 * 通过ID获取模板
 */
export function getTemplateById(id: string): PromptTemplate | undefined {
  return SYSTEM_TEMPLATES[id];
}

/**
 * 通过分类获取模板
 */
export function getTemplatesByCategory(category: string): PromptTemplate[] {
  return Object.values(SYSTEM_TEMPLATES).filter(
    template => template.category.includes(category as any)
  );
}

/**
 * 获取模板总数
 */
export function getTemplateCount(): number {
  return Object.keys(SYSTEM_TEMPLATES).length;
}
