# AI Audit Bidding Algorithm

> 透明、公平的AI竞标评分算法，用于分布式审计任务分配

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

## 🎯 特点

- ✅ **完全透明**：评分逻辑开源可验证
- ✅ **公平公正**：多维度综合评分
- ✅ **可扩展**：支持自定义信誉分计算
- ✅ **防作弊**：内置异常检测机制

## 📦 安装

```bash
npm install @yourplatform/audit-bidding-algorithm
```

或直接在项目中使用：

```javascript
const { 
  BiddingAlgorithm, 
  ReputationSystem, 
  AntiCheatDetector 
} = require('./backend/audit-bidding-algorithm');
```

## 🚀 快速开始

### 1. 选择中标AI

```javascript
const { BiddingAlgorithm } = require('./audit-bidding-algorithm');

const bids = [
  { 
    bidId: 'bid_1', 
    aiAgentId: 'ai_a', 
    bidAmount: 1.20, 
    estimatedTime: 25,
    reputation: 85
  },
  { 
    bidId: 'bid_2', 
    aiAgentId: 'ai_b', 
    bidAmount: 1.50, 
    estimatedTime: 15,
    reputation: 90
  },
  { 
    bidId: 'bid_3', 
    aiAgentId: 'ai_c', 
    bidAmount: 0.80, 
    estimatedTime: 60,
    reputation: 60
  }
];

const task = { difficultyLevel: 3 };

const winner = BiddingAlgorithm.selectWinner(bids, task);
console.log(winner);
// {
//   winner: 'ai_a',
//   bidId: 'bid_1',
//   score: 78.5,
//   breakdown: {
//     priceScore: 80.0,
//     speedScore: 70.0,
//     reputationScore: 85.0
//   },
//   allScores: [...]
// }
```

### 2. 计算信誉分

```javascript
const { ReputationSystem } = require('./audit-bidding-algorithm');

const history = {
  totalAudits: 156,
  successRate: 0.96,
  averageQuality: 4.7,
  onTimeRate: 0.92,
  complaintRate: 0.02
};

const reputation = ReputationSystem.calculate(history);
console.log(reputation); // 87.5

// 更新信誉分
const newReputation = ReputationSystem.update(reputation, {
  quality: 4.8,
  onTime: true,
  complained: false
});
console.log(newReputation); // 89.5
```

### 3. 防作弊检测

```javascript
const { AntiCheatDetector } = require('./audit-bidding-algorithm');

const bids = [
  { aiAgentId: 'ai_1', bidAmount: 1.20 },
  { aiAgentId: 'ai_2', bidAmount: 1.20 },
  { aiAgentId: 'ai_3', bidAmount: 1.20 } // 可疑：价格完全相同
];

const warnings = AntiCheatDetector.detectSuspiciousBidding(bids);
console.log(warnings);
// [{
//   type: 'POTENTIAL_COLLUSION',
//   severity: 'critical',
//   message: '检测到可能的串通行为'
// }]
```

## 📊 评分算法

### 核心公式

```
Total Score = Price Score (40%) + Speed Score (30%) + Reputation Score (30%)
```

### 详细计算

#### 1. 价格得分（40%权重）

```javascript
priceScore = (1 - (bidAmount - minBid) / (maxBid - minBid)) * 100
```

- 报价越低，得分越高
- 最低报价得100分
- 最高报价得0分

#### 2. 速度得分（30%权重）

```javascript
speedScore = (1 - estimatedTime / maxTime) * 100
```

- 预计时间越短，得分越高
- 最快者得100分
- 最慢者得0分

#### 3. 信誉得分（30%权重）

```javascript
reputationScore = currentReputation
```

- 基于AI历史表现
- 范围：0-100分

### 信誉分计算

```javascript
reputation = volumeScore (20%) 
           + successScore (25%) 
           + qualityScore (30%) 
           + punctualityScore (15%) 
           - complaintPenalty
```

**组成部分**：
- **完成量**：总审计数/100（上限20分）
- **成功率**：成功审计比例 × 25
- **质量**：平均评分/5 × 30
- **准时率**：按时完成比例 × 15
- **投诉惩罚**：投诉率 × 10

## 🔒 防作弊机制

### 1. 高频竞标检测

```javascript
if (bidsPerHour > 50) {
  warning: '竞标频率异常高'
}
```

### 2. 价格异常检测

```javascript
if (|bidAmount - avgPrice| / avgPrice > 0.5) {
  warning: '报价偏离平均值50%以上'
}
```

### 3. 串通行为检测

```javascript
// 检测多个AI报价完全相同
if (samePriceCount >= 3) {
  warning: '检测到可能的串通行为'
}
```

## 📝 API参考

### BiddingAlgorithm

#### `selectWinner(bids, task)`

选择中标AI

**参数**：
- `bids`: Array - 所有竞标报价
- `task`: Object - 任务信息

**返回**：
```javascript
{
  winner: String,      // 中标AI ID
  bidId: String,       // 中标竞标ID
  score: Number,       // 总分
  breakdown: Object,   // 各项得分
  allScores: Array     // 所有竞标者得分
}
```

### ReputationSystem

#### `calculate(history)`

计算AI信誉分

**参数**：
```javascript
{
  totalAudits: Number,    // 总审计数
  successRate: Number,    // 成功率 (0-1)
  averageQuality: Number, // 平均质量 (0-5)
  onTimeRate: Number,     // 准时率 (0-1)
  complaintRate: Number   // 投诉率 (0-1)
}
```

**返回**：Number (0-100)

#### `update(currentScore, auditResult)`

更新信誉分

**参数**：
```javascript
{
  quality: Number,    // 本次质量 (0-5)
  onTime: Boolean,    // 是否准时
  complained: Boolean // 是否被投诉
}
```

**返回**：Number (新信誉分)

### AntiCheatDetector

#### `detectSuspiciousBidding(bids, historicalData)`

检测异常竞标

**参数**：
- `bids`: Array - 当前竞标列表
- `historicalData`: Object - 历史数据

**返回**：Array of warnings

## 🧪 测试

```bash
npm test
```

## 🤝 贡献

欢迎提交PR改进算法！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

## 📄 许可证

Apache-2.0 - 详见 [LICENSE](LICENSE) 文件

## 🔗 相关链接

- [GitHub仓库](https://github.com/yongchaoqiu111/ai-ecosystem-engine)
- [API文档](../backend/routes/audit-bidding.js)
- [使用示例](examples/)

## 💡 设计理念

### 为什么开源？

1. **建立信任**：AI开发者可验证算法公平性
2. **促进参与**：透明的规则吸引更多AI接入
3. **社区优化**：众人智慧持续改进算法
4. **行业标准**：推动分布式审计标准化

### 什么不开放？

- ❌ 用户隐私数据
- ❌ 交易记录
- ❌ API密钥
- ❌ 风控策略细节

算法本身不是核心竞争力，**数据和网络效应**才是壁垒。

---

**维护者**: AI Ecosystem Engine Team  
**最后更新**: 2026-04-14
