import axios, { type AxiosInstance, type AxiosError } from 'axios'
import { ElMessage } from 'element-plus'

const instance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// ---------- 请求拦截器 ----------
instance.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => Promise.reject(error),
)

// ---------- 响应拦截器 ----------
instance.interceptors.response.use(
  (response) => {
    const { code, message, data } = response.data
    if (code === 200) {
      return data
    }
    // 业务错误
    handleBusinessError(code, message)
    return Promise.reject(new Error(message))
  },
  (error: AxiosError) => {
    handleHttpError(error)
    return Promise.reject(error)
  },
)

/** 处理业务错误码 */
function handleBusinessError(code: number, message: string) {
  switch (code) {
    case 40001:
      ElMessage.warning(message || '请输入 SQL 语句')
      break
    case 40002:
      ElMessage.warning('SQL 语句过长，建议分批解析')
      break
    case 40003:
      ElMessage.error({
        message: message || 'SQL 语法错误',
        duration: 5000,
      })
      break
    case 40004:
      ElMessage.info('未检测到有效的 CREATE TABLE 语句')
      break
    case 50000:
      ElMessage.error('服务异常，请稍后重试')
      break
    default:
      ElMessage.error(message || '请求失败')
  }
}

/** 处理 HTTP 错误 */
function handleHttpError(error: AxiosError) {
  if (error.response) {
    const status = error.response.status
    const errorMap: Record<number, string> = {
      400: '请求参数有误',
      500: '服务器异常，请稍后重试',
    }
    ElMessage.error(errorMap[status] || `请求失败 (${status})`)
  } else if (error.code === 'ECONNABORTED') {
    ElMessage.error('请求超时，请检查网络')
  } else {
    ElMessage.error('网络连接失败，请检查后端服务')
  }
}

export default instance
