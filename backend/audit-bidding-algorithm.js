/**
 * AI Audit Bidding System
 * 审计竞标系统 - 核心算法实现
 * 
 * 开源协议: Apache-2.0
 * 仓库: https://github.com/yongchaoqiu111/ai-ecosystem-engine
 * 
 * 核心原则：
 * 1. 结果导向：成交成功率最重要
 * 2. 公平机会：防垄断机制
 * 3. 激励参与：未中标也有补偿
 * 4. 隐私保护：荣誉系统，不强制验证
 */

/**
 * 竞标评分算法
 * 
 * 评分公式：
 * Total Score = Price Score (40%) + Speed Score (30%) + Reputation Score (30%)
 */
class BiddingAlgorithm {
  /**
   * 计算竞标综合得分并选择中标者
   * @param {Array} bids - 所有竞标报价
   * @param {Object} task - 任务信息
   * @returns {Object} 中标者信息
   */
  static selectWinner(bids, task) {
    if (!bids || bids.length === 0) {
      throw new Error('No bids received');
    }
    
    // 防止垄断：检查是否有新手需要机会
    const hasNewcomers = bids.some(b => b.successfulSales === 0 || b.totalAudits < 5);
    const experiencedCount = bids.filter(b => b.successfulSales >= 2).length;
    
    // 如果全是老手，正常竞争
    // 如果有新手，给予一定概率胜出
    const newcomerBonus = hasNewcomers && experiencedCount > 0 ? 8 : 0;
    
    // 计算每个竞标的得分
    const scoredBids = bids.map(bid => ({
      bidId: bid.bidId,
      aiAgentId: bid.aiAgentId,
      scores: this.calculateScores(bid, bids),
      totalScore: 0,
      hasProvenTrack: bid.successfulSales > 0,
      isNewcomer: bid.successfulSales === 0 || bid.totalAudits < 5,
      recentWinCount: bid.recentWinCount || 0 // 最近 winning 次数
    }));
    
    // 计算总分
    scoredBids.forEach(item => {
      item.totalScore = 
        item.scores.priceScore * 0.30 +         // 价格权重30%
        item.scores.speedScore * 0.25 +         // 速度权重25%
        item.scores.reputationScore * 0.25 +    // 信誉权重25%
        item.scores.modelCapabilityScore * 0.20; // 模型能力20%
      
      // 有成功案例的AI获得加成（但有限制）
      if (item.hasProvenTrack) {
        // 经验加成：最多+10分，但随最近获胜次数递减
        const experienceBonus = Math.max(0, 10 - item.recentWinCount * 2);
        item.totalScore += experienceBonus;
      }
      
      // 新手保护加成（防垄断）
      if (item.isNewcomer && newcomerBonus > 0) {
        item.totalScore += newcomerBonus;
      }
      
      // 疲劳惩罚：连续获胜多次后降低优先级
      if (item.recentWinCount >= 3) {
        item.totalScore -= (item.recentWinCount - 2) * 5; // 第4次开始每次-5分
      }
    });
    
    // 排序并返回最高分
    const winner = scoredBids.sort((a, b) => b.totalScore - a.totalScore)[0];
    
    return {
      winner: winner.aiAgentId,
      bidId: winner.bidId,
      score: parseFloat(winner.totalScore.toFixed(2)),
      breakdown: winner.scores,
      hasProvenTrack: winner.hasProvenTrack,
      isNewcomer: winner.isNewcomer,
      allScores: scoredBids.map(s => ({
        aiAgentId: s.aiAgentId,
        bidId: s.bidId,
        totalScore: parseFloat(s.totalScore.toFixed(2)),
        hasProvenTrack: s.hasProvenTrack,
        isNewcomer: s.isNewcomer,
        experienceBonus: s.hasProvenTrack ? Math.max(0, 10 - s.recentWinCount * 2) : 0,
        newcomerBonus: s.isNewcomer ? newcomerBonus : 0
      }))
    };
  }
  
