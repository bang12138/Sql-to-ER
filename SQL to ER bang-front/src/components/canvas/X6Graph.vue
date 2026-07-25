<template>
  <div ref="containerRef" class="x6-graph-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Graph, Shape } from '@antv/x6'
import type { ErNodeData, ErEdgeData } from '@/types'
import { getNodeColor } from '@/utils/graphTransformer'

const props = defineProps<{
  nodes: ErNodeData[]
  edges: ErEdgeData[]
}>()

const emit = defineEmits<{
  graphReady: [graph: Graph]
  nodeDblClick: [nodeId: string, field: string | null]
  zoomChanged: [ratio: number]
}>()

const containerRef = ref<HTMLElement | null>(null)
let graph: Graph | null = null

// 注册自定义 ER 表节点
Shape.HTML.register({
  shape: 'er-table-node',
  width: 220,
  height: 120,
  effect: ['data'],
  html(cell) {
    const data = cell.getData() as ErNodeData | undefined
    if (!data) return '<div class="er-node-error">加载失败</div>'

    const { label, tableComment, columns, primaryKeys } = data
    const headerColor = getNodeColor(label)
    const hasPK = primaryKeys && primaryKeys.length > 0

    // 外键列名集合
    const fkColumns = new Set<string>()
    if (cell.getData()?.fkColumns) {
      for (const fk of cell.getData().fkColumns as string[]) {
        fkColumns.add(fk)
      }
    }

    // 构建字段行 HTML
    const columnsHtml = (columns || [])
      .map((col) => {
        const isPK = col.primaryKey
        const isFK = fkColumns.has(col.name)
        const typeStr = formatTypeStr(col)
        const pkBadge = isPK ? '<span class="pk-badge">🔑</span>' : ''
        const fkBadge = isFK && !isPK ? '<span class="fk-badge">🔗</span>' : ''
        const commentIcon = col.comment
          ? `<span class="col-comment-icon" title="${escapeHtml(col.comment)}">💬</span>`
          : ''
        const rowClass = isPK ? 'pk-row' : isFK ? 'fk-row' : ''

        return `
          <div class="column-row ${rowClass}" data-col="${escapeHtml(col.name)}">
            <span class="col-icon">${pkBadge}${fkBadge}</span>
            <span class="col-name">${escapeHtml(col.name)}</span>
            <span class="col-type">${escapeHtml(typeStr)}</span>
            ${commentIcon}
          </div>`
      })
      .join('')

    const pkIcon = hasPK ? '<span class="pk-header-icon">🔑</span>' : ''

    return `
        <div class="er-node">
          <div class="node-header" style="background-color:${headerColor}">
            ${pkIcon}
            <span class="table-name">${escapeHtml(label)}</span>
            ${tableComment ? `<span class="table-comment">${escapeHtml(tableComment)}</span>` : ''}
          </div>
          <div class="node-body">
            ${columnsHtml || '<div class="empty-hint">无字段</div>'}
          </div>
        </div>`
  },
})

// 格式化类型字符串
function formatTypeStr(col: any): string {
  let str = col.type
  if (col.length !== null) {
    str += `(${col.length}`
    if (col.precision !== null) str += `,${col.precision}`
    str += ')'
  }
  if (!col.nullable) str += ' NOT NULL'
  if (col.autoIncrement) str += ' AI'
  return str
}

