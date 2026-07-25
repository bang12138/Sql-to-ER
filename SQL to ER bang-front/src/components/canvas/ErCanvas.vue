<template>
  <div class="er-canvas">
    <!-- 工具栏 -->
    <CanvasToolbar
      :zoom-ratio="zoomRatio"
      :mode="mode"
      @zoom-in="zoomIn"
      @zoom-out="zoomOut"
      @zoom-reset="zoomReset"
      @auto-layout="doAutoLayout"
      @zoom-to-fit="zoomToFit"
      @switch-mode="handleSwitchMode"
      @export="$emit('openExport')"
    />

    <!-- X6 画布容器 -->
    <div ref="graphContainer" class="x6-graph-container"></div>

    <!-- 双击编辑浮动面板（概念模式） -->
    <div
      v-if="editingTarget"
      class="node-edit-panel"
      :style="{ left: editPanelPos.x + 'px', top: editPanelPos.y + 'px' }"
    >
      <div class="edit-panel-header">
        <span>编辑{{ editingTarget?.type === 'edge' ? '基数标注' : nodeTypeLabel }}</span>
        <el-button size="small" text circle @click="cancelEdit">
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
      <div class="edit-panel-body">
        <label class="edit-label">文字内容</label>
        <el-input
          v-model="editLabel"
          size="small"
          @keydown.enter="saveEdit"
          @keydown.escape="cancelEdit"
          ref="editInputRef"
        />
        <template v-if="editingTarget?.type === 'node'">
          <label class="edit-label">填充颜色</label>
          <div class="color-row">
            <el-color-picker v-model="editColor" size="small" :predefine="presetColors" />
            <span class="color-label">背景</span>
          </div>
          <label class="edit-label">字体颜色</label>
          <div class="color-row">
            <el-color-picker v-model="editFontColor" size="small" :predefine="fontPresetColors" />
            <span class="color-label">文字</span>
          </div>
          <el-checkbox
            v-if="editingTarget?.shape === 'chen-attribute'"
            v-model="editIsPK"
            size="small"
            style="margin-top:4px"
          >主键（下划线）</el-checkbox>
        </template>
        <div class="action-row">
          <el-button size="small" @click="saveEdit" type="primary">确定</el-button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="tables.length === 0" class="canvas-empty">
      <div class="empty-content">
        <span class="empty-icon">📊</span>
        <p class="empty-title">尚无 ER 图</p>
        <p class="empty-desc">在左侧粘贴 SQL 建表语句，点击「解析」生成 ER 图</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick, computed } from 'vue'
import { Graph } from '@antv/x6'
import { ElMessage } from 'element-plus'
import { Close } from '@element-plus/icons-vue'
import CanvasToolbar from './CanvasToolbar.vue'
import { useGraph } from '@/composables/useGraph'
import { registerPhysicalNodes } from '@/utils/physNodeRegister'
import { registerChenNodes } from '@/utils/chenNodeRegister'
import type { TableInfo } from '@/types'

const props = defineProps<{
  tables: TableInfo[]
}>()

const emit = defineEmits<{
  openExport: []
}>()

const graphContainer = ref<HTMLElement | null>(null)
const {
  graphRef,
  mode,
  zoomRatio,
  setGraph,
  renderGraph,
  clearGraph,
  doAutoLayout,
  switchMode,
  zoomIn,
  zoomOut,
  zoomReset,
  zoomToFit,
} = useGraph()

// ========== 双击编辑状态 ==========
const editingTarget = ref<{ id: string; shape: string; type: 'node' | 'edge' } | null>(null)
const editLabel = ref('')
const editColor = ref('#FFFBE6')
const editFontColor = ref('#000')
const editIsPK = ref(false)
const editPanelPos = ref({ x: 0, y: 0 })
const editInputRef = ref<InstanceType<typeof import('element-plus').ElInput> | null>(null)

const presetColors = [
  '#FFFBE6', '#E8F4FD', '#FFF1F0', '#F0F9EB', '#F9F0FF',
  '#FFF3E0', '#E0F7FA', '#FCE4EC', '#E8EAF6', '#FFFFFF',
  '#FFD54F', '#4FC3F7', '#EF5350', '#66BB6A', '#AB47BC',
]

const fontPresetColors = [
  '#333333', '#000000', '#555555', '#888888', '#CC0000',
  '#E6A23C', '#409EFF', '#67C23A', '#F56C6C', '#909399',
]

const nodeTypeLabel = computed(() => {
  if (!editingTarget.value) return ''
  if (editingTarget.value.type === 'edge') return '基数'
  switch (editingTarget.value.shape) {
    case 'chen-entity': return '实体'
    case 'chen-attribute': return '属性'
    case 'chen-relationship': return '关系'
    default: return '节点'
  }
})

