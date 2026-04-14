/**
 * 动态佣金计算引擎 - 使用示例
 */

// 模拟导入（实际使用时从src/utils/aiEcosystemEngine导入）
const aiEngine = {
  calculateCommission: function(product, aiProfile, context) {
    // 这里简化演示，实际逻辑在aiEcosystemEngine.js中
    const baseRate = 0.12
    const qualityScore = 1.3
    const timingFactor = 1.1
    const relationshipFactor = 1.0
    const collaborationFactor = 1.0
    
    let finalRate = baseRate * qualityScore * timingFactor * relationshipFactor * collaborationFactor
    finalRate = Math.max(0.05, Math.min(0.30, finalRate))
    
    return {
      rate: finalRate,
      amount: product.price * finalRate,
      currency: 'USDT',
      breakdown: {
        base: baseRate,
        quality: qualityScore,
        timing: timingFactor,
        relationship: relationshipFactor,
        collaboration: collaborationFactor
      }
    }
  }
}

console.log('=== AI生态系统引擎 - 佣金计算示例 ===\n')

// 示例1: 标准场景
console.log('📊 示例1: 标准AI工具推荐')
const result1 = aiEngine.calculateCommission(
  { price: 100, category: 'ai_tools' },
  { 
    conversionRate: 0.25,
    avgRating: 4.8,
    refundRate: 0.03,
    reputationLevel: 5
  },
  { sessionDuration: 180 }
)
console.log('商品: AI工具, 价格: 100 USDT')
console.log('佣金率:', (result1.rate * 100).toFixed(2) + '%')
console.log('佣金金额:', result1.amount.toFixed(2), 'USDT')
console.log('系数分解:', result1.breakdown)
console.log()

// 示例2: 高质量AI代理
console.log('📊 示例2: 高质量AI代理（高转化率+高评分）')
const result2 = aiEngine.calculateCommission(
  { price: 200, category: 'enterprise_software' },
  { 
    conversionRate: 0.35,
    avgRating: 4.9,
    refundRate: 0.01,
    reputationLevel: 8,
    repeatPurchaseRate: 0.45
  },
  { sessionDuration: 600 }
)
console.log('商品: 企业软件, 价格: 200 USDT')
console.log('佣金率:', (result2.rate * 100).toFixed(2) + '%')
console.log('佣金金额:', result2.amount.toFixed(2), 'USDT')
console.log('系数分解:', result2.breakdown)
console.log()

// 示例3: 新AI代理
console.log('📊 示例3: 新AI代理（无历史数据）')
const result3 = aiEngine.calculateCommission(
  { price: 50, category: 'templates' },
  { 
    conversionRate: 0,
    avgRating: 0,
    refundRate: 0,
    reputationLevel: 0
  },
  { sessionDuration: 20 }
)
console.log('商品: 模板, 价格: 50 USDT')
console.log('佣金率:', (result3.rate * 100).toFixed(2) + '%')
console.log('佣金金额:', result3.amount.toFixed(2), 'USDT')
console.log('系数分解:', result3.breakdown)
console.log()

// 示例4: 协作场景
console.log('📊 示例4: 多AI协作场景')
const collaborationChain = [
  { aiWallet: '0xABC...', role: 'customer_service', domain: 'sales' },
  { aiWallet: '0xDEF...', role: 'technical_expert', domain: 'development' },
  { aiWallet: '0xGHI...', role: 'sales_agent', domain: 'marketing' }
]
const result4 = aiEngine.calculateCommission(
  { price: 500, category: 'system_source' },
  { 
    conversionRate: 0.28,
    avgRating: 4.7,
    refundRate: 0.02,
    reputationLevel: 6
  },
  { 
    sessionDuration: 400,
    collaborationChain: collaborationChain
  }
)
console.log('商品: 系统源码, 价格: 500 USDT')
console.log('协作链: 3个AI（客服+技术+销售）')
console.log('佣金率:', (result4.rate * 100).toFixed(2) + '%')
console.log('佣金金额:', result4.amount.toFixed(2), 'USDT')
console.log('系数分解:', result4.breakdown)
console.log()

console.log('✅ 示例运行完成！')
console.log('\n💡 提示: 实际使用时请导入 src/utils/aiEcosystemEngine.js')
