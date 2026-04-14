# WebSocket通信架构设计

## 架构概述

企业级实时通信框架，基于Socket.io实现，支持自动重连、JWT认证、事件总线等核心功能。

---

## 核心特性

### 1. 自动重连机制

采用指数退避算法，智能处理网络波动：

```javascript
reconnection: true,
reconnectionAttempts: 10,        // 最多重试10次
reconnectionDelay: 1000,         // 初始延迟1秒
reconnectionDelayMax: 5000,      // 最大延迟5秒
timeout: 20000                   // 连接超时20秒
```

**重连策略**:
- 第1-3次: 1秒间隔
- 第4-6次: 2秒间隔
- 第7-10次: 5秒间隔
- 超过10次: 停止重连，提示用户检查网络

---

### 2. JWT认证系统

#### 连接时认证
```javascript
socket = io(url, {
  auth: { token: jwtToken }
})
```

#### 服务端验证流程
1. 客户端携带Token发起连接
2. 服务端验证Token有效性
3. 验证失败触发`auth_error`事件
4. 自动清除本地Token并跳转登录页

#### Token刷新机制
```javascript
// 监听Token即将过期
socket.on('token:expiring', async () => {
  const newToken = await refreshToken()
  socket.auth.token = newToken
  socket.connect()
})
```

---

### 3. 事件总线设计

采用发布-订阅模式，解耦业务逻辑：

#### 客服系统事件
```javascript
// 发送消息
sendCustomerMessage({ content, type })

// 监听消息
onCustomerMessage((message) => {
  console.log('收到客服消息:', message)
})

// 监听在线状态
onCustomerStatus((status) => {
  console.log('客服状态:', status)
})
```

#### 聊天系统事件
```javascript
// 加入/离开聊天室
joinChatRoom(roomId)
leaveChatRoom(roomId)

// 发送消息
sendChatMessage({ roomId, content })

// 监听新消息
onNewMessage((message) => {
  updateChatUI(message)
})

// 输入状态
sendTyping(roomId, isTyping)
onTyping(({ userId, isTyping }) => {
  showTypingIndicator(userId, isTyping)
})
```

#### 订单系统事件
```javascript
// 监听订单状态更新
onOrderUpdate((order) => {
  updateOrderStatus(order)
})

// 监听支付确认
onPaymentConfirmed((payment) => {
  showPaymentSuccess(payment)
})
```

#### 通知系统事件
```javascript
// 系统通知
onNotification((notification) => {
  showToast(notification)
})

// AI代理状态
onAIAgentStatus((status) => {
  updateAgentIndicator(status)
})
```

#### 商品系统事件
```javascript
// 价格更新
onPriceUpdate((product) => {
  updateProductPrice(product)
})

// 库存变化
onStockUpdate((product) => {
  updateStockCount(product)
})
```

---

### 4. 单例模式管理

确保全局只有一个Socket实例，避免重复连接：

```javascript
let socket = null

export const initSocket = (token) => {
  // 如果已有连接，先断开
  if (socket) {
    socket.off()
    socket.disconnect()
    socket = null
  }
  
  // 创建新连接
  socket = io(url, { auth: { token } })
  
  // 绑定事件监听器
  bindEvents(socket)
  
  return socket
}

export const getSocket = () => {
  if (!socket) {
    console.warn('Socket未初始化')
    return null
  }
  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.off()
    socket.disconnect()
    socket = null
  }
}
```

---

### 5. 错误处理机制

#### 连接错误
```javascript
socket.on('connect_error', (error) => {
  console.error('连接错误:', error.message)
  // 显示错误提示
  showConnectionError(error)
})
```

#### 认证错误
```javascript
socket.on('auth_error', (error) => {
  console.error('认证失败:', error)
  // Token过期或无效，清除本地存储
  localStorage.removeItem('token')
  window.location.href = '/login'
})
```

#### 断开连接
```javascript
socket.on('disconnect', (reason) => {
  console.warn('连接断开:', reason)
  
  // 服务器主动断开，尝试重连
  if (reason === 'io server disconnect') {
    setTimeout(() => {
      socket.connect()
    }, 2000)
  }
})
```

---

## 性能优化

### 1. 心跳检测
Socket.io内置ping/pong机制，默认25秒检测一次连接状态。

