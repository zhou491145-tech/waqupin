#!/bin/bash
# VS Code 扩展缓存清除脚本（macOS/Linux）
# 用途：完全卸载旧版本插件并清除缓存

PLUGIN_NAME="zhou491145.ai-novel-writing-assistant"
VSCODE_EXT_DIR="$HOME/.vscode/extensions"
VSCODE_STORAGE="$HOME/.config/Code/User/globalStorage"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "         AI小说创作辅助系统 - VS Code 缓存清除工具"
echo "════════════════════════════════════════════════════════════════"
echo ""

echo "【第一步】查找并删除已安装的旧版本插件..."
echo ""

if ls -d "$VSCODE_EXT_DIR/$PLUGIN_NAME"-* 1> /dev/null 2>&1; then
    echo "✅ 发现旧版本插件，开始删除..."
    for dir in "$VSCODE_EXT_DIR/$PLUGIN_NAME"-*; do
        if [ -d "$dir" ]; then
            echo "   删除: $dir"
            rm -rf "$dir"
        fi
    done
    echo "✅ 旧版本插件已删除"
else
    echo "⚠️  未找到旧版本插件"
fi

echo ""
echo "【第二步】清除全局存储和缓存..."
echo ""

if [ -d "$VSCODE_STORAGE/$PLUGIN_NAME" ]; then
    echo "✅ 发现缓存数据，开始删除..."
    rm -rf "$VSCODE_STORAGE/$PLUGIN_NAME"
    echo "✅ 缓存已清除"
else
    echo "⚠️  未找到缓存数据"
fi

echo ""
echo "【第三步】清除扩展相关的临时文件..."
echo ""

if ls -d "$VSCODE_STORAGE/zhou491145"* 1> /dev/null 2>&1; then
    echo "✅ 发现相关存储，清除中..."
    for dir in "$VSCODE_STORAGE/zhou491145"*; do
        if [ -d "$dir" ]; then
            echo "   删除: $dir"
            rm -rf "$dir"
        fi
    done
    echo "✅ 相关存储已清除"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "清除完成！"
echo ""
echo "后续步骤："
echo "1. 完全关闭 VS Code（包括后台进程）"
echo "2. 等待 10 秒钟"
echo "3. 打开 VS Code"
echo "4. 在扩展商店搜索 \"AI小说创作辅助系统\" 或 \"ai-novel-writing\""
echo "5. 点击【安装】重新安装最新版本"
echo ""
echo "如果仍有问题，可以："
echo "- 删除 .vscode 文件夹（会重置所有扩展配置）"
echo "- 运行: rm -rf ~/.config/Code  （完全重置 VS Code）"
echo "════════════════════════════════════════════════════════════════"
echo ""
