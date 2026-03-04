# 发布指南（简明）

1. 准备工作

- 在 Azure DevOps 中创建 Personal Access Token（Scopes -> Marketplace: Manage），并保存好 token。
- 在 Visual Studio Marketplace 管理页面创建或确认 `publisher`（与 `package.json` 中的 `publisher` 字段一致）。

2. 本地登录（在项目根目录）

```bash
vsce login zhou491145
# 在提示时粘贴你的 Personal Access Token
```

3. 打包并发布

自动发布（登录后）：

```bash
# 自动自增 patch 并发布
vsce publish patch
```

手动打包并上传：

```bash
vsce package
# 然后在 https://marketplace.visualstudio.com/manage 上传生成的 .vsix
```

4. 常见问题

- 如果报 401/403，请确认 PAT 的 Organizations 选项选择了 "All accessible organizations"，并且 Scope 包含 Marketplace Manage。
- 请确保 `icon` 不是 SVG、README 中图片链接为 HTTPS。

5. 可选：CI 自动发布

- 推荐使用 GitHub Actions 或 Azure Pipelines，在 CI 中设置 `${{ secrets.VSCE_PAT }}` 并运行 `vsce publish`。
