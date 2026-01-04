import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Message } from '@/types/message'
import { MessageStatus } from '@/types/message'
import { sendMessage, loadHistoryMessages, revokeMessage, deleteMessage } from '@/services/messageService'
import { INITIAL_MESSAGE_COUNT, PAGE_SIZE, REVOKE_TIME_LIMIT } from '@/config'
import { useNetworkStore } from './networkStore'

/**
 * 消息Store
 * 统一管理消息状态
 */
export const useMessageStore = defineStore('message', () => {
  // 消息列表
  const messages = ref<Message[]>([])
  // 是否正在加载历史消息
  const isLoadingHistory = ref(false)
  // 是否还有更多历史消息
  const hasMoreHistory = ref(true)
  // 最早的消息时间戳（用于分页）
  const earliestTimestamp = ref<number | null>(null)
  // 加载历史消息的错误信息
  const loadHistoryError = ref<string | null>(null)
  // 搜索和过滤条件
  const searchFilter = ref<{
    keyword: string
    sender: string
  }>({
    keyword: '',
    sender: ''
  })

  /**
   * 初始化历史消息
   */
  const initMessages = () => {
    const initialMessages: Message[] = []
    const now = Date.now()

    // 模拟发送人列表
    const senders = ['用户A', '用户B', '用户C', '系统', '管理员']

    // 生成指定数量的历史消息，跨越多天
    // 跨越多天（默认5天），确保能看到日期分组效果
    const daysToSpan = 5 // 跨5天
    const messagesPerDay = Math.ceil(INITIAL_MESSAGE_COUNT / daysToSpan)

    for (let i = 0; i < INITIAL_MESSAGE_COUNT; i++) {
      // 计算消息所属的天数（0表示今天，1表示昨天，以此类推）
      const dayOffset = Math.floor(i / messagesPerDay)
      // 计算当天的消息索引
      const dayIndex = i % messagesPerDay

      // 计算当天的开始时间（当天00:00:00）
      const today = new Date(now)
      today.setHours(0, 0, 0, 0)
      const dayStart = today.getTime() - dayOffset * 24 * 60 * 60 * 1000

      // 生成时间戳：当天开始时间 + 消息在当天的时间偏移（从早到晚）
      // 假设每天的消息分布在 8:00 - 22:00 之间
      const hoursInDay = 14 // 14小时（8点到22点）
      const hourOffset = Math.floor((dayIndex / messagesPerDay) * hoursInDay) + 8 // 8点开始
      const minuteOffset = Math.floor(((dayIndex % messagesPerDay) / messagesPerDay) * 60) // 分钟偏移

      let timestamp = dayStart + hourOffset * 60 * 60 * 1000 + minuteOffset * 60 * 1000

      // 确保时间戳不超过当前时间（不生成未来的数据）
      if (timestamp > now) {
        // 如果生成的时间戳是未来的，则使用当前时间减去一个随机的小偏移（1-60分钟）
        const randomMinutes = Math.floor(Math.random() * 60) + 1
        timestamp = now - randomMinutes * 60 * 1000
      }

      initialMessages.push({
        id: `msg-${timestamp}-${i}`,
        content: `历史消息 ${i + 1}: 这是${dayOffset === 0 ? '今天' : dayOffset === 1 ? '昨天' : `${dayOffset}天前`}的消息内容，用于测试日期分组功能。`,
        timestamp,
        status: MessageStatus.SUCCESS,
        sender: senders[i % senders.length] // 循环分配发送人
      })
    }

    // 按时间戳排序，确保最新的消息在底部（从早到晚）
    initialMessages.sort((a, b) => a.timestamp - b.timestamp)

    messages.value = initialMessages
    // 设置最早的消息时间戳
    earliestTimestamp.value = initialMessages[0]?.timestamp || null
  }

  /**
   * 添加新消息
   */
  const addMessage = (content: string, sender?: string): string => {
    const newMessage: Message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      content,
      timestamp: Date.now(),
      status: MessageStatus.SENDING,
      sender: sender || '我' // 默认发送人为"我"
    }

    messages.value.push(newMessage)
    return newMessage.id
  }

  /**
   * 更新消息状态
   */
  const updateMessageStatus = (id: string, status: MessageStatus) => {
    const message = messages.value.find(msg => msg.id === id)
    if (message) {
      message.status = status
    }
  }

  /**
   * 发送消息
   */
  const sendNewMessage = async (content: string) => {
    const networkStore = useNetworkStore()
    const messageId = addMessage(content)

    // 如果网络离线，将消息标记为等待发送
    if (!networkStore.isOnline) {
      updateMessageStatus(messageId, MessageStatus.PENDING)
      return messageId
    }

    try {
      const response = await sendMessage(content)
      if (response.success) {
        updateMessageStatus(messageId, MessageStatus.SUCCESS)
      } else {
        // 如果是因为网络断开失败，标记为等待发送
        if (response.error?.includes('网络已断开')) {
          updateMessageStatus(messageId, MessageStatus.PENDING)
        } else {
          updateMessageStatus(messageId, MessageStatus.FAILED)
        }
      }
    } catch (error) {
      // 检查是否是网络错误
      if (!networkStore.isOnline) {
        updateMessageStatus(messageId, MessageStatus.PENDING)
      } else {
        updateMessageStatus(messageId, MessageStatus.FAILED)
      }
    }

    return messageId
  }

  /**
   * 重试发送消息
   */
  const retryMessage = async (id: string) => {
    const networkStore = useNetworkStore()
    const message = messages.value.find(msg => msg.id === id)
    if (!message) return

    // 如果网络离线，标记为等待发送
    if (!networkStore.isOnline) {
      updateMessageStatus(id, MessageStatus.PENDING)
      return
    }

    updateMessageStatus(id, MessageStatus.SENDING)

    try {
      const response = await sendMessage(message.content)
      if (response.success) {
        updateMessageStatus(id, MessageStatus.SUCCESS)
      } else {
        // 如果是因为网络断开失败，标记为等待发送
        if (response.error?.includes('网络已断开')) {
          updateMessageStatus(id, MessageStatus.PENDING)
        } else {
          updateMessageStatus(id, MessageStatus.FAILED)
        }
      }
    } catch (error) {
      // 检查是否是网络错误
      if (!networkStore.isOnline) {
        updateMessageStatus(id, MessageStatus.PENDING)
      } else {
        updateMessageStatus(id, MessageStatus.FAILED)
      }
    }
  }

  /**
   * 获取待发送的消息列表
   */
  const getPendingMessages = computed(() => {
    return messages.value.filter(msg => msg.status === MessageStatus.PENDING)
  })

  /**
   * 重发所有待发送的消息
   */
  const resendPendingMessages = async () => {
    const networkStore = useNetworkStore()

    console.log('开始重发待发送消息，网络状态:', networkStore.isOnline)

    // 如果网络离线，不执行重发
    if (!networkStore.isOnline) {
      console.log('网络离线，取消重发')
      networkStore.finishReconnect()
      return
    }

    const pendingMessages = getPendingMessages.value
    console.log('待发送消息数量:', pendingMessages.length)

    // 如果没有待发送的消息，直接完成重连
    if (pendingMessages.length === 0) {
      console.log('没有待发送的消息，完成重连')
      networkStore.finishReconnect()
      return
    }

    // 逐个重发待发送的消息
    for (const message of pendingMessages) {
      // 再次检查网络状态
      if (!networkStore.isOnline) {
        networkStore.finishReconnect()
        break
      }

      updateMessageStatus(message.id, MessageStatus.SENDING)

      try {
        const response = await sendMessage(message.content)
        if (response.success) {
          updateMessageStatus(message.id, MessageStatus.SUCCESS)
        } else {
          // 如果是因为网络断开失败，保持等待状态
          if (response.error?.includes('网络已断开')) {
            updateMessageStatus(message.id, MessageStatus.PENDING)
            networkStore.finishReconnect()
            break // 网络断开，停止重发
          } else {
            updateMessageStatus(message.id, MessageStatus.FAILED)
          }
        }
      } catch (error) {
        // 检查是否是网络错误
        if (!networkStore.isOnline) {
          updateMessageStatus(message.id, MessageStatus.PENDING)
          networkStore.finishReconnect()
          break // 网络断开，停止重发
        } else {
          updateMessageStatus(message.id, MessageStatus.FAILED)
        }
      }

      // 添加小延迟，避免请求过快
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // 所有消息处理完成后，完成重连
    networkStore.finishReconnect()
  }

  /**
   * 加载历史消息（分页）
   */
  const loadMoreHistory = async () => {
    // 如果正在加载或没有更多消息，直接返回
    if (isLoadingHistory.value || !hasMoreHistory.value) {
      return false
    }

    // 如果没有最早的时间戳，无法加载
    if (earliestTimestamp.value === null) {
      return false
    }

    isLoadingHistory.value = true
    loadHistoryError.value = null // 清除之前的错误

    try {
      const response = await loadHistoryMessages(earliestTimestamp.value, PAGE_SIZE)

      if (response.success && response.data) {
        // 将历史消息插入到列表前面
        const historyMessages: Message[] = response.data.messages.map(msg => ({
          ...msg,
          status: MessageStatus.SUCCESS
        }))

        // 确保历史消息按时间戳排序（从早到晚）
        historyMessages.sort((a, b) => a.timestamp - b.timestamp)

        // 合并消息列表，确保整个列表按时间戳排序（从早到晚，最新的在底部）
        messages.value = [...historyMessages, ...messages.value].sort((a, b) => a.timestamp - b.timestamp)

        // 更新最早的时间戳
        if (historyMessages.length > 0) {
          earliestTimestamp.value = historyMessages[0].timestamp
        }

        // 更新是否还有更多消息
        hasMoreHistory.value = response.data.hasMore

        return true
      } else {
        // 设置错误信息
        loadHistoryError.value = response.error || '加载历史消息失败，请稍后重试'
        console.error('加载历史消息失败:', response.error)
        return false
      }
    } catch (error) {
      // 设置错误信息
      const errorMessage = error instanceof Error ? error.message : '加载历史消息异常，请稍后重试'
      loadHistoryError.value = errorMessage
      console.error('加载历史消息异常:', error)
      return false
    } finally {
      isLoadingHistory.value = false
    }
  }

  /**
   * 清除加载历史消息的错误
   */
  const clearLoadHistoryError = () => {
    loadHistoryError.value = null
  }

  /**
   * 设置搜索和过滤条件
   */
  const setSearchFilter = (filter: { keyword: string; sender: string }) => {
    searchFilter.value = filter
  }

  /**
   * 过滤后的消息列表
   */
  const filteredMessages = computed(() => {
    let result = messages.value

    // 关键字搜索
    if (searchFilter.value.keyword) {
      const keyword = searchFilter.value.keyword.toLowerCase()
      result = result.filter((msg) =>
        msg.content.toLowerCase().includes(keyword)
      )
    }

    // 发送人过滤
    if (searchFilter.value.sender) {
      result = result.filter((msg) => msg.sender === searchFilter.value.sender)
    }

    return result
  })

  /**
   * 计算属性：消息总数
   */
  const messageCount = computed(() => messages.value.length)

  /**
   * 检查消息是否可以撤回
   * 条件：消息发送成功、未撤回、未删除，且在时间限制内（2分钟）
   */
  const canRevokeMessage = (messageId: string): boolean => {
    const message = messages.value.find(msg => msg.id === messageId)
    if (!message) return false

    // 必须是发送成功的消息
    if (message.status !== MessageStatus.SUCCESS) return false

    // 不能是已撤回或已删除的消息
    if (message.isRevoked || message.isDeleted) return false

    // 检查是否在撤回时间限制内（2分钟）
    const now = Date.now()
    const timeDiff = now - message.timestamp
    return timeDiff <= REVOKE_TIME_LIMIT
  }

  /**
   * 撤回消息
   */
  const revokeMessageById = async (messageId: string): Promise<boolean> => {
    const message = messages.value.find(msg => msg.id === messageId)
    if (!message) {
      console.error('消息不存在:', messageId)
      return false
    }

    // 检查是否可以撤回
    if (!canRevokeMessage(messageId)) {
      console.error('消息不可撤回:', messageId)
      return false
    }

    try {
      const response = await revokeMessage(messageId)
      if (response.success) {
        // 标记消息为已撤回
        message.isRevoked = true
        return true
      } else {
        console.error('撤回消息失败:', response.error)
        return false
      }
    } catch (error) {
      console.error('撤回消息异常:', error)
      return false
    }
  }

  /**
   * 删除消息
   */
  const deleteMessageById = async (messageId: string): Promise<boolean> => {
    const message = messages.value.find(msg => msg.id === messageId)
    if (!message) {
      console.error('消息不存在:', messageId)
      return false
    }

    // 不能删除已撤回或已删除的消息
    if (message.isRevoked || message.isDeleted) {
      console.error('消息已撤回或已删除:', messageId)
      return false
    }

    try {
      const response = await deleteMessage(messageId)
      if (response.success) {
        // 标记消息为已删除
        message.isDeleted = true
        return true
      } else {
        console.error('删除消息失败:', response.error)
        return false
      }
    } catch (error) {
      console.error('删除消息异常:', error)
      return false
    }
  }

  /**
   * 获取最新发送的消息（用于撤回功能）
   */
  const getLatestSentMessage = (): Message | null => {
    // 过滤出发送成功的消息，按时间戳倒序排列
    const sentMessages = messages.value
      .filter(msg => msg.status === MessageStatus.SUCCESS && !msg.isRevoked && !msg.isDeleted)
      .sort((a, b) => b.timestamp - a.timestamp)

    return sentMessages.length > 0 ? sentMessages[0] : null
  }

  return {
    messages,
    messageCount,
    isLoadingHistory,
    hasMoreHistory,
    loadHistoryError,
    filteredMessages,
    searchFilter,
    getPendingMessages,
    initMessages,
    addMessage,
    updateMessageStatus,
    sendNewMessage,
    retryMessage,
    loadMoreHistory,
    clearLoadHistoryError,
    setSearchFilter,
    resendPendingMessages,
    canRevokeMessage,
    revokeMessageById,
    deleteMessageById,
    getLatestSentMessage
  }
})

