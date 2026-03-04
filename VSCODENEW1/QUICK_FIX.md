# 🚀 快速修复 - 面板显示问题

## ⚡ 30秒快速解决

### Step 1: 清除缓存并卸载
```powershell
# Windows 用户，直接双击运行
clean-vscode-cache.bat

# macOS/Linux 用户，运行
bash clean-vscode-cache.sh
```

**等待脚本完成**（会显示 ✅ 清除完成）

### Step 2: 重启 VS Code
- 完全关闭 VS Code（按 Alt+F4）
- 等待 5-10 秒
- 重新打开 VS Code

### Step 3: 重新安装新版本
**方式 A: 从文件安装（最推荐）**
```
1. Ctrl+Shift+P
2. 输入: Install from VSIX
3. 选择: ai-novel-writing-assistant-3.0.8.vsix
4. 等待安装完成
```

**方式 B: 从商店安装**
```
1. Ctrl+Shift+X
2. 搜索: "AI小说创作"
3. 点击安装
```

### Step 4: 验证成功

- ✅ 看到左侧 📚 书本图标？
- ✅ 点击后侧边栏有内容？
- ✅ 看到激活提示？（或侧边栏显示"🔐 激活验证"）

**如果都是 ✅，问题已解决！**

---

## ❓ 如果还是不行

### 检查 1: 查看日志
```
Ctrl+J → 右侧下拉 → "AI小说创作辅助系统" 
→ 查找红色错误
```

### 检查 2: 运行诊断
```powershell
# Windows
.\diagnose-plugin.bat

# macOS/Linux
bash diagnose-plugin.bat
```

### 检查 3: 完全重置
```powershell
# 删除所有 VS Code 配置（慎用！）
rmdir /s /q "%APPDATA%\Code"

# 重启 VS Code，重新安装插件
```

---

## 📝 修复说明

**原因**: 插件激活流程在同步运行，导致面板加载被阻塞  
**修复**: 将激活步骤改为异步运行，面板优先显示  
**结果**: 面板始终显示，即使激活失败也有提示  

**更多详细信息见**: `FIX_PANEL_DISPLAY_ISSUE.md`

---

**版本**: 3.0.8 修复版  
**状态**: ✅ 可安装使用
