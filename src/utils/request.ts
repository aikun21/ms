import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import { API_CONFIG } from '@/config'

/**
 * HTTP请求封装模块
 * 配置基础URL、超时和错误处理
 */
class Request {
  private instance: AxiosInstance

  constructor() {
    this.instance = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    this.setupInterceptors()
  }

  /**
   * 设置请求和响应拦截器
   */
  private setupInterceptors() {
    // 请求拦截器
    this.instance.interceptors.request.use(
      (config) => {
        // 可以在这里添加token等认证信息
        return config
      },
      (error: AxiosError) => {
        return Promise.reject(error)
      }
    )

    // 响应拦截器
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response
      },
      (error: AxiosError) => {
        // 统一错误处理
        if (error.response) {
          // 服务器返回了错误状态码
          const status = error.response.status
          switch (status) {
            case 400:
              console.error('请求参数错误')
              break
            case 401:
              console.error('未授权，请重新登录')
              break
            case 403:
              console.error('拒绝访问')
              break
            case 404:
              console.error('请求地址不存在')
              break
            case 500:
              console.error('服务器内部错误')
              break
            default:
              console.error('请求失败')
          }
        } else if (error.request) {
          // 请求已发出但没有收到响应
          console.error('网络错误，请检查网络连接')
        } else {
          // 其他错误
          console.error('请求配置错误', error.message)
        }
        return Promise.reject(error)
      }
    )
  }

  /**
   * GET请求
   */
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.get(url, config).then(res => res.data)
  }

  /**
   * POST请求
   */
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.post(url, data, config).then(res => res.data)
  }

  /**
   * PUT请求
   */
  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.put(url, data, config).then(res => res.data)
  }

  /**
   * DELETE请求
   */
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.delete(url, config).then(res => res.data)
  }
}

export default new Request()

