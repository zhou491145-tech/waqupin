# 🔧 快速故障排查指南

如果安装后插件面板无法显示，按照以下步骤操作：

## ⚡ 快速修复（5分钟）

### Step 1: 一键清除缓存 
**Windows:**
```powershell
# 直接双击运行
.\clean-vscode-cache.bat
```

**macOS/Linux:**
```bash
bash clean-vscode-cache.sh
```

### Step 2: 重启 VS Code
1. 完全关闭 VS Code（按 Alt+F4）
2. 等待 5 秒
3. 重新打开 VS Code

### Step 3: 检查面板
- 查看左侧活动栏，是否出现📚**书本图标**
- 点击后应该显示**导航面板**
- 侧边栏应该有三个标签页：
  - 📚 导航控制台
  - 🔐 激活验证
  - ✨ 文章精修

---

## 🔍 诊断步骤（如果快速修复不生效）

### 检查点 1: 插件是否安装
1. `Ctrl+Shift+X` 打开扩展面板
2. 搜索"AI小说创作"或"novelassistant"
3. 查看版本号（应为 3.0.8）

### 检查点 2: 查看插件日志
1. `Ctrl+J` 打开输出面板
2. 点击右侧下拉菜单，选择"AI小说创作辅助系统"
3. 查看是否有红色错误信息

**预期看到：**
```
📦 小说创作助手插件已激活
✅ 数据存储 V2（新仓库系统）已初始化
✅ 文章精修面板已注册
```

**常见错误：**
```
❌ Error: (code) 错误代码
⚠️ 导航视图已注册，跳过重复注册
```

### 检查点 3: 重新加载窗口
1. `Ctrl+Shift+P` 打开命令面板
2. 输入 `Developer: Reload Window`
3. 按 Enter

### 检查点 4: 禁用其他扩展
1. 打开扩展面板 `Ctrl+Shift+X`
2. 禁用所有其他扩展（除了此插件）
3. 重新加载窗口

---

## 🛠️ 高级故障排查

### 完全卸载并重新安装

**Windows:**
```powershell
# 方法1：使用我们提供的脚本
.\clean-vscode-cache.bat

# 方法2：手动删除
$ext = "$env:APPDATA\Code\User\extensions"
rm -r "$ext\zhou491145.ai-novel-writing-assistant-*"
rm -r "$env:APPDATA\Code\User\globalStorage\zhou491145*"
```

**macOS:**
```bash
# 方法1：使用我们提供的脚本
bash clean-vscode-cache.sh

# 方法2：手动删除
rm -rf ~/.vscode/extensions/zhou491145.ai-novel-writing-assistant-*
rm -rf ~/Library/Application\ Support/Code/User/globalStorage/zhou491145*
```

**Linux:**
```bash
# 方法1：使用我们提供的脚本
bash clean-vscode-cache.sh

# 方法2：手动删除
rm -rf ~/.vscode/extensions/zhou491145.ai-novel-writing-assistant-*
rm -rf ~/.config/Code/User/globalStorage/zhou491145*
```

然后：
1. 重启 VS Code
2. 在扩展商店重新安装

### 完全重置 VS Code（核选项）

⚠️ **警告：这会重置所有 VS Code 设置和扩展！**

**Windows:**
```powershell
# 备份重要设置后运行：
rmdir /s /q "$env:APPDATA\Code"

# 或者（保留设置）：
rmdir /s /q "$env:APPDATA\Code\User\extensions"
rmdir /s /q "$env:APPDATA\Code\User\globalStorage"
```

**macOS:**
```bash
rm -rf ~/Library/Application\ Support/Code
# 或
rm -rf ~/.vscode/extensions
rm -rf ~/Library/Application\ Support/Code/User/globalStorage
```

**Linux:**
```bash
rm -rf ~/.config/Code
# 或
rm -rf ~/.vscode/extensions
rm -rf ~/.config/Code/User/globalStorage
```

---

## 📊 系统信息收集（报告问题时需要）

如果问题仍未解决，请收集以下信息：

```powershell
# Windows - 收集诊断信息
Write-Host "VS Code 版本: $(code --version)"
Write-Host "系统: Windows"
Write-Host "用户: $env:USERNAME"
Write-Host ""
Write-Host "插件位置:"
ls "$env:APPDATA\Code\User\extensions" | grep zhou
```

```bash
# macOS/Linux
echo "VS Code 版本: $(code --version)"
uname -a
echo ""
echo "插件位置:"
ls ~/.vscode/extensions | grep zhou
```

输出样例：
```
VS Code 版本: 1.96.0
         ...（其他信息）
系统: Windows 10 22H2
用户: yourname

插件位置:
zhou491145.ai-novel-writing-assistant-3.0.8
```

---

## ❓ 常见问题

### Q: 为什么 F5 调试时能看到面板，但安装后看不到？
**A:** 这通常是 VS Code 缓存导致的。运行清除脚本后重启 VS Code。

### Q: 清除缓存后还是不行怎么办？
**A:** 
1. 检查日志（Ctrl+J）看是否有错误
2. 在命令面板运行 `Developer: Toggle Developer Tools`
3. 查看 Console 标签页的报错信息
4. 完全卸载后重新安装

### Q: 删除缓存会丢失我的数据吗？
**A:** 不会。小说创作数据存储在工作目录的 `.novel-assistant` 文件夹中，删除 VS Code 缓存不会影响这些数据。

### Q: 可以同时装多个版本吗？
**A:** 不能。一个账号（publisher）只能有一个版本。卸载旧版本后再安装新版本。

### Q: 激活面板无法验证怎么办？
**A:** 
1. 检查网络连接
2. 验证激活服务器地址配置正确
3. 确认激活码格式正确
4. 查看日志获取更多错误信息

---

## 📞 仍需帮助？

如果以上步骤都不奏效，请提供以下信息以便诊断：

1. **VS Code 版本** - `Help > About`
2. **插件版本** - 扩展面板中查看
3. **操作系统** - Windows/macOS/Linux 及版本号
4. **错误日志** - `Ctrl+J` 的输出面板内容
5. **日志文件** - `%APPDATA%\Code\logs\` (Windows) 或类似位置
6. **重现步骤** - 具体做什么时出现问题

---

## ✅ 验证清单

问题解决后，确认以下事项：

- [ ] 左侧活动栏有📚书本图标
- [ ] 点击后侧边栏显示三个标签页
- [ ] 导航控制台加载完毕（显示各个功能）
- [ ] 激活验证页面能显示机器码
- [ ] 能够输入激活码
- [ ] 控制台输出 "📦 小说创作助手插件已激活"
- [ ] F5 调试和安装版表现一致

---

**最后更新**: 2026年1月10日  
**诊断工具版本**: v1.0
