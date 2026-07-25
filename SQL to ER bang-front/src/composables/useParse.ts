import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { parseSql, getExample } from '@/api/parse'
import type { TableInfo } from '@/types'

export function useParse() {
  const sqlText = ref('')
  const tables = ref<TableInfo[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /** 解析 SQL */
  async function parse(sql?: string) {
    const targetSql = sql ?? sqlText.value

    if (!targetSql.trim()) {
      ElMessage.warning('请输入 SQL 语句')
      return
    }

    loading.value = true
    error.value = null

    try {
      const result = await parseSql({ sql: targetSql })
      tables.value = result.tables

      if (result.tables.length === 0) {
        ElMessage.info('解析完成，但未识别到有效表结构')
      } else {
        ElMessage.success(`解析成功，共识别 ${result.tables.length} 张表`)
      }
    } catch (err: any) {
      error.value = err?.message || '解析失败'
      tables.value = []
    } finally {
      loading.value = false
    }
  }

  /** 加载示例 SQL 并自动解析 */
  async function loadExample() {
    loading.value = true
    error.value = null

    try {
      const result = await getExample()
      sqlText.value = result.sql
      ElMessage.success(`已加载示例：${result.title}`)
      // 自动解析示例
      await parse(result.sql)
    } catch (err: any) {
      error.value = err?.message || '加载示例失败'
      ElMessage.error('加载示例失败')
    } finally {
      loading.value = false
    }
  }

  /** 清空所有状态 */
  function clear() {
    sqlText.value = ''
    tables.value = []
    error.value = null
    loading.value = false
  }

  return {
    sqlText,
    tables,
    loading,
    error,
    parse,
    loadExample,
    clear,
  }
}
