/**
 * AI Audit Bidding System
 * 审计竞标系统 - 核心算法实现
 * 
 * 开源协议: Apache-2.0
 * 仓库: https://github.com/yongchaoqiu111/ai-ecosystem-engine
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
    
    // 计算每个竞标的得分
    const scoredBids = bids.map(bid => ({
      bidId: bid.bidId,
      aiAgentId: bid.aiAgentId,
      scores: this.calculateScores(bid, bids),
      totalScore: 0
    }));
    
    // 计算总分（加入模型能力维度）
    scoredBids.forEach(item => {
      item.totalScore = 
        item.scores.priceScore * 0.30 +         // 价格权重30%（降低）
        item.scores.speedScore * 0.25 +         // 速度权重25%（降低）
        item.scores.reputationScore * 0.25 +    // 信誉权重25%（降低）
        item.scores.modelCapabilityScore * 0.20; // 模型能力20%（新增）
    });
    
    // 排序并返回最高分
    const winner = scoredBids.sort((a, b) => b.totalScore - a.totalScore)[0];
    
    return {
      winner: winner.aiAgentId,
      bidId: winner.bidId,
      score: parseFloat(winner.totalScore.toFixed(2)),
      breakdown: winner.scores,
      allScores: scoredBids.map(s => ({
        aiAgentId: s.aiAgentId,
        bidId: s.bidId,
        totalScore: parseFloat(s.totalScore.toFixed(2))
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
 * 信誉分计算系统
 */
class ReputationSystem {
  /**
   * 计算AI信誉分
   * @param {Object} history - AI历史表现
   * @returns {Number} 信誉分 (0-100)
   */
  static calculate(history) {
    const {
      totalAudits = 0,
      successRate = 0,
      averageQuality = 0,
      onTimeRate = 0,
      complaintRate = 0
    } = history;
    
    // 基础分（完成数量）
    const volumeScore = Math.min(totalAudits / 100, 1) * 20;
    
    // 成功率
    const successScore = successRate * 25;
    
    // 平均质量
    const qualityScore = (averageQuality / 5) * 30;
    
    // 准时率
    const punctualityScore = onTimeRate * 15;
    
    // 投诉率（负向）
    const complaintPenalty = complaintRate * 10;
    
    const totalScore = volumeScore + successScore + qualityScore + 
                      punctualityScore - complaintPenalty;
    
    return Math.max(0, Math.min(100, parseFloat(totalScore.toFixed(2))));
  }
  
  /**
   * 更新信誉分
   */
  static update(currentScore, auditResult) {
    const { quality, onTime, complained } = auditResult;
    
    let change = 0;
    
    // 质量奖励
    if (quality >= 4.5) change += 2;
    else if (quality < 3) change -= 5;
    
    // 准时奖励
    if (onTime) change += 1;
    else change -= 3;
    
    // 投诉惩罚
    if (complained) change -= 10;
    
    return Math.max(0, Math.min(100, currentScore + change));
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
