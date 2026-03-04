import { Foreshadow } from '../data/storage';
import { logger } from '../utils/logger';

export interface ForeshadowScore {
  foreshadow: Foreshadow;
  score: number;
  reasons: string[];
}

export interface ForeshadowFilterOptions {
  currentChapter: number;
  chapterCharacters?: string[];
  maxForeshadows?: number;
  minImportance?: 'high' | 'medium' | 'low';
  chapterDistanceWeight?: number;
  characterRelevanceWeight?: number;
  importanceWeight?: number;
}

class ForeshadowFilterService {
  private readonly DEFAULT_OPTIONS: Partial<ForeshadowFilterOptions> = {
    maxForeshadows: 5,
    minImportance: 'medium',
    chapterDistanceWeight: 0.3,
    characterRelevanceWeight: 0.4,
    importanceWeight: 0.3
  };

  filterForeshadows(
    foreshadows: Foreshadow[],
    options: ForeshadowFilterOptions
  ): Foreshadow[] {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    logger.log(`🎯 开始过滤伏笔，当前章节: ${opts.currentChapter}`);

    const pendingForeshadows = foreshadows.filter((f) => f.status === 'pending');
    logger.log(`  📋 待处理伏笔数: ${pendingForeshadows.length}`);

    if (pendingForeshadows.length === 0) {
      return [];
    }

    const scored = this.scoreForeshadows(pendingForeshadows, opts);

    const filtered = this.applyMinImportanceFilter(scored, opts.minImportance!);
    logger.log(`  ✅ 重要性过滤后: ${filtered.length} 个`);

    const sorted = this.sortByScore(filtered);
    
    // 去除相似的伏笔
    const deduplicated = this.deduplicateForeshadows(sorted);
    logger.log(`  ✅ 去重后伏笔数: ${deduplicated.length} 个`);
    
    const result = deduplicated.slice(0, opts.maxForeshadows).map((s) => s.foreshadow);

    logger.log(`  📊 最终选择 ${result.length} 个伏笔:`);
    result.forEach((f, i) => {
      const score = sorted[i].score;
      logger.log(`    ${i + 1}. [${f.id}] ${f.description.substring(0, 30)}... (评分: ${score.toFixed(2)})`);
    });

    return result;
  }

  private scoreForeshadows(
    foreshadows: Foreshadow[],
    options: ForeshadowFilterOptions
  ): ForeshadowScore[] {
    return foreshadows.map((f) => {
      const score = this.calculateScore(f, options);
      return { foreshadow: f, score: score.score, reasons: score.reasons };
    });
  }

  private calculateScore(
    foreshadow: Foreshadow,
    options: ForeshadowFilterOptions
  ): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let totalScore = 0;

    const chapterDistanceScore = this.calculateChapterDistanceScore(
      foreshadow.plantedChapter,
      options.currentChapter
    );
    totalScore += chapterDistanceScore * options.chapterDistanceWeight!;
    if (chapterDistanceScore > 0.7) {
      reasons.push(`章节距离适中 (${options.currentChapter - foreshadow.plantedChapter}章)`);
    }

    const characterRelevanceScore = this.calculateCharacterRelevanceScore(
      foreshadow.relatedCharacters,
      options.chapterCharacters || []
    );
    totalScore += characterRelevanceScore * options.characterRelevanceWeight!;
    if (characterRelevanceScore > 0.5) {
      reasons.push(`涉及当前章节角色`);
    }

    const importanceScore = this.calculateImportanceScore(foreshadow.importance);
    totalScore += importanceScore * options.importanceWeight!;
    if (importanceScore > 0.7) {
      reasons.push(`重要性: ${foreshadow.importance}`);
    }

    const agePenalty = this.calculateAgePenalty(
      foreshadow.plantedChapter,
      options.currentChapter
    );
    totalScore -= agePenalty;
    if (agePenalty > 0.1) {
      reasons.push(`埋下时间较长，可能需要回收`);
    }

