import type {
  TableInfo,
  ColumnInfo,
  ForeignKeyInfo,
  ChenEntityNode,
  ChenAttributeNode,
  ChenRelationshipNode,
  ChenEdgeData,
} from '@/types'

// ========== 常量 ==========
const ENTITY_WIDTH = 130
const ENTITY_HEIGHT = 54
const ATTR_WIDTH = 130
const ATTR_HEIGHT = 44
const RELATION_SIZE = 80
const ATTR_GAP_Y = 78
const ENTITY_GAP_X = 440
const ENTITY_GAP_Y = 320

// ========== 核心转换函数 ==========

/**
 * 将 TableInfo[] 转换为 Chen 风格 nodes + edges
 */
export function tablesToChenGraph(tables: TableInfo[]): {
  entityNodes: ChenEntityNode[]
  attributeNodes: ChenAttributeNode[]
  relationshipNodes: ChenRelationshipNode[]
  edges: ChenEdgeData[]
} {
  if (!tables || tables.length === 0) {
    return { entityNodes: [], attributeNodes: [], relationshipNodes: [], edges: [] }
  }

  const entityNodes: ChenEntityNode[] = []
  const attributeNodes: ChenAttributeNode[] = []
  const relationshipNodes: ChenRelationshipNode[] = []
  const edges: ChenEdgeData[] = []

  // 识别中间表（多对多关系）
  const junctionTableNames = new Set(
    tables.filter((t) => isJunctionTable(t)).map((t) => t.tableName),
  )

  // 先用物理模式布局计算初始位置（后续会被 chenLayout 重算）
  let entityX = 80
  let entityY = 80

  for (const table of tables) {
    // 中间表 → 仅生成关系菱形，不生成实体
    if (junctionTableNames.has(table.tableName)) {
      // 找到中间表关联的两个实体
      const refs = table.foreignKeys
      if (refs.length >= 2) {
        const entityA = refs[0].referencedTable
        const entityB = refs[1].referencedTable

        // 检查两个实体是否都不是中间表
        if (!junctionTableNames.has(entityA) && !junctionTableNames.has(entityB)) {
          relationshipNodes.push({
            id: `rel-${table.tableName}`,
            nodeType: 'chen-relationship',
            x: 0, y: 0,
            width: RELATION_SIZE,
            height: RELATION_SIZE,
            label: table.tableComment || table.tableName,
            relationName: table.tableComment || table.tableName,
            isJunctionTable: true,
            sourceEntityId: entityA,
            targetEntityId: entityB,
          })
        }
      }
      continue
    }

    // 普通表 → 生成实体矩形
    const entityId = `ent-${table.tableName}`
    entityNodes.push({
      id: entityId,
      nodeType: 'chen-entity',
      x: entityX,
      y: entityY,
      width: ENTITY_WIDTH,
      height: ENTITY_HEIGHT,
      label: table.tableName,
      entityName: table.tableComment || table.tableName,
    })

    // 生成属性椭圆
    const pkColumns = table.columns.filter((c) => c.primaryKey)
    const nonPkColumns = table.columns.filter((c) => !c.primaryKey)

    // 主键属性放在实体上方
    let attrOffsetY = entityY - ATTR_GAP_Y * (pkColumns.length)
    for (const col of pkColumns) {
      const attrId = `attr-${table.tableName}-${col.name}`
      attributeNodes.push({
        id: attrId,
        nodeType: 'chen-attribute',
        x: entityX + ENTITY_WIDTH / 2 - ATTR_WIDTH / 2,
        y: attrOffsetY,
        width: ATTR_WIDTH,
        height: ATTR_HEIGHT,
        label: `${col.name}: ${formatChenType(col)}`,
        attrName: col.name,
        attrType: formatChenType(col),
        isPrimaryKey: true,
        ownerEntityId: entityId,
      })
      edges.push({
        id: `edge-${entityId}-${attrId}`,
        source: entityId,
        target: attrId,
        edgeType: 'entity-attribute',
      })
      attrOffsetY += ATTR_GAP_Y
    }

    // 非主键属性放在实体下方
    attrOffsetY = entityY + ENTITY_HEIGHT + 10
    for (const col of nonPkColumns) {
      const attrId = `attr-${table.tableName}-${col.name}`
      attributeNodes.push({
        id: attrId,
        nodeType: 'chen-attribute',
        x: entityX + ENTITY_WIDTH / 2 - ATTR_WIDTH / 2,
        y: attrOffsetY,
        width: ATTR_WIDTH,
        height: ATTR_HEIGHT,
        label: `${col.name}: ${formatChenType(col)}`,
        attrName: col.name,
        attrType: formatChenType(col),
        isPrimaryKey: false,
        ownerEntityId: entityId,
      })
      edges.push({
        id: `edge-${entityId}-${attrId}`,
        source: entityId,
        target: attrId,
        edgeType: 'entity-attribute',
      })
      attrOffsetY += ATTR_GAP_Y
    }

    // 外键关系 → 生成关系菱形（非中间表的 1:N 关系）
    for (const fk of table.foreignKeys) {
      // 如果被引用表是中间表或不存在于 tables 中，跳过
      if (junctionTableNames.has(fk.referencedTable)) continue
      if (!tables.find((t) => t.tableName === fk.referencedTable)) continue

      const relId = `rel-${table.tableName}-${fk.referencedTable}-${fk.columnName}`
      // 避免重复关系（去重）
      if (relationshipNodes.find((r) => r.id === relId)) continue

      relationshipNodes.push({
        id: relId,
        nodeType: 'chen-relationship',
        x: 0, y: 0,
        width: RELATION_SIZE,
        height: RELATION_SIZE,
        label: fk.constraintName || getRelationName(table.tableName, fk),
        relationName: fk.constraintName || getRelationName(table.tableName, fk),
        isJunctionTable: false,
        sourceEntityId: entityId,
        targetEntityId: `ent-${fk.referencedTable}`,
      })
    }

    entityX += ENTITY_GAP_X
    // 换行
    if (entityX > 800) {
      entityX = 80
      entityY += ENTITY_GAP_Y + 180
    }
  }

  return { entityNodes, attributeNodes, relationshipNodes, edges }
}