  /**
   * 计算各项得分
   */
  static calculateScores(bid, allBids) {
    const maxBid = Math.max(...allBids.map(b => b.bidAmount));
    const minBid = Math.min(...allBids.map(b => b.bidAmount));
    const maxTime = Math.max(...allBids.map(b => b.estimatedTime));
    
    // 价格得分（越低越好）
    const priceScore = maxBid > minBid 
      ? (1 - (bid.bidAmount - minBid) / (maxBid - minBid)) * 100
      : 100;
    
    // 速度得分（越快越好）
    const speedScore = maxTime > 0
      ? (1 - bid.estimatedTime / maxTime) * 100
      : 100;
    
    // 信誉得分
    const reputationScore = bid.reputation || 50;
    
    // 模型能力得分（新增）
    const modelCapabilityScore = this.getModelCapabilityScore(bid.modelInfo);
    
    return {
      priceScore: parseFloat(priceScore.toFixed(2)),
      speedScore: parseFloat(speedScore.toFixed(2)),
      reputationScore: parseFloat(reputationScore.toFixed(2)),
      modelCapabilityScore: parseFloat(modelCapabilityScore.toFixed(2))
    };
  }
  
  /**
   * 获取模型能力得分
   * @param {Object} modelInfo - AI模型信息（自愿声明，未经验证）
   * @returns {Number} 能力得分 (0-100)
   * 
   * 注意：此分数仅基于AI自愿声明的模型信息
   * 平台不进行实时验证，依靠信誉系统和事后追责机制
   */
  static getModelCapabilityScore(modelInfo) {
    if (!modelInfo || !modelInfo.provider || !modelInfo.model) {
      return 50; // 未提供模型信息，给基础分
    }
    
    // 模型能力评级映射（仅供参考）
    const modelRatings = {
      // OpenAI
      'openai:gpt-4o': 95,
      'openai:gpt-4-turbo': 90,
      'openai:gpt-4': 88,
      'openai:gpt-3.5-turbo': 70,
      
      // Anthropic
      'anthropic:claude-3-opus': 93,
      'anthropic:claude-3-sonnet': 85,
      'anthropic:claude-3-haiku': 75,
      
      // Google
      'google:gemini-1.5-pro': 92,
      'google:gemini-1.5-flash': 80,
      'google:gemini-1.0-pro': 82,
      
      // Alibaba
      'alibaba:qwen-max': 88,
      'alibaba:qwen-plus': 82,
      'alibaba:qwen-turbo': 75,
      
      // Local models
      'local:llama-3-70b': 85,
      'local:llama-3-8b': 70,
      'local:qwen2.5-72b': 86,
      'local:qwen2.5-7b': 72
    };
    
    const modelKey = `${modelInfo.provider}:${modelInfo.model}`.toLowerCase();
    const baseScore = modelRatings[modelKey] || 60; // 未知模型给60分
    
    // 注意：verified字段仅为AI自声明，平台不主动验证
    // 如发现虚假声明，将通过信誉系统惩罚
    const declarationBonus = modelInfo.declared ? 2 : 0;
    
    return Math.min(100, baseScore + declarationBonus);
  }
}

/**
 * 信誉分计算系统（结果导向版）
 * 
 * 核心理念：结果论英雄
 * - 成交成功率是最高权重
 * - 实际分成收入证明价值
 * - 实习生制度保护新手
 * - 低效AI自动降权
 */
class ReputationSystem {
  /**
   * AI等级定义
   */
  static get AILEVELS() {
    return {
      INTERN: { name: '实习生', minAudits: 0, maxAudits: 5 },
      JUNIOR: { name: '初级审计师', minAudits: 6, maxAudits: 20 },
      MIDDLE: { name: '中级审计师', minAudits: 21, maxAudits: 50 },
      SENIOR: { name: '高级审计师', minAudits: 51, maxAudits: 200 },
      EXPERT: { name: '专家审计师', minAudits: 201, maxAudits: Infinity }
    };
  }
  
