import type { TableInfo, ErNodeData, ErEdgeData } from '@/types'

/** 将 TableInfo[] 转换为 X6 nodes + edges */
export function tablesToGraphData(tables: TableInfo[]): {
  nodes: ErNodeData[]
  edges: ErEdgeData[]
} {
  const nodes: ErNodeData[] = []
  const edges: ErEdgeData[] = []

  for (const table of tables) {
    // 创建节点
    nodes.push({
      id: table.tableName,
      x: 0,
      y: 0,
      width: 220,
      height: calculateNodeHeight(table),
      label: table.tableName,
      tableComment: table.tableComment,
      columns: table.columns,
      primaryKeys: table.primaryKeys,
    })

    // 创建外键连线
    for (const fk of table.foreignKeys) {
      const edgeId = `fk-${table.tableName}-${fk.referencedTable}-${fk.columnName}`
      // 避免重复边
      if (!edges.find((e) => e.id === edgeId)) {
        edges.push({
          id: edgeId,
          source: table.tableName,
          target: fk.referencedTable,
          sourceColumn: fk.columnName,
          targetColumn: fk.referencedColumn,
          label: `${fk.columnName} → ${fk.referencedColumn}`,
        })
      }
    }
  }

  return { nodes, edges }
}

/** 根据表的列数计算节点高度 */
function calculateNodeHeight(table: TableInfo): number {
  const HEADER_HEIGHT = 42
  const COLUMN_ROW_HEIGHT = 26
  const PADDING = 8

  const columnsHeight = table.columns.length * COLUMN_ROW_HEIGHT
  return HEADER_HEIGHT + columnsHeight + PADDING
}

/** 生成节点颜色（根据表名 hash） */
export function getNodeColor(tableName: string): string {
  const colors = [
    '#409eff', '#67c23a', '#e6a23c', '#f56c6c',
    '#909399', '#5470c6', '#91cc75', '#ee6666',
    '#fac858', '#73c0de', '#3ba272', '#fc8452',
  ]
  let hash = 0
  for (let i = 0; i < tableName.length; i++) {
    hash = (hash * 31 + tableName.charCodeAt(i)) & 0xffffffff
  }
  return colors[Math.abs(hash) % colors.length]
}
