/**
 * WebSocket通信框架 - 使用示例
 * 
 * 演示如何初始化和使用WebSocket实时通信
 */

console.log('=== WebSocket通信框架 - 使用示例 ===\n')

// 模拟WebSocket客户端（实际使用时从src/utils/websocket导入）
class MockSocket {
  constructor(url, options) {
    this.url = url
    this.auth = options.auth
    this.connected = false
    this.listeners = new Map()
    
    console.log(`🔌 正在连接到 ${url}...`)
    console.log(`🔑 Token: ${this.auth.token.substring(0, 20)}...`)
    
    // 模拟连接成功
    setTimeout(() => {
      this.connected = true
      console.log('✅ 连接成功! Socket ID: mock_socket_12345\n')
      this.emit('connect')
    }, 1000)
  }
  
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)
  }
  
  off(event) {
    this.listeners.delete(event)
  }
  
  emit(event, ...args) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => cb(...args))
    }
  }
  
  disconnect() {
    this.connected = false
    console.log('🔌 连接已断开')
  }
}

// 模拟初始化函数
function initSocket(token) {
  return new MockSocket('ws://localhost:3001', {
    auth: { token }
  })
}

// 模拟发送消息函数
function sendChatMessage(socket, data) {
  if (socket && socket.connected) {
    console.log('💬 发送消息:', data)
    // 模拟服务器响应
    setTimeout(() => {
      socket.emit('chat:newMessage', {
        id: 'msg_' + Date.now(),
        content: '收到你的消息: ' + data.content,
        sender: 'server',
        timestamp: new Date().toISOString()
      })
    }, 500)
  } else {
    console.error('❌ Socket未连接')
  }
}

// 模拟监听函数
function onNewMessage(socket, callback) {
  if (socket) {
    socket.on('chat:newMessage', callback)
  }
}

// ========== 示例代码 ==========

console.log('📝 示例1: 基础连接和消息收发\n')

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_token'
const socket = initSocket(token)

// 监听连接事件
socket.on('connect', () => {
  console.log('🎉 WebSocket已就绪，可以开始通信\n')
  
  // 发送第一条消息
  sendChatMessage(socket, {
    roomId: 'room_demo',
    content: 'Hello WebSocket!',
    type: 'text'
  })
})

// 监听新消息
onNewMessage(socket, (message) => {
  console.log('📨 收到新消息:')
  console.log('   ID:', message.id)
  console.log('   内容:', message.content)
  console.log('   发送者:', message.sender)
  console.log('   时间:', message.timestamp)
  console.log()
})

// 等待2秒后发送第二条消息
setTimeout(() => {
  console.log('📝 示例2: 发送第二条消息\n')
  sendChatMessage(socket, {
    roomId: 'room_demo',
    content: '这是第二条测试消息',
    type: 'text'
  })
}, 2000)

// 等待4秒后断开连接
setTimeout(() => {
  console.log('📝 示例3: 主动断开连接\n')
  socket.disconnect()
  
  console.log('\n✅ 所有示例运行完成！')
  console.log('\n💡 提示: 实际使用时请导入 src/utils/websocket.js')
  console.log('   支持的事件包括:')
  console.log('   - 客服系统: customer:message, customer:status')
  console.log('   - 聊天系统: chat:message, chat:newMessage, chat:typing')
  console.log('   - 订单系统: order:updated, payment:confirmed')
  console.log('   - 通知系统: notification:new, ai:agentStatus')
  console.log('   - 商品系统: product:priceUpdate, product:stockUpdate')
}, 4000)
