# Waqupin 核心模块

这个目录包含 Waqupin 的核心功能模块。

## 模块说明

### memory_manager.py / memory_manager.js
记忆管理系统，负责：
- 存储和检索小说情节、角色信息
- 管理上下文记忆
- 提供语义搜索功能

### ai_interface.py / ai_interface.js  
AI 接口模块，负责：
- 与各种 AI 模型通信
- 管理提示词和上下文
- 处理 AI 响应

### novel_writer.py / novel_writer.js
小说写作主类，负责：
- 协调各个模块工作
- 管理写作流程
- 应用写作规则和约束

### content_storage.py / content_storage.js
内容存储模块，负责：
- 保存生成的小说内容
- 管理章节和段落
- 提供内容检索功能

## 开发计划

- [ ] 实现基础的记忆管理功能
- [ ] 实现 AI 模型接口适配
- [ ] 实现小说内容存储
- [ ] 实现写作约束和规则引擎
- [ ] 优化性能和内存使用

## 使用说明

具体使用方法请参考 `/examples` 目录中的示例代码。