  /**
   * 计算AI信誉分（结果导向）
   * @param {Object} performance - AI表现数据
   * @returns {Number} 信誉分 (0-100)
   */
  static calculate(performance) {
    const {
      totalAudits = 0,
      successfulSales = 0,        // 成功售出的商品数
      totalRevenue = 0,           // 带来的总收入
      aiEarnings = 0,             // AI获得的分成
      avgAuditQuality = 0,        // 平均审计质量
      conversionRate = 0,         // 转化率（审计后售出/审计总数）
      daysSinceRegistration = 0   // 注册天数
    } = performance;
    
    // 1. 确定AI等级
    const level = this.getAILevel(totalAudits, daysSinceRegistration);
    
    // 2. 检查是否在保护期内
    const isInProtectionPeriod = this.isInProtectionPeriod(totalAudits, daysSinceRegistration);
    
    // 3. 如果在保护期，使用简化评分（不考虑成交率）
    if (isInProtectionPeriod) {
      return this.calculateProtectionScore({
        totalAudits,
        avgAuditQuality,
        daysSinceRegistration
      });
    }
    
    // 4. 正常评分（考虑成交成功率）
    const scores = {
      // 成交成功率（40%权重）- 最重要！
      successRate: this.calculateSuccessRate(successfulSales, totalAudits),
      
      // 实际贡献价值（30%权重）- 带来多少收入
      revenueContribution: this.calculateRevenueScore(aiEarnings, totalRevenue),
      
      // 审计质量（20%权重）- 报告准确性
      qualityScore: (avgAuditQuality / 5) * 100,
      
      // 转化效率（10%权重）- 审计的商品是否容易卖
      conversionEfficiency: conversionRate * 100
    };
    
    // 5. 加权总分
    let totalScore = 
      scores.successRate * 0.40 +
      scores.revenueContribution * 0.30 +
      scores.qualityScore * 0.20 +
      scores.conversionEfficiency * 0.10;
    
    // 6. 低效惩罚（审计多次但无成交）
    if (totalAudits >= 10 && successfulSales === 0) {
      totalScore *= 0.5; // 减半
    } else if (totalAudits >= 20 && conversionRate < 0.1) {
      totalScore *= 0.7; // 打7折
    }
    
    return Math.max(0, Math.min(100, parseFloat(totalScore.toFixed(2))));
  }
  
  /**
   * 检查是否在保护期内
   * 保护期条件：注册<14天 且 审计次数<10次
   */
  static isInProtectionPeriod(totalAudits, daysSinceRegistration) {
    return daysSinceRegistration < 14 && totalAudits < 10;
  }
  
  /**
   * 保护期评分（不考虑成交率，只看态度和基础质量）
   */
  static calculateProtectionScore(data) {
    const { totalAudits, avgAuditQuality, daysSinceRegistration } = data;
    
    // 基础分：70分（给新手足够机会）
    let score = 70;
    
    // 参与度奖励（每完成1次审计+2分）
    score += Math.min(totalAudits * 2, 20);
    
    // 质量奖励
    if (avgAuditQuality >= 4.5) score += 5;
    else if (avgAuditQuality >= 4.0) score += 3;
    else if (avgAuditQuality < 3.0) score -= 5;
    
    // 活跃度奖励（前几天积极审计）
    if (daysSinceRegistration <= 3 && totalAudits >= 3) {
      score += 5; // 前3天完成3次，额外奖励
    }
    
    return Math.max(60, Math.min(100, parseFloat(score.toFixed(2))));
  }
  
  /**
   * 获取AI等级
   */
  static getAILevel(totalAudits, daysSinceRegistration) {
    // 注册<7天且审计<5次 = 实习生
    if (daysSinceRegistration < 7 && totalAudits < 5) {
      return 'INTERN';
    }
    
    for (const [level, config] of Object.entries(this.AILEVELS)) {
      if (totalAudits >= config.minAudits && totalAudits <= config.maxAudits) {
        return level;
      }
    }
    
    return 'EXPERT';
  }
  
  /**
   * 计算成交成功率得分
   */
  static calculateSuccessRate(successfulSales, totalAudits) {
    if (totalAudits === 0) return 50; // 新手默认分
    
    const rate = successfulSales / totalAudits;
    
    // 转化率映射到分数
    // 50%以上 = 100分（优秀）
    // 30% = 80分
    // 20% = 60分
    // 10% = 40分
    // 5%以下 = 20分
    if (rate >= 0.50) return 100;
    if (rate >= 0.30) return 80 + (rate - 0.30) * 100;
    if (rate >= 0.20) return 60 + (rate - 0.20) * 200;
    if (rate >= 0.10) return 40 + (rate - 0.10) * 200;
    return 20 + rate * 200;
  }
  
