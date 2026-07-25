<template>
  <div class="app-container">
    <AppHeader />
    <div class="app-main">
      <aside class="panel-left">
        <SqlInputPanel
          :loading="loading"
          :sql-text="sqlText"
          @parse="handleParse"
          @load-example="handleLoadExample"
          @clear="handleClear"
          @update:sql-text="sqlText = $event"
        />
      </aside>
      <main class="panel-right">
        <ErCanvas
          :tables="tables"
          ref="erCanvasRef"
          @openExport="openExportDialog"
        />
      </main>
    </div>
    <ExportDialog
      v-model:visible="exportVisible"
      @export="handleExport"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import AppHeader from '@/components/layout/AppHeader.vue'
import SqlInputPanel from '@/components/sql/SqlInputPanel.vue'
import ErCanvas from '@/components/canvas/ErCanvas.vue'
import ExportDialog from '@/components/export/ExportDialog.vue'
import { useParse } from '@/composables/useParse'
import { useExport } from '@/composables/useExport'
import { healthCheckWithRetry } from '@/api/parse'

// 解析逻辑
const { sqlText, tables, loading, parse, loadExample, clear } = useParse()

// 导出
const erCanvasRef = ref<InstanceType<typeof ErCanvas> | null>(null)
const { setGraph, exportImage } = useExport()
const exportVisible = ref(false)

// 解析 SQL
async function handleParse(sql: string) {
  await parse(sql)
}

// 加载示例
async function handleLoadExample() {
  await loadExample()
}

// 清空
function handleClear() {
  clear()
}

// 打开导出弹窗
function openExportDialog() {
  // 将当前 graph 实例传给 useExport
  const graph = erCanvasRef.value?.getGraph()
  if (graph) {
    setGraph(graph)
    exportVisible.value = true
  } else {
    ElMessage.warning('画布尚未准备好，请先解析 SQL')
  }
}

// 执行导出
async function handleExport(options: { format: 'png' | 'jpeg'; background: string }) {
  await exportImage(options)
  exportVisible.value = false
}

// 启动时健康检查
healthCheckWithRetry().then((ok) => {
  if (!ok) {
    ElMessage.warning('后端服务未连接，请确认服务已启动')
  }
})
</script>

<style lang="scss">
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.app-main {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.panel-left {
  width: 40%;
  min-width: 360px;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-right {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #f5f7fa;
}
</style>