// ========== 初始化图实例 ==========
onMounted(() => {
  createGraph()
})

function createGraph() {
  if (!graphContainer.value) return

  // 注册物理和概念两种模式节点（全局注册，仅需一次）
  registerPhysicalNodes()
  registerChenNodes()

  const graph = new Graph({
    container: graphContainer.value,
    width: graphContainer.value.clientWidth,
    height: graphContainer.value.clientHeight,
    background: { color: '#f5f7fa' },
    grid: {
      size: 10,
      visible: true,
      type: 'dot',
      args: { color: '#e0e3e9', thickness: 1 },
    },
    panning: { enabled: true, eventTypes: ['leftMouseDown', 'mouseWheel'] },
    mousewheel: {
      enabled: true,
      modifiers: 'ctrl',
      minScale: 0.25,
      maxScale: 4,
    },
    interacting: {
      nodeMovable: true,
      edgeLabelMovable: false,
    },
  })

  // 双击编辑：概念模式下双击节点弹出编辑面板
  graph.on('node:dblclick', ({ node, e }) => {
    const shape = node.shape
    // 仅概念模式节点支持双击编辑
    if (!['chen-entity', 'chen-attribute', 'chen-relationship'].includes(shape)) return

    const label = (node.attr('label/text') as string) ?? ''
    const fill = (node.attr('body/fill') as string) || '#FFFBE6'
    const isPK = (node.attr('label/textDecoration') as string) === 'underline'

    editLabel.value = typeof label === 'string' ? label : ''
    editColor.value = fill
    editFontColor.value = '#000'
    editIsPK.value = isPK
    editingTarget.value = { id: node.id, shape, type: 'node' }

    // 计算面板在页面中的位置
    const graphEl = graphContainer.value!
    const rect = graphEl.getBoundingClientRect()
    const nodePos = node.getPosition()
    const nodeSize = node.getSize()
    const zoom = graph.zoom()
    const tx = graph.translate() as any

    const screenX = rect.left + (nodePos.x * zoom) + (tx.tx ?? tx.x ?? 0) + nodeSize.width * zoom + 10
    const screenY = rect.top + (nodePos.y * zoom) + (tx.ty ?? tx.y ?? 0) - 20

    editPanelPos.value = {
      x: Math.min(screenX, rect.right - 250),
      y: Math.max(screenY, rect.top + 10),
    }

    nextTick(() => {
      // 聚焦输入框
      const inputEl = (graphContainer.value?.closest('.er-canvas')?.querySelector('.node-edit-panel input') as HTMLInputElement)
      inputEl?.focus()
      inputEl?.select()
    })
  })

  // 实体拖拽联动：属性跟随 + 菱形居中
  graph.on('node:change:position', ({ node, current, previous, options }) => {
    // 仅处理概念模式的实体矩形
    if (node.shape !== 'chen-entity') return
    if (options?.skipSync) return // 避免递归触发

    const dx = (current?.x ?? 0) - (previous?.x ?? 0)
    const dy = (current?.y ?? 0) - (previous?.y ?? 0)
    if (dx === 0 && dy === 0) return

    const entityId = node.id

    // 1. 移动该实体的所有属性椭圆
    for (const cell of graph.getCells()) {
      if (!cell.isNode() || cell.shape !== 'chen-attribute') continue
      const data = cell.getData() as any
      if (data?.ownerEntityId === entityId) {
        const pos = cell.getPosition()
        cell.setPosition({ x: pos.x + dx, y: pos.y + dy }, { skipSync: true } as any)
      }
    }

    // 2. 重新计算关联菱形的中心位置
    for (const cell of graph.getCells()) {
      if (!cell.isNode() || cell.shape !== 'chen-relationship') continue
      const data = cell.getData() as any
      const srcId = data?.sourceEntityId
      const tgtId = data?.targetEntityId
      if (srcId !== entityId && tgtId !== entityId) continue

      // 获取两个实体位置，计算中点
      const srcNode = srcId ? graph.getCellById(srcId) : null
      const tgtNode = tgtId ? graph.getCellById(tgtId) : null
      if (srcNode?.isNode() && tgtNode?.isNode()) {
        const srcPos = srcNode.getPosition()
        const tgtPos = tgtNode.getPosition()
        const srcSize = srcNode.getSize()
        const tgtSize = tgtNode.getSize()
        const cx = (srcPos.x + srcSize.width / 2 + tgtPos.x + tgtSize.width / 2) / 2
        const cy = (srcPos.y + srcSize.height / 2 + tgtPos.y + tgtSize.height / 2) / 2
        cell.setPosition(
          { x: cx - cell.getSize().width / 2, y: cy - cell.getSize().height / 2 },
          { skipSync: true } as any,
        )
      }
    }
  })

  // 点击画布空白处关闭编辑
  graph.on('blank:click', () => {
    cancelEdit()
  })

  // 双击边标签编辑基数标注（N、1、M）
  graph.on('edge:dblclick', ({ edge, e }) => {
    // 获取第一个 label 的文字
    const labels = edge.getLabels()
    if (labels.length === 0) return
    const labelText = labels[0]?.attrs?.text?.text ?? labels[0]?.attrs?.label?.text ?? ''
    if (!labelText) return

    editLabel.value = typeof labelText === 'string' ? labelText : ''
    editingTarget.value = { id: edge.id, shape: 'edge', type: 'edge' }

    // 面板定位在鼠标位置
    const rect = graphContainer.value!.getBoundingClientRect()
    const evt = (e as any) as MouseEvent
    editPanelPos.value = {
      x: Math.min(evt.clientX - rect.left + 10, rect.right - 250),
      y: Math.max(evt.clientY - rect.top - 40, 10),
    }

    nextTick(() => {
      const inputEl = document.querySelector('.node-edit-panel input') as HTMLInputElement
      inputEl?.focus()
      inputEl?.select()
    })
  })

  setGraph(graph)

  // 响应式大小调整
  const resizeObserver = new ResizeObserver(() => {
    if (graphContainer.value) {
      graph.resize(graphContainer.value.clientWidth, graphContainer.value.clientHeight)
    }
  })
  resizeObserver.observe(graphContainer.value)
}

