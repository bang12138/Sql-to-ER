import { Shape } from '@antv/x6'
import { getNodeColor } from './graphTransformer'
import type { ErNodeData } from '@/types'

/**
 * 注册物理 ER 图自定义表节点（全局注册，应用启动时仅需调用一次）
 */
export function registerPhysicalNodes() {
  try {
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

      const fkColumns = new Set<string>()
      if (cell.getData()?.fkColumns) {
        for (const fk of cell.getData().fkColumns as string[]) {
          fkColumns.add(fk)
        }
      }

      const columnsHtml = (columns || [])
        .map((col: any) => {
          const isPK = col.primaryKey
          const isFK = fkColumns.has(col.name)
          const typeStr = formatPhysType(col)
          const pkBadge = isPK ? '<span class="pk-badge">🔑</span>' : ''
          const fkBadge = isFK && !isPK ? '<span class="fk-badge">🔗</span>' : ''
          const commentIcon = col.comment
            ? `<span class="col-comment-icon" title="${escHtml(col.comment)}">💬</span>`
            : ''
          const rowClass = isPK ? 'pk-row' : isFK ? 'fk-row' : ''

          return `<div class="column-row ${rowClass}" data-col="${escHtml(col.name)}">
            <span class="col-icon">${pkBadge}${fkBadge}</span>
            <span class="col-name">${escHtml(col.name)}</span>
            <span class="col-type">${escHtml(typeStr)}</span>
            ${commentIcon}
          </div>`
        })
        .join('')

      const pkIcon = hasPK ? '<span class="pk-header-icon">🔑</span>' : ''

      return `<div class="er-node">
        <div class="node-header" style="background-color:${headerColor}">
          ${pkIcon}
          <span class="table-name">${escHtml(label)}</span>
          ${tableComment ? `<span class="table-comment">${escHtml(tableComment)}</span>` : ''}
        </div>
        <div class="node-body">
          ${columnsHtml || '<div class="empty-hint">无字段</div>'}
        </div>
      </div>`
    },
  })
  } catch (_) { /* HMR */ }
}

function formatPhysType(col: any): string {
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

function escHtml(str: string): string {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}