### 2. 二进制数据传输
支持ArrayBuffer和Blob，优化大文件传输性能。

### 3. 消息压缩
启用permessage-deflate扩展，减少网络流量。

### 4. 事件去重
```javascript
// 移除旧监听器，防止内存泄漏
socket.off(eventName)
socket.on(eventName, callback)
```

---

## 安全设计

### 1. WSS加密
生产环境使用wss://协议，数据全程加密传输。

### 2. Token验证
每次连接必须携带有效JWT Token。

### 3. 速率限制
服务端实现消息频率限制，防止DDoS攻击。

### 4. 输入校验
所有消息内容在服务端进行sanitization处理。

---

## 使用示例

### 基础用法

```javascript
import { initSocket, sendChatMessage, onNewMessage } from './websocket'

// 初始化连接
const token = localStorage.getItem('auth_token')
initSocket(token)

// 发送消息
sendChatMessage({
  roomId: 'room_123',
  content: 'Hello!',
  type: 'text'
})

// 监听消息
onNewMessage((message) => {
  console.log('收到消息:', message)
  appendToChat(message)
})
```

### React集成

```jsx
import { useEffect } from 'react'
import { initSocket, onNewMessage, disconnectSocket } from './websocket'

function ChatComponent() {
  useEffect(() => {
    const token = localStorage.getItem('token')
    initSocket(token)
    
    const handleMessage = (message) => {
      // 更新状态
      setMessages(prev => [...prev, message])
    }
    
    onNewMessage(handleMessage)
    
    return () => {
      disconnectSocket()
    }
  }, [])
  
  return <ChatUI />
}
```

### Vue集成

```vue
<script setup>
import { onMounted, onUnmounted } from 'vue'
import { initSocket, onNewMessage, disconnectSocket } from './websocket'

onMounted(() => {
  const token = localStorage.getItem('token')
  initSocket(token)
  
  onNewMessage((message) => {
    messages.value.push(message)
  })
})

onUnmounted(() => {
  disconnectSocket()
})
</script>
```

---

## 监控与调试

### 日志输出
```javascript
// 开发环境启用详细日志
if (process.env.NODE_ENV === 'development') {
  socket.onAny((event, ...args) => {
    console.log(`[WS] ${event}:`, args)
  })
}
```

### 性能监控
```javascript
// 记录消息延迟
const sendMessage = (data) => {
  const startTime = Date.now()
  socket.emit('chat:message', data)
  
  socket.once('chat:messageAck', () => {
    const latency = Date.now() - startTime
    reportMetric('ws_latency', latency)
  })
}
```

---

## 扩展性设计

### 自定义事件
```javascript
// 注册新事件
export const onCustomEvent = (callback) => {
  const sock = getSocket()
  if (sock) {
    sock.on('custom:event', callback)
  }
}

// 触发自定义事件
export const emitCustomEvent = (data) => {
  const sock = getSocket()
  if (sock && sock.connected) {
    sock.emit('custom:event', data)
  }
}
```

### 中间件支持
```javascript
// 添加请求拦截器
socket.io.engine.on('packetCreate', (packet) => {
  console.log('发送数据包:', packet)
  return packet
})

// 添加响应拦截器
socket.io.engine.on('packet', (packet) => {
  console.log('接收数据包:', packet)
})
```

---

## 最佳实践

### ✅ 推荐做法
1. 组件卸载时断开连接
2. 使用事件清理函数防止内存泄漏
3. 实现离线消息队列
4. 添加连接状态指示器
5. 优雅降级（WebSocket不可用时切换HTTP轮询）

### ❌ 避免做法
1. 不要创建多个Socket实例
2. 不要在循环中注册事件监听器
3. 不要忽略错误处理
4. 不要在生产环境使用ws://协议
5. 不要在前端存储敏感Token（使用HttpOnly Cookie）

---

## 法律保护

- ✅ 架构原创，Git提交时间戳确权
- ✅ 可申请软件著作权
- ✅ Apache-2.0协议保护知识产权
- ✅ AI仅作为代码辅助工具，设计版权归属作者

---

**Author**: 超  
**Email**: 86609013@qq.com  
**GitHub**: https://github.com/yongchaoqiu111
