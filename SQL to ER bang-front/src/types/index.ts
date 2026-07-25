// ========== 通用响应 ==========
/** 后端统一响应包装 */
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
  timestamp: number
}

// ========== 请求类型 ==========
/** POST /api/parse 请求体 */
export interface ParseRequest {
  sql: string
}

// ========== 响应数据类型 ==========
/** POST /api/parse 响应 data */
export interface ParseResponse {
  tables: TableInfo[]
}

/** 表信息 */
export interface TableInfo {
  tableName: string
  tableComment: string | null
  columns: ColumnInfo[]
  primaryKeys: string[]
  foreignKeys: ForeignKeyInfo[]
}

/** 列信息 */
export interface ColumnInfo {
  name: string
  type: string
  length: number | null
  precision: number | null
  nullable: boolean
  primaryKey: boolean
  autoIncrement: boolean
  defaultValue: string | null
  comment: string | null
}

/** 外键信息 */
export interface ForeignKeyInfo {
  constraintName: string | null
  columnName: string
  referencedTable: string
  referencedColumn: string
}

/** GET /api/example 响应 data */
export interface ExampleResponse {
  title: string
  sql: string
  tableCount: number
  relationCount: number
}

/** GET /api/health 响应 data */
export interface HealthResponse {
  status: string
  version: string
  uptime: string
}

// ========== 前端内部类型（API 响应 → X6 图数据转换） ==========
/** AntV X6 节点数据 */
export interface ErNodeData {
  id: string
  x: number
  y: number
  width: number
  height: number
  label: string
  tableComment: string | null
  columns: ColumnInfo[]
  primaryKeys: string[]
}

/** AntV X6 边数据 */
export interface ErEdgeData {
  id: string
  source: string
  target: string
  sourceColumn: string
  targetColumn: string
  label: string
}

/** 导出选项 */
export interface ExportOptions {
  format: 'png' | 'jpeg'
  background: string
}

/** 画布工具栏事件 */
export interface CanvasToolbarEvents {
  zoomIn: []
  zoomOut: []
  zoomReset: []
  autoLayout: []
  export: []
  zoomToFit: []
}

// ========== V1.1 概念 ER 图（Chen 风格）类型 ==========
/** ER 图模式 */
export type ErMode = 'physical' | 'chen'

/** Chen 风格节点类型 */
export type ChenNodeType = 'chen-entity' | 'chen-attribute' | 'chen-relationship'

/** Chen 风格节点基础数据 */
export interface ChenNodeData {
  id: string
  nodeType: ChenNodeType
  x: number
  y: number
  width: number
  height: number
  label: string
}

/** Chen 风格实体节点（矩形） */
export interface ChenEntityNode extends ChenNodeData {
  nodeType: 'chen-entity'
  entityName: string
}

/** Chen 风格属性节点（椭圆） */
export interface ChenAttributeNode extends ChenNodeData {
  nodeType: 'chen-attribute'
  attrName: string
  attrType: string
  isPrimaryKey: boolean
  ownerEntityId: string
}

/** Chen 风格关系节点（菱形） */
export interface ChenRelationshipNode extends ChenNodeData {
  nodeType: 'chen-relationship'
  relationName: string
  isJunctionTable: boolean
  sourceEntityId: string
  targetEntityId: string
}

/** Chen 风格边数据 */
export interface ChenEdgeData {
  id: string
  source: string
  target: string
  edgeType: 'entity-attribute' | 'entity-relationship'
  label?: string
}

/** 节点位置缓存 */
export interface PositionCache {
  physical: Record<string, { x: number; y: number }>
  chen: Record<string, { x: number; y: number }>
}
