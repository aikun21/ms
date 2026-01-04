// import request from '@/utils/request' // 当前使用模拟接口，实际项目中取消注释并使用
import { MOCK_API_CONFIG } from '@/config'

/**
 * 消息发送响应接口
 */
export interface SendMessageResponse {
    success: boolean
    message?: string
    error?: string
}

/**
 * 历史消息分页响应接口
 */
export interface HistoryMessagesResponse {
    success: boolean
    data?: {
        messages: Array<{
            id: string
            content: string
            timestamp: number
        }>
        hasMore: boolean // 是否还有更多历史消息
    }
    error?: string
}

/**
 * 撤回/删除消息响应接口
 */
export interface RevokeMessageResponse {
    success: boolean
    message?: string
    error?: string
}

/**
 * 模拟网络状态（用于测试）
 */
let mockNetworkOnline = true

/**
 * 设置模拟网络状态
 */
export const setMockNetworkStatus = (online: boolean) => {
    mockNetworkOnline = online
}

/**
 * 获取当前网络状态
 */
export const getNetworkStatus = (): boolean => {
    // 优先使用浏览器API，如果没有则使用模拟状态
    if (typeof navigator !== 'undefined' && navigator.onLine !== undefined) {
        return navigator.onLine && mockNetworkOnline
    }
    return mockNetworkOnline
}

/**
 * 模拟接口函数
 * 异步方式模拟消息发送，随机返回成功或失败
 * 延迟0.5至2秒
 */
export const sendMessage = async (_content: string): Promise<SendMessageResponse> => {
    // 检查网络状态
    if (!getNetworkStatus()) {
        return Promise.resolve({
            success: false,
            error: '网络已断开，消息已保存到待发送队列'
        })
    }

    // 使用封装的请求模块调用
    // 注意：这里使用模拟延迟，实际项目中应该调用真实API
    return new Promise((resolve) => {
        // 随机延迟（从配置中读取）
        const delay = Math.random() * (MOCK_API_CONFIG.SEND_MESSAGE.DELAY_MAX - MOCK_API_CONFIG.SEND_MESSAGE.DELAY_MIN) + MOCK_API_CONFIG.SEND_MESSAGE.DELAY_MIN
        // 随机成功或失败（从配置中读取成功率）
        const success = Math.random() > (1 - MOCK_API_CONFIG.SEND_MESSAGE.SUCCESS_RATE)

        setTimeout(() => {
            // 再次检查网络状态（可能在延迟期间网络断开）
            if (!getNetworkStatus()) {
                resolve({
                    success: false,
                    error: '网络已断开，消息已保存到待发送队列'
                })
                return
            }

            if (success) {
                resolve({
                    success: true,
                    message: '消息发送成功'
                })
            } else {
                resolve({
                    success: false,
                    error: '网络错误，请稍后重试'
                })
            }
        }, delay)
    })
}

/**
 * 加载历史消息（分页）
 * 模拟后端分页接口
 * @param beforeTimestamp 获取此时间戳之前的消息
 * @param pageSize 每页数量
 */
