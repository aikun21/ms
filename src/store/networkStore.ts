import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

/**
 * 网络状态Store
 * 管理网络连接状态和重连机制
 */
export const useNetworkStore = defineStore('network', () => {
  // 网络连接状态
  const isOnline = ref(navigator.onLine)
  // 是否正在重连
  const isReconnecting = ref(false)
  // 重连尝试次数
  const reconnectAttempts = ref(0)
  // 最大重连尝试次数
  const MAX_RECONNECT_ATTEMPTS = 5
  // 重连间隔（毫秒）
  const RECONNECT_INTERVAL = 3000

  let reconnectTimer: number | null = null

  /**
   * 检查网络状态
   */
  const checkNetworkStatus = () => {
    const wasOnline = isOnline.value
    isOnline.value = navigator.onLine

    // 如果从离线变为在线，触发重连
    if (!wasOnline && isOnline.value) {
      handleReconnect()
    }
  }

  /**
   * 模拟网络断开
   */
  const simulateOffline = () => {
    isOnline.value = false
    isReconnecting.value = false
    reconnectAttempts.value = 0
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  /**
   * 模拟网络恢复
   */
  const simulateOnline = () => {
    isOnline.value = true
    handleReconnect()
  }

  /**
   * 处理重连
   */
  const handleReconnect = () => {
    if (isReconnecting.value) {
      return
    }

    // 如果网络不在线，不执行重连
    if (!isOnline.value) {
      return
    }

    isReconnecting.value = true
    reconnectAttempts.value = 0

    // 清除之前的重连定时器
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }

    // 触发重连事件
    window.dispatchEvent(new CustomEvent('network-reconnected'))
  }

  /**
   * 完成重连
   */
  const finishReconnect = () => {
    isReconnecting.value = false
    reconnectAttempts.value = 0
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  /**
   * 开始重连尝试
   */
  const startReconnectAttempt = () => {
    if (reconnectAttempts.value >= MAX_RECONNECT_ATTEMPTS) {
      isReconnecting.value = false
      return
    }

    reconnectAttempts.value++
    
    reconnectTimer = window.setTimeout(() => {
      if (!isOnline.value) {
        // 继续尝试重连
        startReconnectAttempt()
      } else {
        // 网络已恢复
        handleReconnect()
      }
    }, RECONNECT_INTERVAL)
  }

  /**
   * 停止重连
   */
  const stopReconnecting = () => {
    isReconnecting.value = false
    reconnectAttempts.value = 0
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  // 监听浏览器网络状态变化
  if (typeof window !== 'undefined') {
    window.addEventListener('online', checkNetworkStatus)
    window.addEventListener('offline', checkNetworkStatus)
  }

  return {
    isOnline,
    isReconnecting,
    reconnectAttempts,
    simulateOffline,
    simulateOnline,
    startReconnectAttempt,
    stopReconnecting,
    finishReconnect
  }
})