// ========== 编辑操作 ==========
function saveEdit() {
  if (!editingTarget.value || !graphRef.value) return

  const graph = graphRef.value as Graph
  const cell = graph.getCellById(editingTarget.value.id)
  if (!cell) return

  const newLabel = editLabel.value.trim()
  if (!newLabel) {
    cancelEdit()
    return
  }

  if (editingTarget.value.type === 'edge') {
    // 更新边标签文字
    ;(cell as any).setLabelAt(0, {
      attrs: { text: { text: newLabel, fill: editFontColor.value, fontSize: 14 } },
    })
  } else if (cell.isNode()) {
    // 更新节点 label 文字、填充颜色、字体颜色和主键状态
    cell.attr('label/text', newLabel)
    cell.attr('body/fill', editColor.value)
    cell.attr('label/fill', editFontColor.value)
    if (editingTarget.value.shape === 'chen-attribute') {
      cell.attr('label/textDecoration', editIsPK.value ? 'underline' : 'none')
      // 主键属性切换时也更新填充色
      cell.attr('body/fill', editIsPK.value ? '#FFF1F0' : editColor.value)
    }
  }

  editingTarget.value = null
}

function cancelEdit() {
  editingTarget.value = null
}

// ========== 数据监听 ==========
// 监听 tables 变化 → 重新渲染
watch(
  () => props.tables,
  (newTables) => {
    nextTick(() => {
      if (newTables.length > 0) {
        renderGraph(newTables)
      } else {
        clearGraph()
      }
    })
  },
  { deep: true, immediate: true },
)

/** 模式切换 */
async function handleSwitchMode(target: 'physical' | 'chen') {
  if (!graphContainer.value) return

  cancelEdit()
  ElMessage.info(`正在切换到${target === 'physical' ? '物理' : '概念'} ER 模式...`)
  await switchMode(target, graphContainer.value)
  // 重新绑定双击事件（新 graph 实例需要重新监听）
  bindEditEvents()
  ElMessage.success(`已切换为${target === 'physical' ? '物理' : '概念'} ER 模式`)
}

