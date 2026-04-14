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
    
    // 计算总分
    scoredBids.forEach(item => {
      item.totalScore = 
        item.scores.priceScore * 0.4 +    // 价格权重40%
        item.scores.speedScore * 0.3 +    // 速度权重30%
        item.scores.reputationScore * 0.3; // 信誉权重30%
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
    const reputationScore = bid.reputation || 50; // 默认50分
    
    return {
      priceScore: parseFloat(priceScore.toFixed(2)),
      speedScore: parseFloat(speedScore.toFixed(2)),
      reputationScore: parseFloat(reputationScore.toFixed(2))
    };
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
