import request from './index'
import type { ParseRequest, ParseResponse, ExampleResponse, HealthResponse } from '@/types'

/**
 * 解析 SQL 建表语句
 * POST /api/parse
 */
export function parseSql(params: ParseRequest): Promise<ParseResponse> {
  return request.post('/api/parse', params)
}

/**
 * 获取示例 SQL
 * GET /api/example
 */
export function getExample(): Promise<ExampleResponse> {
  return request.get('/api/example')
}

/**
 * 健康检查
 * GET /api/health
 */
export function healthCheck(): Promise<HealthResponse> {
  return request.get('/api/health')
}

/**
 * 带重试的健康检查
 * @param maxRetries 最大重试次数，默认 2
 * @returns 服务是否可用
 */
export async function healthCheckWithRetry(maxRetries = 2): Promise<boolean> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      await healthCheck()
      return true
    } catch {
      if (i < maxRetries) {
        await new Promise((r) => setTimeout(r, 2000))
      }
    }
  }
  return false
}
