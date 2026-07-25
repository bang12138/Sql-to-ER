import { ref } from 'vue'
import type { Graph } from '@antv/x6'
import type { TableInfo, ExportOptions, ErMode, PositionCache } from '@/types'
import { tablesToGraphData } from '@/utils/graphTransformer'
import { autoLayout } from '@/utils/layoutEngine'
import { tablesToChenGraph, chenAutoLayout, buildChenEdges } from '@/utils/chenTransformer'

export function useGraph() {
  const graphRef = ref<Graph | null>(null)
  const zoomRatio = ref(1)
  const mode = ref<ErMode>('chen')
  const parseResult = ref<TableInfo[] | null>(null)

  // 位置缓存
  const positionCache = ref<PositionCache>({
    physical: {},
    chen: {},
  })

  /** 设置图实例引用 */
  function setGraph(graph: Graph) {
    graphRef.value = graph
    graph.on('scale', () => {
      zoomRatio.value = graph.zoom()
    })
  }

  /** 渲染/更新 ER 图（根据当前模式） */
  function renderGraph(tables: TableInfo[]) {
    parseResult.value = tables
    if (!tables || tables.length === 0) {
      graphRef.value?.clearCells()
      return
    }

    if (mode.value === 'physical') {
      renderPhysicalGraph(tables)
    } else {
      renderChenGraph(tables)
    }
  }

  /** 物理模式渲染 */
  function renderPhysicalGraph(tables: TableInfo[]) {
    if (!graphRef.value) return

    const { nodes, edges } = tablesToGraphData(tables)
    const layoutedNodes = autoLayout(nodes, edges)

    graphRef.value.clearCells()

    for (const node of layoutedNodes) {
      // 尝试恢复缓存位置
      const cached = positionCache.value.physical[node.id]
      graphRef.value.addNode({
        id: node.id,
        shape: 'er-table-node',
        x: cached?.x ?? node.x,
        y: cached?.y ?? node.y,
        width: node.width || 220,
        height: node.height || 120,
        data: node,
      })
    }

    for (const edge of edges) {
      graphRef.value.addEdge({
        id: edge.id,
        source: { cell: edge.source },
        target: { cell: edge.target },
        router: { name: 'manhattan', args: { padding: 20 } },
        connector: { name: 'rounded', args: { radius: 6 } },
        attrs: {
          line: {
            stroke: '#c0c4cc',
            strokeWidth: 1.5,
            targetMarker: { name: 'block', width: 8, height: 6, fill: '#909399' },
          },
        },
        labels: [
          {
            attrs: {
              text: { text: edge.label, fontSize: 10, fill: '#909399', textAnchor: 'middle' },
            },
            position: { distance: 0.5 },
          },
        ],
      })
    }

    setTimeout(() => graphRef.value?.zoomToFit({ padding: 40, maxScale: 2 }), 200)
  }

  /** 概念模式渲染 */
  function renderChenGraph(tables: TableInfo[]) {
    if (!graphRef.value) return

    const { entityNodes, attributeNodes, relationshipNodes, edges: chenEdges } =
      tablesToChenGraph(tables)

    // 自动布局
    const { entityNodes: layoutedEntities, attributeNodes: layoutedAttrs, relationshipNodes: layoutedRels } =
      chenAutoLayout(entityNodes, attributeNodes, relationshipNodes, chenEdges)

    graphRef.value.clearCells()

    // 渲染实体矩形
    for (const ent of layoutedEntities) {
      const cached = positionCache.value.chen[ent.id]
      const fillColor = '#E8F4FD'
      const node = graphRef.value.addNode({
        id: ent.id,
        shape: 'chen-entity',
        x: cached?.x ?? ent.x,
        y: cached?.y ?? ent.y,
        width: ent.width,
        height: ent.height,
        attrs: {
          label: { text: ent.entityName },
          body: { fill: fillColor, stroke: '#333' },
        },
        data: ent,
      })
    }

    // 渲染属性椭圆
    for (const attr of layoutedAttrs) {
      const cached = positionCache.value.chen[attr.id]
      const fillColor = attr.isPrimaryKey ? '#FFF1F0' : '#FFFBE6'
      const node = graphRef.value.addNode({
        id: attr.id,
        shape: 'chen-attribute',
        x: cached?.x ?? attr.x,
        y: cached?.y ?? attr.y,
        width: attr.width,
        height: attr.height,
        attrs: {
          label: {
            text: attr.label,
            textDecoration: attr.isPrimaryKey ? 'underline' : 'none',
          },
          body: { fill: fillColor, stroke: '#333' },
        },
        data: attr,
      })
    }

    // 渲染关系菱形
    for (const rel of layoutedRels) {
      const cached = positionCache.value.chen[rel.id]
      const fillColor = '#FFF1F0'
      const node = graphRef.value.addNode({
        id: rel.id,
        shape: 'chen-relationship',
        x: cached?.x ?? rel.x,
        y: cached?.y ?? rel.y,
        width: rel.width,
        height: rel.height,
        attrs: {
          label: { text: rel.relationName },
          body: { fill: fillColor, stroke: '#333' },
        },
        data: rel,
      })
    }

    // 渲染连线
    const edgeConfigs = buildChenEdges(chenEdges, layoutedRels)
    for (const ec of edgeConfigs) {
      graphRef.value.addEdge(ec)
    }

    setTimeout(() => graphRef.value?.zoomToFit({ padding: 40, maxScale: 2 }), 200)
  }

  /** 保存当前节点位置到缓存 */
  function saveCurrentPositions() {
    if (!graphRef.value) return

    const cacheKey = mode.value
    const positions: Record<string, { x: number; y: number }> = {}

    for (const node of graphRef.value.getNodes()) {
      const pos = node.getPosition()
      positions[node.id] = { x: pos.x, y: pos.y }
    }

    positionCache.value[cacheKey] = positions
  }

  /**
   * 切换 ER 图模式
   * @param container 画布容器元素（用于创建新图实例）
   */
  async function switchMode(target: ErMode, container: HTMLElement) {
    if (mode.value === target || !parseResult.value) return

    // 1. 保存当前位置
    saveCurrentPositions()

    // 2. 销毁当前图
    graphRef.value?.dispose()

    // 3. 创建新模式的新图实例
    const { Graph: X6Graph } = await import('@antv/x6')

    const graph = new X6Graph({
      container,
      width: container.clientWidth,
      height: container.clientHeight,
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

    setGraph(graph)

    // 4. 更新模式并重新渲染
    mode.value = target
    renderGraph(parseResult.value)
  }

  /** 清空画布 */
  function clearGraph() {
    graphRef.value?.clearCells()
    parseResult.value = null
    positionCache.value = { physical: {}, chen: {} }
    mode.value = 'chen'
  }

  /** 自动布局 */
  function doAutoLayout() {
    if (!graphRef.value || !parseResult.value) return

    saveCurrentPositions()
    // 清除该模式的位置缓存，强制重算
    positionCache.value[mode.value] = {}
    renderGraph(parseResult.value)
  }

  /** 缩放 */
  function zoomIn() { graphRef.value?.zoom(0.1) }
  function zoomOut() { graphRef.value?.zoom(-0.1) }
  function zoomReset() { graphRef.value?.zoomTo(1) }
  function zoomToFit() { graphRef.value?.zoomToFit({ padding: 40, maxScale: 2 }) }

  /** 导出图片 */
  async function exportImage(options: ExportOptions): Promise<void> {
    if (!graphRef.value) return
    const { format, background } = options
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `er-diagram-${timestamp}.${format}`

    const download = (dataUri: string) => {
      const link = document.createElement('a')
      link.download = filename
      link.href = dataUri
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }

    if (format === 'png') {
      (graphRef.value as any).toPNG(download, {
        backgroundColor: background === 'transparent' ? 'transparent' : (background || '#ffffff'),
        padding: 20,
      })
    } else {
      (graphRef.value as any).toJPEG(download, {
        backgroundColor: background || '#ffffff',
        padding: 20,
        quality: 0.95,
      })
    }
  }

  return {
    graphRef,
    zoomRatio,
    mode,
    setGraph,
    renderGraph,
    clearGraph,
    doAutoLayout,
    switchMode,
    zoomIn,
    zoomOut,
    zoomReset,
    zoomToFit,
    exportImage,
  }
}

