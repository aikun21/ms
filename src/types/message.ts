/**
 * 消息状态枚举
 */
export enum MessageStatus {
  SENDING = 'sending',      // 发送中
  SUCCESS = 'success',      // 发送成功
  FAILED = 'failed',        // 发送失败
  PENDING = 'pending'       // 等待发送（离线时缓存）
}

/**
 * 消息类型接口
 */
export interface Message {
  id: string
  content: string
  timestamp: number
  status: MessageStatus
  sender?: string // 发送人（可选）
  isRevoked?: boolean // 是否已撤回
  isDeleted?: boolean // 是否已删除
}

/**
 * 列表项类型（可以是消息或日期标题）
 */
export type ListItem =
  | { type: 'message'; data: Message; id: string }
  | { type: 'date'; data: { date: string }; id: string }

