/**
 * 应用配置
 * 
 * 修改 INITIAL_MESSAGE_COUNT 可以自定义初始化消息条数
 * 修改 PAGE_SIZE 可以自定义每页加载的消息条数
 * 修改 MESSAGE_ITEM_HEIGHT 可以自定义消息项的高度（用于虚拟滚动计算）
 */
export const INITIAL_MESSAGE_COUNT = 1000 // 初始化消息条数，可根据需要修改
export const PAGE_SIZE = 50 // 每页加载的消息条数，可根据需要修改
export const MESSAGE_ITEM_HEIGHT = 80 // 消息项高度（像素），用于虚拟滚动计算，需要与实际渲染高度一致
export const DATE_HEADER_HEIGHT = 44 // 日期标题高度（像素），用于虚拟滚动计算
export const REVOKE_TIME_LIMIT = 2 * 60 * 1000 // 撤回时间限制（2分钟，毫秒）

export const API_CONFIG = {
  BASE_URL: '/api',
  TIMEOUT: 10000 // 10秒超时
}

/**
 * 模拟接口配置
 * 用于测试和开发环境的模拟接口参数
 */
export const MOCK_API_CONFIG = {
  // 发送消息接口配置
  SEND_MESSAGE: {
    DELAY_MIN: 500, // 最小延迟（毫秒）
    DELAY_MAX: 2000, // 最大延迟（毫秒）
    SUCCESS_RATE: 0.7 // 成功率（0-1之间，0.7表示70%成功率）
  },
  // 加载历史消息接口配置
  LOAD_HISTORY: {
    DELAY_MIN: 300, // 最小延迟（毫秒）
    DELAY_MAX: 1000, // 最大延迟（毫秒）
    SUCCESS_RATE: 0.8 // 成功率（0-1之间，0.8表示80%成功率）
  }
}