    return { score: Math.max(0, Math.min(1, totalScore)), reasons };
  }

  private calculateChapterDistanceScore(
    plantedChapter: number,
    currentChapter: number
  ): number {
    const distance = currentChapter - plantedChapter;

    if (distance <= 0) {
      return 0.5; // 当前章节与埋设章节相同或更小，返回中等分数
    }

    if (distance <= 3) {
      return 0.8;
    }

    if (distance <= 10) {
      return 1.0;
    }

    if (distance <= 20) {
      return 0.8;
    }

    if (distance <= 30) {
      return 0.5;
    }

    return 0.2;
  }

  private calculateCharacterRelevanceScore(
    foreshadowCharacters: string[],
    chapterCharacters: string[]
  ): number {
    if (!chapterCharacters || chapterCharacters.length === 0) {
      return 0.5;
    }

    if (foreshadowCharacters.length === 0) {
      return 0.3;
    }

    const matchedCharacters = foreshadowCharacters.filter((fc) =>
      chapterCharacters.some((cc) => cc.includes(fc) || fc.includes(cc))
    );

    if (matchedCharacters.length === 0) {
      return 0.2;
    }

    const matchRatio = matchedCharacters.length / foreshadowCharacters.length;
    return Math.min(1, matchRatio + 0.3);
  }

  private calculateImportanceScore(importance: 'high' | 'medium' | 'low'): number {
    switch (importance) {
      case 'high':
        return 1.0;
      case 'medium':
        return 0.6;
      case 'low':
        return 0.3;
      default:
        return 0.5;
    }
  }

  private calculateAgePenalty(plantedChapter: number, currentChapter: number): number {
    const age = currentChapter - plantedChapter;

    if (age > 50) {
      return 0.3;
    }

    if (age > 30) {
      return 0.2;
    }

    if (age > 20) {
      return 0.1;
    }

    return 0;
  }

  private applyMinImportanceFilter(
    scored: ForeshadowScore[],
    minImportance: 'high' | 'medium' | 'low'
  ): ForeshadowScore[] {
    const importanceOrder = { high: 3, medium: 2, low: 1 };
    const minLevel = importanceOrder[minImportance];

    return scored.filter((s) => importanceOrder[s.foreshadow.importance] >= minLevel);
  }

  private sortByScore(scored: ForeshadowScore[]): ForeshadowScore[] {
    return scored.sort((a, b) => b.score - a.score);
  }

  /**
   * 计算两个字符串的相似度（Levenshtein距离）
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [];
      for (let j = 0; j <= len2; j++) {
        if (i === 0) matrix[i][j] = j;
        else if (j === 0) matrix[i][j] = i;
        else {
          const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,     // 删除
            matrix[i][j - 1] + 1,     // 插入
            matrix[i - 1][j - 1] + cost // 替换
          );
        }
      }
    }

    const maxLen = Math.max(len1, len2);
    return 1 - (matrix[len1][len2] / maxLen);
  }

  /**
   * 去除相似的伏笔
   * 相似度高于阈值的伏笔只保留评分最高的一个
   */
  public deduplicateForeshadows(scored: ForeshadowScore[], similarityThreshold: number = 0.7): ForeshadowScore[] {
    const result: ForeshadowScore[] = [];
    
    scored.forEach((current) => {
      // 检查当前伏笔是否与结果中的任何伏笔相似
      const isDuplicate = result.some((existing) => {
        const similarity = this.calculateSimilarity(
          current.foreshadow.description.toLowerCase(),
          existing.foreshadow.description.toLowerCase()
        );
        return similarity > similarityThreshold;
      });
      
      // 如果不是重复的，添加到结果中
      if (!isDuplicate) {
        result.push(current);
      } else {
        logger.log(`  🚫 移除重复伏笔: ${current.foreshadow.description.substring(0, 30)}...`);
      }
    });
    
    return result;
  }

  getForeshadowSummary(foreshadows: Foreshadow[]): string {
    const pending = foreshadows.filter((f) => f.status === 'pending').length;
    const resolved = foreshadows.filter((f) => f.status === 'resolved').length;
    const abandoned = foreshadows.filter((f) => f.status === 'abandoned').length;
    const high = foreshadows.filter((f) => f.importance === 'high' && f.status === 'pending').length;

    return `待回收: ${pending} | 已回收: ${resolved} | 已放弃: ${abandoned} | 高优先级: ${high}`;
  }
}

export const foreshadowFilterService = new ForeshadowFilterService();