export const loadHistoryMessages = async (
    beforeTimestamp: number,
    pageSize: number
): Promise<HistoryMessagesResponse> => {
    // 模拟接口延迟（从配置中读取）
    return new Promise((resolve) => {
        const delay = Math.random() * (MOCK_API_CONFIG.LOAD_HISTORY.DELAY_MAX - MOCK_API_CONFIG.LOAD_HISTORY.DELAY_MIN) + MOCK_API_CONFIG.LOAD_HISTORY.DELAY_MIN
        const success = Math.random() > (1 - MOCK_API_CONFIG.LOAD_HISTORY.SUCCESS_RATE) // 从配置中读取成功率

        setTimeout(() => {
            if (success) {
                // 模拟生成历史消息，跨越多天
                const messages = []

                // 计算基础时间戳（beforeTimestamp之前）
                const baseDate = new Date(beforeTimestamp)
                baseDate.setHours(0, 0, 0, 0) // 设置为当天的开始
                let baseTimestamp = baseDate.getTime()

                // 如果baseTimestamp为0或负数，说明已经到达最早的消息
                if (baseTimestamp <= 0) {
                    resolve({
                        success: true,
                        data: {
                            messages: [],
                            hasMore: false
                        }
                    })
                    return
                }

                // 模拟发送人列表
                const senders = ['用户A', '用户B', '用户C', '系统', '管理员']

                // 计算要生成的消息数量，跨越多天
                let generatedCount = 0
                let currentDayOffset = 0 // 从beforeTimestamp的前一天开始
                const maxDays = 7 // 最多往前查找7天

                while (generatedCount < pageSize && currentDayOffset < maxDays) {
                    // 计算当天的开始时间
                    const dayStart = baseTimestamp - currentDayOffset * 24 * 60 * 60 * 1000

                    // 如果当天的开始时间小于等于0，说明没有更多消息了
                    if (dayStart <= 0) {
                        break
                    }

                    // 每天生成一定数量的消息
                    const messagesPerDay = Math.min(pageSize - generatedCount, Math.ceil(pageSize / 3))

                    for (let i = 0; i < messagesPerDay && generatedCount < pageSize; i++) {
                        // 计算消息在当天的时间（分布在8:00-22:00之间）
                        const hourOffset = 8 + Math.floor((i / messagesPerDay) * 14) // 8点到22点
                        const minuteOffset = Math.floor(((i % messagesPerDay) / messagesPerDay) * 60)

                        let timestamp = dayStart + hourOffset * 60 * 60 * 1000 + minuteOffset * 60 * 1000

                        // 确保时间戳小于beforeTimestamp且不超过当前时间（不生成未来的数据）
                        const now = Date.now()
                        if (timestamp < beforeTimestamp && timestamp <= now) {
                            const dayOffset = currentDayOffset
                            messages.push({
                                id: `msg-${timestamp}-${Math.random()}`,
                                content: `历史消息 ${timestamp}: 这是${dayOffset === 0 ? '昨天' : `${dayOffset + 1}天前`}的消息内容，通过分页加载。`,
                                timestamp,
                                sender: senders[generatedCount % senders.length]
                            })
                            generatedCount++
                        } else if (timestamp >= now) {
                            // 如果生成的时间戳是未来的，则使用当前时间减去一个随机的小偏移（1-60分钟）
                            const randomMinutes = Math.floor(Math.random() * 60) + 1
                            timestamp = now - randomMinutes * 60 * 1000
                            if (timestamp < beforeTimestamp) {
                                const dayOffset = currentDayOffset
                                messages.push({
                                    id: `msg-${timestamp}-${Math.random()}`,
                                    content: `历史消息 ${timestamp}: 这是${dayOffset === 0 ? '昨天' : `${dayOffset + 1}天前`}的消息内容，通过分页加载。`,
                                    timestamp,
                                    sender: senders[generatedCount % senders.length]
                                })
                                generatedCount++
                            }
                        }
                    }

                    currentDayOffset++
                }

                // 按时间戳排序（从早到晚）
                messages.sort((a, b) => a.timestamp - b.timestamp)

                // 模拟是否还有更多消息（如果还能往前查找更多天，说明还有更多）
                const hasMore = baseTimestamp - currentDayOffset * 24 * 60 * 60 * 1000 > 0

                resolve({
                    success: true,
                    data: {
                        messages,
                        hasMore
                    }
                })
            } else {
                resolve({
                    success: false,
                    error: '加载历史消息失败，请稍后重试'
                })
            }
        }, delay)
    })
}

/**
 * 撤回消息
 * 模拟后端撤回消息接口
 * @param messageId 消息ID
 */
export const revokeMessage = async (messageId: string): Promise<RevokeMessageResponse> => {
    // 检查网络状态
    if (!getNetworkStatus()) {
        return Promise.resolve({
            success: false,
            error: '网络已断开，无法撤回消息'
        })
    }

    // 模拟接口延迟
    return new Promise((resolve) => {
        const delay = Math.random() * 300 + 200 // 200-500ms延迟
        const success = Math.random() > 0.1 // 90%成功率

        setTimeout(() => {
            // 再次检查网络状态
            if (!getNetworkStatus()) {
                resolve({
                    success: false,
                    error: '网络已断开，无法撤回消息'
                })
                return
            }

            if (success) {
                resolve({
                    success: true,
                    message: '消息已撤回'
                })
            } else {
                resolve({
                    success: false,
                    error: '撤回消息失败，请稍后重试'
                })
            }
        }, delay)
    })
}

/**
 * 删除消息
 * 模拟后端删除消息接口
 * @param messageId 消息ID
 */
export const deleteMessage = async (messageId: string): Promise<RevokeMessageResponse> => {
    // 检查网络状态
    if (!getNetworkStatus()) {
        return Promise.resolve({
            success: false,
            error: '网络已断开，无法删除消息'
        })
    }

    // 模拟接口延迟
    return new Promise((resolve) => {
        const delay = Math.random() * 300 + 200 // 200-500ms延迟
        const success = Math.random() > 0.05 // 95%成功率

        setTimeout(() => {
            // 再次检查网络状态
            if (!getNetworkStatus()) {
                resolve({
                    success: false,
                    error: '网络已断开，无法删除消息'
                })
                return
            }

            if (success) {
                resolve({
                    success: true,
                    message: '消息已删除'
                })
            } else {
                resolve({
                    success: false,
                    error: '删除消息失败，请稍后重试'
                })
            }
        }, delay)
    })
}

// 如果使用真实API，可以这样调用：
// export const sendMessage = async (content: string): Promise<SendMessageResponse> => {
//   return request.post<SendMessageResponse>('/messages', { content })
// }
// export const loadHistoryMessages = async (beforeTimestamp: number, pageSize: number): Promise<HistoryMessagesResponse> => {
//   return request.get<HistoryMessagesResponse>('/messages/history', {
//     params: { beforeTimestamp, pageSize }
//   })
// }
// export const revokeMessage = async (messageId: string): Promise<RevokeMessageResponse> => {
//   return request.post<RevokeMessageResponse>('/messages/revoke', { messageId })
// }
// export const deleteMessage = async (messageId: string): Promise<RevokeMessageResponse> => {
//   return request.post<RevokeMessageResponse>('/messages/delete', { messageId })
// }

