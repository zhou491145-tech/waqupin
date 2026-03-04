// VSCode API 封装
// 用于在非VSCode环境下提供mock实现，便于测试

let vscode: any = null;

try {
  // 尝试在VSCode环境中加载vscode模块
  vscode = require('vscode');
} catch (error) {
  // 在非VSCode环境下，提供mock实现
  vscode = {
    workspace: {
      workspaceFolders: null,
      openTextDocument: async () => {
        throw new Error('非VSCode环境，无法打开文档');
      }
    },
    window: {
      showTextDocument: async () => {
        throw new Error('非VSCode环境，无法显示文档');
      },
      showErrorMessage: (message: string) => {
        console.error(message);
      },
      showInformationMessage: (message: string) => {
        console.log(message);
      }
    },
    Uri: {
      file: (path: string) => {
        return { fsPath: path };
      }
    }
  };
}

export { vscode };