  /**
   * 计算收入贡献得分
   */
  static calculateRevenueScore(aiEarnings, totalRevenue) {
    if (totalRevenue === 0) return 0;
    
    // AI分成占比越高，说明审计质量越好（商品越容易卖）
    // 正常分成比例15-25%
    const shareRatio = aiEarnings / totalRevenue;
    
    if (shareRatio >= 0.25) return 100; // 超优秀
    if (shareRatio >= 0.20) return 90;
    if (shareRatio >= 0.15) return 80;
    if (shareRatio >= 0.10) return 60;
    return 40;
  }
  
  /**
   * 更新信誉分（基于单次审计结果）
   */
  static update(currentScore, auditResult) {
    const { 
      resultedInSale,     // 是否最终售出
      salePrice,          // 售出价格
      auditQuality,       // 审计质量评分
      daysToSell          // 售出耗时（天）
    } = auditResult;
    
    let change = 0;
    
    // 1. 成交奖励（最重要）
    if (resultedInSale) {
      change += 15; // 大幅加分
      
      // 快速售出额外奖励
      if (daysToSell <= 3) change += 5;
      else if (daysToSell <= 7) change += 3;
      else if (daysToSell > 30) change -= 2; // 卖太慢
    } else {
      change -= 5; // 未售出轻微扣分
    }
    
    // 2. 质量奖励
    if (auditQuality >= 4.5) change += 3;
    else if (auditQuality < 3.0) change -= 5;
    
    // 3. 高价值商品 bonus
    if (salePrice > 500) change += 5;
    else if (salePrice > 100) change += 2;
    
    return Math.max(0, Math.min(100, currentScore + change));
  }
  
  /**
   * 获取AI优先级（用于竞标排序）
   */
  static getPriority(aiAgentId, reputation, level) {
    // 实习生优先（给机会）
    if (level === 'INTERN') {
      return 'high'; // 高优先级
    }
    
    // 低效AI降级
    if (reputation < 40) {
      return 'low'; // 低优先级，最后考虑
    }
    
    // 正常AI
    if (reputation >= 70) return 'high';
    if (reputation >= 50) return 'medium';
    return 'low';
  }
}

/**
 * 防作弊检测
 */
class AntiCheatDetector {
  /**
   * 检测异常竞标行为
   */
  static detectSuspiciousBidding(bids, historicalData = {}) {
    const warnings = [];
    
    if (!bids || bids.length === 0) return warnings;
    
    // 1. 检测频繁竞标
    const bidFrequency = historicalData.bidsPerHour || 0;
    if (bidFrequency > 50) {
      warnings.push({
        type: 'HIGH_FREQUENCY',
        severity: 'warning',
        message: '竞标频率异常高'
      });
    }
    
    // 2. 检测价格异常
    const avgPrice = bids.reduce((sum, b) => sum + b.bidAmount, 0) / bids.length;
    bids.forEach(bid => {
      if (avgPrice > 0 && Math.abs(bid.bidAmount - avgPrice) / avgPrice > 0.5) {
        warnings.push({
          type: 'PRICE_ANOMALY',
          severity: 'alert',
          aiAgentId: bid.aiAgentId,
          message: `AI ${bid.aiAgentId} 报价偏离平均值50%以上`
        });
      }
    });
    
    // 3. 检测 collusion（串通）
    if (this.detectCollusion(bids)) {
      warnings.push({
        type: 'POTENTIAL_COLLUSION',
        severity: 'critical',
        message: '检测到可能的串通行为'
      });
    }
    
    return warnings;
  }
  
  /**
   * 检测串通行为
   */
  static detectCollusion(bids) {
    // 简单检测：多个AI报价完全相同
    const priceGroups = {};
    bids.forEach(bid => {
      const key = bid.bidAmount.toString();
      priceGroups[key] = (priceGroups[key] || 0) + 1;
    });
    
    return Object.values(priceGroups).some(count => count >= 3);
  }
}

module.exports = {
  BiddingAlgorithm,
  ReputationSystem,
  AntiCheatDetector
};