function escapeHtml(str: string): string {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

onMounted(() => {
  if (!containerRef.value) return

  graph = new Graph({
    container: containerRef.value,
    width: containerRef.value.clientWidth,
    height: containerRef.value.clientHeight,
    background: { color: '#f5f7fa' },
    grid: {
      size: 10,
      visible: true,
      type: 'dot',
      args: { color: '#e0e3e9', thickness: 1 },
    },
    panning: {
      enabled: true,
      eventTypes: ['leftMouseDown', 'mouseWheel'],
    },
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

  // 监听缩放变化
  graph.on('scale', () => {
    if (graph) {
      emit('zoomChanged', graph.zoom())
    }
  })

  // 监听节点双击
  graph.on('node:dblclick', ({ node }) => {
    emit('nodeDblClick', node.id, null)
  })

  // 自适应窗口大小
  const resizeObserver = new ResizeObserver(() => {
    if (graph && containerRef.value) {
      graph.resize(containerRef.value.clientWidth, containerRef.value.clientHeight)
    }
  })
  resizeObserver.observe(containerRef.value)

  // 渲染初始数据
  renderGraph()

  emit('graphReady', graph)
})

onBeforeUnmount(() => {
  graph?.dispose()
  graph = null
})

// 监听 nodes/edges 变化，重新渲染
watch(
  () => [props.nodes, props.edges],
  () => {
    renderGraph()
  },
  { deep: true },
)

/** 渲染/更新图 */
function renderGraph() {
  if (!graph) return

  // 清空现有内容
  graph.clearCells()

  if (props.nodes.length === 0) return

  // 添加节点
  const x6Nodes = props.nodes.map((node) => {
    // 收集外键列名
    const fkColumns: string[] = []
    for (const edge of props.edges) {
      if (edge.source === node.id) {
        fkColumns.push(edge.sourceColumn)
      }
    }

    // 计算节点高度
    const headerH = 42
    const colH = 26
    const height = headerH + (node.columns?.length || 0) * colH + 8

    return graph!.addNode({
      id: node.id,
      shape: 'er-table-node',
      x: node.x || 0,
      y: node.y || 0,
      width: node.width || 220,
      height: height || 120,
      data: {
        ...node,
        height: height || 120,
        fkColumns,
      },
    })
  })

  // 添加边
  for (const edge of props.edges) {
    // 确保 source 和 target 节点都存在
    const sourceExists = x6Nodes.find((n) => n.id === edge.source)
    const targetExists = x6Nodes.find((n) => n.id === edge.target)
    if (!sourceExists || !targetExists) continue

    graph.addEdge({
      id: edge.id,
      source: { cell: edge.source },
      target: { cell: edge.target },
      router: {
        name: 'manhattan',
        args: { padding: 20, startDirections: ['right'], endDirections: ['left'] },
      },
      connector: { name: 'rounded', args: { radius: 6 } },
      attrs: {
        line: {
          stroke: '#c0c4cc',
          strokeWidth: 1.5,
          targetMarker: {
            name: 'block',
            width: 8,
            height: 6,
            fill: '#909399',
          },
        },
      },
      labels: [
        {
          attrs: {
            text: {
              text: edge.label,
              fontSize: 10,
              fill: '#909399',
              textAnchor: 'middle',
            },
            rect: {
              fill: '#f5f7fa',
              stroke: '#e4e7ed',
              strokeWidth: 1,
              rx: 3,
              ry: 3,
              refWidth: '120%',
              refHeight: '120%',
              refX: -10,
              refY: -10,
            },
          },
          position: { distance: 0.5 },
        },
      ],
    })
  }
}

/** 缩放相关方法 */
function zoomIn() {
  graph?.zoom(0.1)
}

function zoomOut() {
  graph?.zoom(-0.1)
}

function zoomReset() {
  graph?.zoomTo(1)
}

function zoomToFit() {
  graph?.zoomToFit({ padding: 40, maxScale: 2 })
}

function getZoom(): number {
  return graph?.zoom() ?? 1
}

/** 获取当前节点数据 */
function getNodes(): ErNodeData[] {
  if (!graph) return []
  return graph.getNodes().map((node) => {
    const pos = node.getPosition()
    const size = node.getSize()
    return {
      ...(node.getData() as ErNodeData),
      x: pos.x,
      y: pos.y,
      width: size.width,
      height: size.height,
    }
  })
}

/** 更新所有节点位置 */
function updateNodePositions(nodes: ErNodeData[]) {
  if (!graph) return
  for (const node of nodes) {
    const cell = graph.getCellById(node.id)
    if (cell && cell.isNode()) {
      cell.setPosition({ x: node.x, y: node.y })
    }
  }
}

defineExpose({
  zoomIn,
  zoomOut,
  zoomReset,
  zoomToFit,
  getZoom,
  getNodes,
  updateNodePositions,
  getGraph: () => graph,
  renderGraph,
})
</script>

<style lang="scss">
/* X6 节点全局样式（不使用 scoped，因为节点 HTML 是动态注入的） */
.er-node {
  background: #fff;
  border-radius: 8px;
  border: 2px solid #dcdfe6;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  cursor: move;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;

  .node-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    color: #fff;
    font-weight: 600;
    font-size: 13px;
    min-height: 36px;
    flex-shrink: 0;

    .pk-header-icon {
      font-size: 13px;
    }

    .table-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex-shrink: 1;
    }

    .table-comment {
      font-size: 11px;
      font-weight: 400;
      opacity: 0.85;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex-shrink: 2;
    }
  }

  .node-body {
    flex: 1;
    overflow-y: auto;

    .column-row {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 3px 12px;
      font-size: 12px;
      border-bottom: 1px solid #f2f3f5;

      &:last-child {
        border-bottom: none;
      }

      &.pk-row {
        background: #fef0f0;
      }

      &.fk-row {
        background: #f0f9eb;
      }

      .col-icon {
        width: 18px;
        flex-shrink: 0;
        text-align: center;
        font-size: 10px;

        .pk-badge,
        .fk-badge {
          font-size: 10px;
        }
      }

      .col-name {
        font-weight: 500;
        color: #303133;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: 60px;
        flex-shrink: 1;
      }

      .col-type {
        color: #909399;
        font-size: 11px;
        font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex-shrink: 2;
      }

      .col-comment-icon {
        font-size: 10px;
        flex-shrink: 0;
      }
    }

    .empty-hint {
      padding: 12px;
      text-align: center;
      color: #c0c4cc;
      font-size: 12px;
    }
  }
}

.er-node-error {
  padding: 20px;
  text-align: center;
  color: #f56c6c;
  font-size: 13px;
}

.x6-graph-container {
  width: 100%;
  height: 100%;
}
</style>
