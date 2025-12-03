# waqupin - AI 小说写作插件

本插件的初衷是让AI写小说时不跑偏不幻想能记住百万级小说创作的整个记忆！20几年书虫，失业想写小说试试，但是又懒，又没钱，就折腾了这个东西。负责任的告诉你我已经翻遍全网AI小说创作的工具和各种软件，都不太理性。不是不能符合我的要求就是太贵买不起，还有那种又贵又复杂的，也不知道谁在用。反正这个肯定能实现百万级的小说记忆，也能实现更多的限制规则。比如更多的提示词，让AI按照你需要的写作习惯用词用句等等！还能仿，也可以给AI喂小说数据，当然不是真正意义上的投喂大模型实现的，只是在写作时，AI可以读取更多的小说参考内容来实现仿写！

## 核心特性

- 🧠 **百万字记忆**: 支持百万字级别的小说创作记忆管理
- 🎯 **精确控制**: 通过约束规则确保AI不偏离主线
- ✍️ **风格定制**: 自定义提示词，控制写作习惯和用词
- 📚 **智能仿写**: 读取参考小说，实现风格仿写
- 🔄 **持续连贯**: 保持角色性格和情节的一致性

## 快速开始

### 安装

```bash
# 克隆仓库
git clone https://github.com/zhou491145-tech/waqupin.git
cd waqupin

# 安装依赖（根据您的技术栈选择）
# pip install -r requirements.txt  # Python
# npm install                       # Node.js
```

### 配置

1. 复制配置模板：
```bash
cp src/config/config.template.json config.json
```

2. 编辑 `config.json`，填入您的 API 密钥和偏好设置

### 使用示例

查看 [examples/](examples/README.md) 目录获取详细的使用示例。

## 项目结构

```
waqupin/
├── src/              # 源代码
│   ├── core/        # 核心模块（记忆管理、AI接口等）
│   ├── plugins/     # 插件扩展
│   ├── utils/       # 工具函数
│   └── config/      # 配置文件
├── docs/            # 文档
├── examples/        # 使用示例
├── tests/           # 测试代码
└── README.md        # 本文件
```

## 文档

- [项目设置指南](docs/SETUP.md) - 详细的项目设置和开发指南
- [贡献指南](CONTRIBUTING.md) - 如何为项目做出贡献
- [使用示例](examples/README.md) - 代码示例和用法说明

## 开发状态

⚠️ 本项目目前处于早期开发阶段，欢迎贡献代码和想法！

## 路线图

- [ ] 实现基础记忆管理系统
- [ ] 支持主流AI模型接口（OpenAI、Claude等）
- [ ] 实现写作约束和规则引擎
- [ ] 开发角色和情节追踪功能
- [ ] 实现参考小说分析和仿写功能
- [ ] 添加图形用户界面
- [ ] 性能优化和大规模测试

## 技术栈

- 后端：Python / Node.js（待确定）
- 数据存储：SQLite / PostgreSQL
- 向量数据库：用于语义搜索
- AI 接口：支持多种大语言模型

## 许可证

本项目采用 [MIT 许可证](LICENSE)。

## 联系方式

- 问题反馈：[GitHub Issues](https://github.com/zhou491145-tech/waqupin/issues)
- 讨论交流：欢迎提出建议和想法

---

💡 **提示**: 如果您在使用过程中有任何疑问，请查看 [docs/SETUP.md](docs/SETUP.md) 或创建一个 Issue。
