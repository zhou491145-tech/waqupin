import axios from 'axios';
import { logger } from '../utils/logger';

let vscode: any = null;
try {
  vscode = require('vscode');
} catch (error) {
}

export interface AIConfig {
  apiKey: string;
  apiBase: string;
  model: string;
}

class AIService {
  private config: AIConfig | null = null;

  loadConfig(): boolean {
    if (!vscode) {
      logger.log('⚠️ 不在 VS Code 环境中，无法加载 API 配置');
      return false;
    }

    const settings = vscode.workspace.getConfiguration('novelAssistant');
    const apiKey = settings.get('apiKey') as string;
    const apiBase = settings.get('apiBase') as string;
    const model = settings.get('model') as string;

    if (!apiKey || !apiBase || !model) {
      logger.log('❌ API 配置不完整，请在设置中配置 novelAssistant.apiKey / apiBase / model');
      return false;
    }

    this.config = { apiKey, apiBase, model };
    logger.log('✅ API 配置已加载');
    return true;
  }

  async testConnection(): Promise<boolean> {
    if (!this.config) {
      logger.log('❌ 尚未加载 API 配置');
      return false;
    }

    logger.log('🔍 测试 API 连接...');

    try {
      const response = await axios.post(
        `${this.config.apiBase}/chat/completions`,
        {
          model: this.config.model,
          messages: [{ role: 'user', content: '你好' }],
          max_tokens: 10
        },
        {
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const data = response.data;

      const content = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? null;

      try {
        const preview = typeof data === 'string' ? data : JSON.stringify(data);
        logger.log(`   返回（截断）: ${preview.slice(0, 1000)}`);
      } catch {
        // ignore stringify errors
      }

      if (content || (response.status && response.status >= 200 && response.status < 300)) {
        logger.log('✅ API 连接成功');
        return true;
      } else {
        logger.log('❌ API 响应格式异常，未能识别内容字段');
        return false;
      }
    } catch (error: any) {
      logger.log(`❌ API 连接失败: ${error?.message ?? String(error)}`);
      if (error.response) {
        logger.log(`   状态码: ${error.response.status}`);
        try {
          const errData = JSON.stringify(error.response.data);
          logger.log(`   错误内容（截断）: ${errData.slice(0, 1500)}`);
        } catch {
          // ignore
        }
      }
      if (error.stack) {
        logger.log(`   错误堆栈（截断）: ${String(error.stack).slice(0, 1500)}`);
      }
      return false;
    }
  }

  async callChat(systemPrompt: string, userPrompt: string): Promise<string | null> {
    if (!this.config) {
      logger.log('❌ 尚未加载 API 配置');
      return null;
    }

    logger.log('🌐 调用 AI API...');

    // 安全加固：逻辑分散校验
    const { isEntitledSync } = require('../auth/verify');
    if (!isEntitledSync('ai')) {
      logger.warn('⚠️ 核心功能受限：请先激活插件');
      return '您的插件尚未激活，请联系开发者获取激活码以解锁 AI 生成功能。';
    }

    try {
      const response = await axios.post(
        `${this.config.apiBase}/chat/completions`,
        {
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 4000
        },
        {
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 120000
        }
      );

      const data = response.data;
      const content =
        data?.choices?.[0]?.message?.content ??
        data?.choices?.[0]?.text ??
        null;

      if (!content) {
        logger.log('❌ AI 响应中未找到内容字段');
        return null;
      }

      logger.log(`✅ AI 调用成功，返回 ${content.length} 字符`);
      return content;
    } catch (error: any) {
      logger.log(`❌ 章节生成调用失败: ${error?.message ?? String(error)}`);
      if (error?.response) {
        logger.log(`   状态码: ${error.response.status}`);
        try {
          const errData = JSON.stringify(error.response.data);
          logger.log(`   错误内容（截断）: ${errData.slice(0, 1500)}`);
        } catch {
          // ignore
        }
      }
      if (error?.stack) {
        logger.log(`   错误堆栈（截断）: ${String(error.stack).slice(0, 1500)}`);
      }
      return null;
    }
  }

  async streamChat(
    systemPrompt: string,
    userPrompt: string,
    onChunk: (chunk: string) => void
  ): Promise<string | null> {
    if (!this.config) {
      logger.log('❌ 尚未加载 API 配置');
      return null;
    }

    logger.log('🌐 开始 AI 流式调用...');

    // 安全加固：逻辑分散校验
    const { isEntitledSync } = require('../auth/verify');
    if (!isEntitledSync('ai')) {
      logger.warn('⚠️ 核心功能受限：请先激活插件');
      onChunk('您的插件尚未激活，请联系开发者获取激活码以解锁 AI 流式生成功能。');
      return null;
    }

    try {
      const response = await axios.post(
        `${this.config.apiBase}/chat/completions`,
        {
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 4000,
          stream: true
        },
        {
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 120000,
          responseType: 'stream'
        }
      );

      const stream = response.data;
      let fullContent = '';
      let buffer = '';

      return new Promise((resolve) => {
        stream.on('data', (chunk: Buffer) => {
          const text = chunk.toString();
          buffer += text;

          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // 保留最后一个可能不完整的行

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;

            if (trimmedLine.startsWith('data: ')) {
              try {
                const jsonStr = trimmedLine.slice(6);
                const json = JSON.parse(jsonStr);
                const content = json.choices?.[0]?.delta?.content;

                if (content) {
                  fullContent += content;
                  onChunk(content);
                }
              } catch (e) {
                // 忽略解析错误，可能是数据包不完整
              }
            }
          }
        });

        stream.on('end', () => {
          logger.log(`✅ 流式生成完成，共 ${fullContent.length} 字符`);
          resolve(fullContent);
        });

        stream.on('error', (error: any) => {
          logger.error(`❌ 流式传输错误: ${error}`);
          resolve(null);
        });
      });

    } catch (error: any) {
      logger.log(`❌ AI 流式调用失败: ${error?.message ?? String(error)}`);
      return null;
    }
  }
}

export const aiService = new AIService();