// ========== 中间表识别 ==========

/**
 * 判断是否为中间表（多对多关系表）
 * 规则：所有非主键列都是外键列
 */
export function isJunctionTable(table: TableInfo): boolean {
  const nonPkColumns = table.columns.filter((c) => !c.primaryKey)
  if (nonPkColumns.length === 0) return false

  return nonPkColumns.every((col) =>
    table.foreignKeys.some((fk) => fk.columnName === col.name),
  )
}

// ========== 格式化 ==========

/** 格式化 Chen 风格类型显示 */
function formatChenType(col: ColumnInfo): string {
  let str = col.type
  if (col.length !== null) {
    str += `(${col.length}`
    if (col.precision !== null) str += `,${col.precision}`
    str += ')'
  }
  return str
}

/** 生成关系名称 */
function getRelationName(tableName: string, fk: ForeignKeyInfo): string {
  return `${tableName}_${fk.referencedTable}`
}

// ========== 自动布局（网格布局） ==========

/**
 * Chen 风格自动布局
 * 采用网格布局：实体块水平分散排列，关系菱形居中
 */
export function chenAutoLayout(
  entityNodes: ChenEntityNode[],
  attributeNodes: ChenAttributeNode[],
  relationshipNodes: ChenRelationshipNode[],
  edges: ChenEdgeData[],
): {
  entityNodes: ChenEntityNode[]
  attributeNodes: ChenAttributeNode[]
  relationshipNodes: ChenRelationshipNode[]
} {
  if (entityNodes.length === 0) {
    return { entityNodes: [], attributeNodes: [], relationshipNodes: [] }
  }

  // 步骤 1: 计算每个实体的"实体块"总高度
  const entityBlockHeights = new Map<string, number>()
  for (const entity of entityNodes) {
    const myAttrs = attributeNodes.filter((a) => a.ownerEntityId === entity.id)
    const totalHeight =
      myAttrs.length * ATTR_GAP_Y + ENTITY_HEIGHT + 40
    entityBlockHeights.set(entity.id, Math.max(totalHeight, 200))
  }

  // 步骤 2: 水平排列实体块
  const columnSpacing = ENTITY_GAP_X
  let currentX = 80
  const baseY = 200

  // 找到"main entity"（被引用最多的实体）
  const referenceCounts = new Map<string, number>()
  for (const rel of relationshipNodes) {
    referenceCounts.set(
      rel.targetEntityId,
      (referenceCounts.get(rel.targetEntityId) || 0) + 1,
    )
  }
  // 按引用次数降序排列
  const sortedEntities = [...entityNodes].sort((a, b) => {
    const countA = referenceCounts.get(a.id) || 0
    const countB = referenceCounts.get(b.id) || 0
    return countB - countA
  })

  const entityPositions = new Map<string, { x: number; y: number }>()

  for (let i = 0; i < sortedEntities.length; i++) {
    const entity = sortedEntities[i]
    const blockHeight = entityBlockHeights.get(entity.id) || 200
    const x = currentX
    const y = baseY

    entityPositions.set(entity.id, { x, y })

    // 排列属性 —— 围绕实体矩形四周
    const myAttrs = attributeNodes.filter((a) => a.ownerEntityId === entity.id)
    const pkAttrs = myAttrs.filter((a) => a.isPrimaryKey)
    const nonPkAttrs = myAttrs.filter((a) => !a.isPrimaryKey)

    // 主键属性 → 实体上方居中排列，带下划线标记
    let pkY = y - ATTR_GAP_Y * pkAttrs.length - 8
    for (const attr of pkAttrs) {
      attr.x = x + ENTITY_WIDTH / 2 - ATTR_WIDTH / 2
      attr.y = pkY
      pkY += ATTR_GAP_Y
    }

    // 非主键属性 → 实体左右两侧交替排布
    const leftAttrs: ChenAttributeNode[] = []
    const rightAttrs: ChenAttributeNode[] = []
    nonPkAttrs.forEach((attr, i) => {
      if (i % 2 === 0) {
        leftAttrs.push(attr)
      } else {
        rightAttrs.push(attr)
      }
    })

    // 左侧属性：从实体顶部开始向下排列
    let leftY = y + 8
    for (const attr of leftAttrs) {
      attr.x = x - ATTR_WIDTH - 16
      attr.y = leftY
      leftY += ATTR_GAP_Y
    }

    // 右侧属性：从实体顶部开始向下排列
    let rightY = y + 8
    for (const attr of rightAttrs) {
      attr.x = x + ENTITY_WIDTH + 16
      attr.y = rightY
      rightY += ATTR_GAP_Y
    }

    currentX += columnSpacing
  }

  // 更新实体位置
  const updatedEntities = entityNodes.map((e) => {
    const pos = entityPositions.get(e.id)
    if (pos) return { ...e, x: pos.x, y: pos.y }
    return e
  })

  // 步骤 3: 关系菱形放在两个实体之间（水平居中 + 垂直居中）
  const updatedRelationships = relationshipNodes.map((rel) => {
    const sourcePos = entityPositions.get(rel.sourceEntityId)
    const targetPos = entityPositions.get(rel.targetEntityId)

    if (sourcePos && targetPos) {
      const centerX = (sourcePos.x + targetPos.x) / 2
      const centerY = (sourcePos.y + targetPos.y) / 2
      return { ...rel, x: centerX - RELATION_SIZE / 2, y: centerY - RELATION_SIZE / 2 }
    }

    // 实体不存在（可能是中间表菱形），放在画布中部
    return { ...rel, x: 400 - RELATION_SIZE / 2, y: 200 - RELATION_SIZE / 2 }
  })

  return {
    entityNodes: updatedEntities,
    attributeNodes,
    relationshipNodes: updatedRelationships,
  }
}

