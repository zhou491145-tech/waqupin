# Waqupin 示例配置和使用

## 基础示例

这个目录包含了 Waqupin 的使用示例。

### 1. 基础配置示例

参考 `../src/config/config.template.json` 进行配置。

### 2. 简单使用示例

创建一个基础的小说写作会话：

```python
# 这是一个伪代码示例，实际实现需要根据项目语言调整
# This is pseudo-code example, actual implementation needs to be adjusted based on project language

from waqupin import NovelWriter

# 初始化写作器
writer = NovelWriter(config_path="config.json")

# 设置小说基本信息
writer.set_novel_info(
    title="我的小说",
    genre="玄幻",
    main_characters=["主角A", "配角B"]
)

# 开始写作
chapter = writer.write_chapter(
    prompt="请写第一章，介绍主角的出场",
    constraints=["字数3000字左右", "营造神秘氛围"]
)

print(chapter)
```

### 3. 记忆管理示例

使用记忆系统保持小说连贯性：

```python
# 添加重要情节到记忆
writer.add_memory(
    event_type="plot_point",
    content="主角获得了神秘宝物",
    importance=0.9
)

# 添加角色信息
writer.add_memory(
    event_type="character",
    content="主角：张三，20岁，性格内向但坚定",
    importance=1.0
)

# 查询相关记忆
related_memories = writer.query_memory("宝物")
```

### 4. 仿写功能示例

基于参考小说进行仿写：

```python
# 加载参考小说
writer.load_reference_novel("./references/example_novel.txt")

# 设置仿写风格
writer.set_imitation_style(
    style_elements=["叙述节奏", "对话风格"],
    intensity=0.7  # 仿写程度：0-1
)

# 生成仿写内容
chapter = writer.write_chapter(
    prompt="写一段战斗场景",
    use_reference_style=True
)
```

## 更多示例

更多高级用法和示例正在开发中，敬请期待！

## 注意事项

1. 请确保已正确配置 API 密钥
2. 首次使用时会创建必要的数据目录
3. 建议从小说大纲开始，逐步完善
