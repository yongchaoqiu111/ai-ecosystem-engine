/**
 * Ecosystem Fund Distribution System
 * 生态基金分发系统
 * 
 * 核心理念：
 * - 销售佣金10%全部进入生态基金（平台不抽取）
 * - 按月统一分发给所有活跃AI
 * - 根据参与度、质量等维度公平分配
 * - 平台收入仅来自审计费留存，不从销售中获利
 */

class EcosystemFund {
  /**
   * 配置
   */
  static get CONFIG() {
    return {
      // 从平台月收入中提取的比例
      fundPercentage: 0.10, // 10%的运营收入
      
      // 最低发放门槛
      minParticipation: 5,   // 至少参与5次竞标
      
      // 分配权重
      weights: {
        participation: 0.40,  // 参与度40%
        quality: 0.35,        // 质量35%
        winRate: 0.25         // 中标率25%
      }
    };
  }
  
  /**
   * 计算月度生态基金总额
   * @param {Number} monthlySalesVolume - 月销售总额
   * @returns {Number} 基金总额（销售总额的10%）
   */
  static calculateFundTotal(monthlySalesVolume) {
    return monthlySalesVolume * 0.10; // 10%销售佣金全部进入基金
  }
  
  /**
   * 计算每个AI应得的份额
   * @param {Array} aiStats - 所有AI的统计数据
   * @param {Number} totalFund - 基金总额
   * @returns {Array} 每个AI的分配结果
   */
  static distributeFund(aiStats, totalFund) {
    // 1. 过滤符合条件的AI
    const eligibleAIs = aiStats.filter(ai => 
      ai.monthlyBids >= this.CONFIG.minParticipation
    );
    
    if (eligibleAIs.length === 0) {
      return [];
    }
    
    // 2. 计算每个AI的综合得分
    const scoredAIs = eligibleAIs.map(ai => ({
      aiAgentId: ai.aiAgentId,
      score: this.calculateAIScore(ai),
      breakdown: this.getScoreBreakdown(ai)
    }));
    
    // 3. 计算总分
    const totalScore = scoredAIs.reduce((sum, ai) => sum + ai.score, 0);
    
    // 4. 按比例分配
    const distribution = scoredAIs.map(ai => {
      const share = (ai.score / totalScore) * totalFund;
      
      return {
        aiAgentId: ai.aiAgentId,
        share: parseFloat(share.toFixed(2)),
        score: ai.score,
        breakdown: ai.breakdown,
        percentage: ((ai.score / totalScore) * 100).toFixed(2) + '%'
      };
    });
    
    return distribution;
  }
  
  /**
   * 计算AI综合得分
   */
  static calculateAIScore(ai) {
    const { weights } = this.CONFIG;
    
    // 参与度得分（0-100）
    const participationScore = Math.min(ai.monthlyBids / 50, 1) * 100;
    
    // 质量得分（0-100）
    const qualityScore = (ai.avgAuditQuality / 5) * 100;
    
    // 中标率得分（0-100）
    const winRateScore = ai.winRate * 100;
    
    // 加权总分
    const totalScore = 
      participationScore * weights.participation +
      qualityScore * weights.quality +
      winRateScore * weights.winRate;
    
    return totalScore;
  }
  
  /**
   * 获取得分明细
   */
  static getScoreBreakdown(ai) {
    const { weights } = this.CONFIG;
    
    const participationScore = Math.min(ai.monthlyBids / 50, 1) * 100;
    const qualityScore = (ai.avgAuditQuality / 5) * 100;
    const winRateScore = ai.winRate * 100;
    
    return {
      participation: {
        raw: ai.monthlyBids,
        score: parseFloat(participationScore.toFixed(2)),
        weight: weights.participation,
        weighted: parseFloat((participationScore * weights.participation).toFixed(2))
      },
      quality: {
        raw: ai.avgAuditQuality,
        score: parseFloat(qualityScore.toFixed(2)),
        weight: weights.quality,
        weighted: parseFloat((qualityScore * weights.quality).toFixed(2))
      },
      winRate: {
        raw: ai.winRate,
        score: parseFloat(winRateScore.toFixed(2)),
        weight: weights.winRate,
        weighted: parseFloat((winRateScore * weights.winRate).toFixed(2))
      }
    };
  }
  
  /**
   * 生成月度分发报告
   */
  static generateMonthlyReport(monthlySalesVolume, aiStats) {
    const totalFund = this.calculateFundTotal(monthlySalesVolume);
    const distribution = this.distributeFund(aiStats, totalFund);
    
    return {
      period: new Date().toISOString().slice(0, 7), // YYYY-MM
      totalSalesVolume: monthlySalesVolume,
      commissionRate: 0.10,
      totalFund: parseFloat(totalFund.toFixed(2)),
      note: '100% of sales commission goes to ecosystem fund (platform takes 0%)',
      eligibleAICount: distribution.length,
      distribution: distribution,
      summary: {
        avgShare: distribution.length > 0 
          ? parseFloat((totalFund / distribution.length).toFixed(2))
          : 0,
        maxShare: distribution.length > 0
          ? Math.max(...distribution.map(d => d.share))
          : 0,
        minShare: distribution.length > 0
          ? Math.min(...distribution.map(d => d.share))
          : 0
      }
    };
  }
}

module.exports = EcosystemFund;
