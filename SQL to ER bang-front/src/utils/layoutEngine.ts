import dagre from 'dagre'
import type { ErNodeData, ErEdgeData } from '@/types'

interface LayoutOptions {
  rankdir?: 'TB' | 'LR' | 'BT' | 'RL'
  nodesep?: number
  ranksep?: number
  marginx?: number
  marginy?: number
}

/**
 * 使用 dagre 进行自动布局
 * @returns 带坐标的节点数组
 */
export function autoLayout(
  nodes: ErNodeData[],
  edges: ErEdgeData[],
  options: LayoutOptions = {},
): ErNodeData[] {
  const {
    rankdir = 'TB',
    nodesep = 100,
    ranksep = 80,
    marginx = 40,
    marginy = 40,
  } = options

  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir, nodesep, ranksep, marginx, marginy })
  g.setDefaultEdgeLabel(() => ({}))

  // 添加节点
  for (const node of nodes) {
    g.setNode(node.id, {
      width: node.width || 220,
      height: node.height || 120,
    })
  }

  // 添加边
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target)
  }

  // 执行布局
  dagre.layout(g)

  // 将计算结果写回节点
  return nodes.map((node) => {
    const pos = g.node(node.id)
    if (pos) {
      return {
        ...node,
        x: pos.x - (node.width || 220) / 2,
        y: pos.y - (node.height || 120) / 2,
      }
    }
    return node
  })
}

/**
 * 计算使所有节点可见的画布中心点
 */
export function getGraphCenter(nodes: ErNodeData[]): { x: number; y: number } {
  if (nodes.length === 0) return { x: 0, y: 0 }

  const minX = Math.min(...nodes.map((n) => n.x))
  const maxX = Math.max(...nodes.map((n) => n.x + (n.width || 220)))
  const minY = Math.min(...nodes.map((n) => n.y))
  const maxY = Math.max(...nodes.map((n) => n.y + (n.height || 120)))

  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
  }
}
