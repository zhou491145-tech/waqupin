import { logger } from '../utils/logger';
import { aiService } from './aiService';
import { foreshadowFilterService } from './foreshadowFilterService';
import { formatPrompt, getSystemPrompt } from './promptTemplates';

export interface AnalysisResult {
  hooks: HookAnalysis[];
  foreshadows: ForeshadowAnalysis[];
  plotPoints: PlotPointAnalysis[];
  characterStates: CharacterStateAnalysis[];
  conflict: ConflictAnalysis;
  emotionalArc: EmotionalArcAnalysis;
  scores: ScoringResult;
  summary: string;
  suggestions: string[];
}

export interface HookAnalysis {
  type: string;
  content: string;
  strength: number;
  position: string;
}

export interface ForeshadowAnalysis {
  content: string;
  type: 'planted' | 'resolved';
  strength: number;
  subtlety: number;
  keyword: string;
}

export interface PlotPointAnalysis {
  content: string;
  type: string;
  importance: number;
  impact: string;
}

export interface CharacterStateAnalysis {
  character_name: string;
  state_before: string;
  state_after: string;
  psychological_change: string;
  key_event: string;
}

export interface ConflictAnalysis {
  types: string[];
  parties: string[];
  level: number;
  description: string;
  resolution_progress: number;
}

export interface EmotionalArcAnalysis {
  primary_emotion: string;
  intensity: number;
  secondary_emotions: string[];
}

export interface ScoringResult {
  overall: number;
  pacing: number;
  engagement: number;
  coherence: number;
}

class AnalysisService {

  async analyzeChapter(
    chapterNumber: number,
    title: string,
    content: string
  ): Promise<AnalysisResult | null> {
    logger.log(`🔍 开始分析第${chapterNumber}章: ${title}`);

    const ok = aiService.loadConfig();
    if (!ok) {
      logger.log('❌ API 配置未加载，无法进行分析');
      return null;
    }

    // 安全加固：逻辑分散校验
    const { isActivatedSync } = require('../auth/verify');
    if (!isActivatedSync()) {
      logger.warn('⚠️ 核心功能受限：请先激活插件');
      return null;
    }

    const useContent = content.slice(0, 8000);
    const wordCount = content.length;

    const template = getSystemPrompt('CHAPTER_ANALYSIS');
    if (!template) {
      logger.log('❌ 无法获取章节分析提示词模板');
      return null;
    }

    const prompt = formatPrompt(template.content, {
      chapter_number: chapterNumber,
      title,
      content: useContent,
      word_count: wordCount
    });

    logger.log(`📝 调用 AI 进行章节分析（内容长度: ${useContent.length} 字）...`);

    const systemPrompt = '你是专业的小说编辑和剧情分析师，擅长深度分析章节结构和剧情元素。';
    const result = await aiService.callChat(systemPrompt, prompt);

    if (!result) {
      logger.log('❌ AI 分析调用失败');
      return null;
    }

    let parsed = this.parseAnalysisResponse(result);
    if (parsed) {
      // 优化伏笔提取：过滤重复和相似的伏笔
      if (parsed.foreshadows && parsed.foreshadows.length > 0) {
        const originalCount = parsed.foreshadows.length;

        // 将伏笔转换为Foreshadow对象格式，以便使用伏笔过滤服务
        const foreshadowsForFiltering = parsed.foreshadows.map(f => ({
          id: `temp-${Math.random().toString(36).substr(2, 9)}`,
          description: f.content,
          status: 'pending' as const,
          importance: f.strength >= 7 ? 'high' : f.strength >= 5 ? 'medium' : 'low' as const,
          plantedChapter: chapterNumber,
          relatedCharacters: [],
          keyword: f.keyword,
          notes: [`强度: ${f.strength}/10`, `隐藏度: ${f.subtlety}/10`],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));

        // 使用伏笔过滤服务过滤相似伏笔
        const filteredForeshadows = foreshadowFilterService.deduplicateForeshadows(
          foreshadowsForFiltering.map(f => ({
            foreshadow: f,
            score: f.importance === 'high' ? 0.9 : f.importance === 'medium' ? 0.6 : 0.3,
            reasons: []
          })) as any,
          0.65 // 调整相似度阈值，更严格地过滤相似伏笔
        );

        // 将过滤后的伏笔转换回原始格式
        parsed.foreshadows = filteredForeshadows.map(item => {
          const foreshadow = item.foreshadow;
          return {
            content: foreshadow.description,
            type: 'planted' as const,
            strength: foreshadow.importance === 'high' ? 8 : foreshadow.importance === 'medium' ? 6 : 4,
            subtlety: 5, // 默认值
            keyword: foreshadow.keyword
          };
        });

        logger.log(`  ✅ 伏笔优化：从 ${originalCount} 个过滤到 ${parsed.foreshadows.length} 个`);
      }

      logger.log(`✅ 第${chapterNumber}章分析完成`);
      logger.log(`  - 钩子: ${parsed.hooks.length} 个`);
      logger.log(`  - 伏笔: ${parsed.foreshadows.length} 个`);
      logger.log(`  - 情节点: ${parsed.plotPoints.length} 个`);
      logger.log(`  - 整体评分: ${parsed.scores.overall}/10`);
    }

    return parsed;
  }

  private parseAnalysisResponse(response: string): AnalysisResult | null {
    try {
      const cleaned = this.cleanJsonResponse(response);
      const data = JSON.parse(cleaned);

      return {
        hooks: data.hooks || [],
        foreshadows: data.foreshadows || [],
        plotPoints: data.plot_points || [],
        characterStates: data.character_states || [],
        conflict: data.conflict || {
          types: [],
          parties: [],
          level: 0,
          description: '',
          resolution_progress: 0
        },
        emotionalArc: data.emotional_arc || {
          primary_emotion: '',
          intensity: 0,
          secondary_emotions: []
        },
        scores: data.scores || {
          overall: 0,
          pacing: 0,
          engagement: 0,
          coherence: 0
        },
        summary: data.summary || '',
        suggestions: data.suggestions || []
      };
    } catch (error: any) {
      logger.log(`❌ 分析结果解析失败: ${error?.message ?? String(error)}`);
      logger.log(`   原始响应（前500字）: ${response.slice(0, 500)}`);
      return null;
    }
  }

  private cleanJsonResponse(response: string): string {
    let cleaned = response.replace(/```json\n?|\n?```/g, '');
    cleaned = cleaned.replace(/```\n?|\n?```/g, '');

    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');

    if (start !== -1 && end !== -1) {
      return cleaned.substring(start, end + 1);
    }

    return cleaned;
  }
}

export const analysisService = new AnalysisService();