/** 为新 graph 实例重新绑定双击事件 */
function bindEditEvents() {
  const graph = graphRef.value
  if (!graph) return

  graph.on('node:dblclick', ({ node }) => {
    const shape = node.shape
    if (!['chen-entity', 'chen-attribute', 'chen-relationship'].includes(shape)) return

    const label = (node.attr('label/text') as string) ?? ''
    const fill = (node.attr('body/fill') as string) || '#FFFBE6'
    const isPK = (node.attr('label/textDecoration') as string) === 'underline'

    editLabel.value = typeof label === 'string' ? label : ''
    editColor.value = fill
    editFontColor.value = '#000'
    editIsPK.value = isPK
    editingTarget.value = { id: node.id, shape, type: 'node' }

    const graphEl = graphContainer.value!
    const rect = graphEl.getBoundingClientRect()
    const nodePos = node.getPosition()
    const nodeSize = node.getSize()
    const zoom = graph.zoom()
    const tx = graph.translate() as any

    editPanelPos.value = {
      x: Math.min(rect.left + (nodePos.x * zoom) + (tx.tx ?? tx.x ?? 0) + nodeSize.width * zoom + 10, rect.right - 250),
      y: Math.max(rect.top + (nodePos.y * zoom) + (tx.ty ?? tx.y ?? 0) - 20, rect.top + 10),
    }
  })

  graph.on('blank:click', () => {
    cancelEdit()
  })

  graph.on('edge:dblclick', ({ edge, e }) => {
    const labels = edge.getLabels()
    if (labels.length === 0) return
    const labelText = labels[0]?.attrs?.text?.text ?? ''
    if (!labelText) return

    editLabel.value = typeof labelText === 'string' ? labelText : ''
    editingTarget.value = { id: edge.id, shape: 'edge', type: 'edge' }

    const rect = graphContainer.value!.getBoundingClientRect()
    const evt = (e as any) as MouseEvent
    editPanelPos.value = {
      x: Math.min(evt.clientX - rect.left + 10, rect.right - 250),
      y: Math.max(evt.clientY - rect.top - 40, 10),
    }
  })

  // 实体拖拽联动
  graph.on('node:change:position', ({ node, current, previous, options }) => {
    if (node.shape !== 'chen-entity') return
    if ((options as any)?.skipSync) return
    const dx = (current?.x ?? 0) - (previous?.x ?? 0)
    const dy = (current?.y ?? 0) - (previous?.y ?? 0)
    if (dx === 0 && dy === 0) return
    const entityId = node.id

    for (const cell of graph.getCells()) {
      if (!cell.isNode() || cell.shape !== 'chen-attribute') continue
      const data = cell.getData() as any
      if (data?.ownerEntityId === entityId) {
        const pos = cell.getPosition()
        cell.setPosition({ x: pos.x + dx, y: pos.y + dy }, { skipSync: true } as any)
      }
    }

    for (const cell of graph.getCells()) {
      if (!cell.isNode() || cell.shape !== 'chen-relationship') continue
      const data = cell.getData() as any
      const srcId = data?.sourceEntityId
      const tgtId = data?.targetEntityId
      if (srcId !== entityId && tgtId !== entityId) continue
      const srcNode = srcId ? graph.getCellById(srcId) : null
      const tgtNode = tgtId ? graph.getCellById(tgtId) : null
      if (srcNode?.isNode() && tgtNode?.isNode()) {
        const srcPos = srcNode.getPosition()
        const tgtPos = tgtNode.getPosition()
        const srcSize = srcNode.getSize()
        const tgtSize = tgtNode.getSize()
        const cx = (srcPos.x + srcSize.width / 2 + tgtPos.x + tgtSize.width / 2) / 2
        const cy = (srcPos.y + srcSize.height / 2 + tgtPos.y + tgtSize.height / 2) / 2
        cell.setPosition(
          { x: cx - cell.getSize().width / 2, y: cy - cell.getSize().height / 2 },
          { skipSync: true } as any,
        )
      }
    }
  })
}

/** 获取图实例（供导出使用） */
function getGraph(): Graph | null {
  return (graphRef.value as Graph) ?? null
}

defineExpose({ getGraph, mode })
</script>

<style lang="scss" scoped>
.er-canvas {
  width: 100%;
  height: 100%;
  position: relative;
}

.x6-graph-container {
  width: 100%;
  height: 100%;
}

// ========== 双击编辑浮动面板 ==========
.node-edit-panel {
  position: fixed;
  z-index: 100;
  width: 220px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid #e4e7ed;
  overflow: hidden;

  .edit-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: #f5f7fa;
    border-bottom: 1px solid #e4e7ed;
    font-size: 13px;
    font-weight: 600;
    color: #303133;
  }

  .edit-panel-body {
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;

    .edit-label {
      font-size: 12px;
      color: #909399;
      margin-bottom: -4px;
    }

    .color-row {
      display: flex;
      align-items: center;
      gap: 8px;

      .color-label {
        font-size: 11px;
        color: #909399;
      }
    }

    .action-row {
      display: flex;
      justify-content: flex-end;
      margin-top: 4px;
    }
  }
}

// ========== 空状态 ==========
.canvas-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 5;

  .empty-content {
    text-align: center;
    color: #909399;

    .empty-icon {
      font-size: 48px;
      display: block;
      margin-bottom: 12px;
    }

    .empty-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 6px;
      color: #606266;
    }

    .empty-desc {
      font-size: 13px;
      color: #909399;
    }
  }
}
</style>
