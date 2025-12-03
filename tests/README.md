# 测试指南

## 测试结构

```
tests/
├── unit/           # 单元测试
├── integration/    # 集成测试
└── e2e/           # 端到端测试
```

## 运行测试

### Python 项目
```bash
# 安装测试依赖
pip install pytest pytest-cov

# 运行所有测试
pytest

# 运行特定测试文件
pytest tests/unit/test_memory.py

# 生成覆盖率报告
pytest --cov=src tests/
```

### Node.js 项目
```bash
# 安装测试依赖
npm install --save-dev jest

# 运行测试
npm test

# 运行覆盖率测试
npm test -- --coverage
```

## 测试要求

1. 所有新功能都应该有对应的单元测试
2. 核心功能需要集成测试
3. 主要用户流程需要端到端测试
4. 测试覆盖率应该保持在 80% 以上

## 编写测试

### 单元测试示例
```python
import unittest
from src.core.memory_manager import MemoryManager

class TestMemoryManager(unittest.TestCase):
    def setUp(self):
        self.memory = MemoryManager()
    
    def test_add_memory(self):
        result = self.memory.add("test_content", importance=0.8)
        self.assertTrue(result)
    
    def test_query_memory(self):
        self.memory.add("角色信息", importance=1.0)
        results = self.memory.query("角色")
        self.assertGreater(len(results), 0)
```

## 持续集成

项目使用 GitHub Actions 进行持续集成测试。每次 Pull Request 都会自动运行测试。