/**
 * 生成 Chen 模式连线 X6 配置
 * @returns X6 edge 配置数组
 */
export function buildChenEdges(
  edges: ChenEdgeData[],
  relationshipNodes: ChenRelationshipNode[],
): Array<{
  id: string
  source: { cell: string }
  target: { cell: string }
  labels?: Array<{ attrs: { text: { text: string; fontSize: number; fill: string; textAnchor: string } } }>
  attrs: {
    line: {
      stroke: string
      strokeWidth: number
      targetMarker: { name: string; width: number; height: number; fill: string } | null
      strokeDasharray?: string
    }
  }
  router?: { name: string; args?: Record<string, unknown> }
}> {
  const result: Array<{
    id: string
    source: { cell: string }
    target: { cell: string }
    labels?: Array<{ attrs: { text: { text: string; fontSize: number; fill: string; textAnchor: string } } }>
    attrs: {
      line: {
        stroke: string
        strokeWidth: number
        targetMarker: { name: string; width: number; height: number; fill: string } | null
        strokeDasharray?: string
      }
    }
    router?: { name: string; args?: Record<string, unknown> }
  }> = []

  // 实体↔属性连线：细虚线
  for (const edge of edges) {
    if (edge.edgeType === 'entity-attribute') {
      result.push({
        id: edge.id,
        source: { cell: edge.source },
        target: { cell: edge.target },
        attrs: {
          line: {
            stroke: '#999',
            strokeWidth: 1,
            targetMarker: null,
            strokeDasharray: '4 2',
          },
        },
      })
    }
  }

  // 实体↔关系连线：粗实线 + 基数标注
  for (const rel of relationshipNodes) {
    // 源实体 → 菱形
    if (rel.sourceEntityId) {
      const relEdgeId = `rel-edge-${rel.sourceEntityId}-${rel.id}`
      // 判断基数：1:1 或 1:N
      const cardinality = rel.isJunctionTable ? 'M' : 'N'

      result.push({
        id: relEdgeId,
        source: { cell: rel.sourceEntityId },
        target: { cell: rel.id },
        labels: [
          {
            attrs: {
              text: {
                text: cardinality,
                fontSize: 14,
                fill: '#000',
                textAnchor: 'middle',
              },
            },
          },
        ],
        attrs: {
          line: {
            stroke: '#1890FF',
            strokeWidth: 2,
            targetMarker: null,
          },
        },
      })
    }

    // 菱形 → 目标实体
    if (rel.targetEntityId) {
      const relEdgeId = `rel-edge-${rel.id}-${rel.targetEntityId}`
      result.push({
        id: relEdgeId,
        source: { cell: rel.id },
        target: { cell: rel.targetEntityId },
        labels: [
          {
            attrs: {
              text: {
                text: '1',
                fontSize: 14,
                fill: '#000',
                textAnchor: 'middle',
              },
            },
          },
        ],
        attrs: {
          line: {
            stroke: '#1890FF',
            strokeWidth: 2,
            targetMarker: null,
          },
        },
      })
    }
  }

  return result
}
