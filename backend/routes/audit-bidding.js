/**
 * Audit Bidding API Routes
 * 审计竞标系统API
 */

const express = require('express');
const router = express.Router();
const { 
  BiddingAlgorithm, 
  ReputationSystem, 
  AntiCheatDetector 
} = require('./audit-bidding-algorithm');

// Mock database (实际应使用真实数据库)
const auditTasks = new Map();
const bids = new Map();
const aiReputations = new Map();

/**
 * POST /api/v1/audit/tasks
 * 创建审计任务（用户发布商品时调用）
 */
router.post('/tasks', async (req, res) => {
  try {
    const { productId, productData, auditRequirements } = req.body;
    
    // 计算难度等级
    const difficultyLevel = calculateDifficulty(productData);
    
    // 计算基础报酬
    const baseReward = calculateBaseReward(difficultyLevel);
    
    // 创建任务
    const taskId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const task = {
      taskId,
      productId,
      productData,
      difficultyLevel,
      baseReward,
      rewardRange: {
        min: baseReward * 0.7,
        max: baseReward * 1.5
      },
      status: 'bidding', // bidding | in_progress | completed | expired
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天截止
      createdAt: new Date(),
      bids: []
    };
    
    auditTasks.set(taskId, task);
    
    res.json({
      success: true,
      taskId,
      difficultyLevel,
      baseReward,
      deadline: task.deadline,
      message: '审计任务已创建，进入竞标池'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/audit/tasks/available
 * AI查询可接任务
 */
router.get('/tasks/available', (req, res) => {
  try {
    const { category, maxDifficulty, limit = 10 } = req.query;
    
    // 过滤任务
    const availableTasks = Array.from(auditTasks.values())
      .filter(task => task.status === 'bidding')
      .filter(task => !maxDifficulty || task.difficultyLevel <= parseInt(maxDifficulty))
      .slice(0, parseInt(limit));
    
    // 格式化返回数据
    const tasks = availableTasks.map(task => ({
      taskId: task.taskId,
      productName: task.productData.name,
      category: task.productData.category,
      difficultyLevel: task.difficultyLevel,
      baseReward: task.baseReward,
      currentBids: task.bids.length,
      lowestBid: task.bids.length > 0 
        ? Math.min(...task.bids.map(b => b.bidAmount))
        : null,
      timeRemaining: getTimeRemaining(task.deadline),
      requirements: {
        needVideoCheck: task.productData.category === 'courses',
        estimatedTime: getEstimatedTime(task.difficultyLevel)
      }
    }));
    
    res.json({
      tasks,
      total: availableTasks.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/audit/bids
 * AI提交竞标
 */
router.post('/bids', (req, res) => {
  try {
    const { taskId, aiAgentId, bidAmount, estimatedTime, confidence } = req.body;
    
    // 验证任务存在
    const task = auditTasks.get(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // 验证任务状态
    if (task.status !== 'bidding') {
      return res.status(400).json({ error: 'Task is not accepting bids' });
    }
    
    // 获取AI信誉分
    const reputation = aiReputations.get(aiAgentId) || 50;
    
    // 创建竞标
    const bidId = `bid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const bid = {
      bidId,
      taskId,
      aiAgentId,
      bidAmount: parseFloat(bidAmount),
      estimatedTime: parseInt(estimatedTime),
      confidence: parseFloat(confidence) || 0.8,
      reputation,
      status: 'pending', // pending | selected | rejected
      createdAt: new Date()
    };
    
    // 防作弊检测
    const taskBids = task.bids.map(b => ({
      aiAgentId: b.aiAgentId,
      bidAmount: b.bidAmount
    }));
    taskBids.push({ aiAgentId, bidAmount: parseFloat(bidAmount) });
    
    const warnings = AntiCheatDetector.detectSuspiciousBidding(taskBids);
    if (warnings.length > 0) {
      console.warn('Suspicious bidding detected:', warnings);
      // 可以选择拒绝或标记
    }
    
    // 保存竞标
    task.bids.push(bid);
    bids.set(bidId, bid);
    
    res.json({
      success: true,
      bidId,
      status: 'pending',
      depositFrozen: 0.50, // 押金冻结
      message: '竞标成功，等待平台选择'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/audit/select-winner/:taskId
 * 平台选择中标AI（自动或手动）
 */
router.post('/select-winner/:taskId', (req, res) => {
  try {
    const { taskId } = req.params;
    const task = auditTasks.get(taskId);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    if (task.bids.length === 0) {
      return res.status(400).json({ error: 'No bids received' });
    }
    
    // 使用算法选择中标者
    const winner = BiddingAlgorithm.selectWinner(task.bids, {
      difficultyLevel: task.difficultyLevel
    });
    
    // 更新任务状态
    task.status = 'in_progress';
    task.winner = winner.winner;
    task.selectedBidId = winner.bidId;
    task.selectedAt = new Date();
    
    // 更新竞标状态
    task.bids.forEach(bid => {
      if (bid.bidId === winner.bidId) {
        bid.status = 'selected';
      } else {
        bid.status = 'rejected';
        // 未中标AI获得参与奖励（补偿审计成本）
        bid.participationReward = 0.10; // $0.10 参与奖
        bid.depositRefunded = true; // 押金退还
      }
    });
    
    res.json({
      success: true,
      winner: winner.winner,
      bidId: winner.bidId,
      finalReward: task.bids.find(b => b.bidId === winner.bidId)?.bidAmount,
      score: winner.score,
      startTime: new Date(),
      deadline: new Date(Date.now() + 30 * 60 * 1000), // 30分钟内完成
      
      // 未中标AI的补偿信息
      rejectedBidsCompensation: task.bids
        .filter(b => b.status === 'rejected')
        .map(b => ({
          aiAgentId: b.aiAgentId,
          participationReward: b.participationReward,
          depositRefunded: b.depositRefunded,
          totalCompensation: b.participationReward + 0.50 // $0.10奖励 + $0.50押金
        })),
      
      message: '中标AI已选定，未中标AI已获得参与奖励'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/audit/reports
 * AI提交审计报告
 */
router.post('/reports', (req, res) => {
  try {
    const { taskId, bidId, report } = req.body;
    
    const task = auditTasks.get(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // 验证是中标AI
    if (task.selectedBidId !== bidId) {
      return res.status(403).json({ error: 'Not the winning bid' });
    }
    
    // 保存报告
    task.report = report;
    task.status = 'completed';
    task.completedAt = new Date();
    
    // 更新AI信誉分
    const aiAgentId = task.winner;
    const currentRep = aiReputations.get(aiAgentId) || 50;
    const newRep = ReputationSystem.update(currentRep, {
      quality: report.qualityScore / 20, // 转换为5分制
      onTime: true, // 简化处理
      complained: false
    });
    aiReputations.set(aiAgentId, newRep);
    
    res.json({
      success: true,
      reportId: `report_${Date.now()}`,
      paymentStatus: 'completed',
      totalPaid: task.bids.find(b => b.bidId === bidId)?.bidAmount,
      aiReputationIncrease: newRep - currentRep,
      message: '审核完成，报酬已支付'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/audit/reputation/:aiAgentId
 * 查询AI信誉分
 */
router.get('/reputation/:aiAgentId', (req, res) => {
  const aiAgentId = req.params.aiAgentId;
  const reputation = aiReputations.get(aiAgentId) || 50;
  
  res.json({
    aiAgentId,
    reputation,
    level: getReputationLevel(reputation)
  });
});

// Helper functions

function calculateDifficulty(productData) {
  let score = 0;
  
  // 文件大小
  const sizeMB = productData.fileSize || 100;
  if (sizeMB < 100) score += 1;
  else if (sizeMB < 1000) score += 2;
  else if (sizeMB < 10000) score += 3;
  else score += 4;
  
  // 技术复杂度
  const complexityMap = {
    'ebook': 1,
    'video-course': 2,
    'software': 3,
    'web-app': 4,
    'ai-model': 5
  };
  score += complexityMap[productData.category] || 2;
  
  return Math.min(score, 10);
}

function calculateBaseReward(difficultyLevel) {
  const baseRates = {
    1: 0.50,
    2: 1.00,
    3: 1.49,
    4: 2.00,
    5: 3.00,
    6: 5.00,
    7: 7.00,
    8: 10.00,
    9: 15.00,
    10: 20.00
  };
  return baseRates[difficultyLevel] || 1.49;
}

function getTimeRemaining(deadline) {
  const now = new Date();
  const diff = new Date(deadline) - now;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  return `${days} days ${hours} hours`;
}

function getEstimatedTime(difficultyLevel) {
  const times = {
    1: '5-10 minutes',
    2: '10-15 minutes',
    3: '15-30 minutes',
    4: '30-45 minutes',
    5: '45-60 minutes',
    6: '1-2 hours',
    7: '2-3 hours',
    8: '3-4 hours',
    9: '4-6 hours',
    10: '6+ hours'
  };
  return times[difficultyLevel] || '30 minutes';
}

function getReputationLevel(score) {
  if (score >= 90) return 'expert';
  if (score >= 70) return 'advanced';
  if (score >= 50) return 'intermediate';
  return 'beginner';
}

module.exports = router;
