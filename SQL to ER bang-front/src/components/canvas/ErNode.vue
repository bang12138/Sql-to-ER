<template>
  <div class="er-node" @dblclick.stop="handleDblClick">
    <!-- 表头 -->
    <div class="node-header" :style="{ backgroundColor: headerColor }">
      <el-icon class="pk-icon" v-if="hasPK"><Key /></el-icon>
      <span class="table-name" @dblclick.stop="startEdit('tableName')">
        <template v-if="editingField === 'tableName'">
          <input
            ref="editInputRef"
            class="inline-input"
            v-model="editValue"
            @blur="finishEdit"
            @keydown.enter="finishEdit"
            @keydown.escape="cancelEdit"
            @click.stop
          />
        </template>
        <template v-else>{{ displayTableName }}</template>
      </span>
      <span class="table-comment" v-if="tableComment && editingField !== 'tableName'">
        {{ tableComment }}
      </span>
    </div>

    <!-- 字段列表 -->
    <div class="node-body">
      <div
        v-for="col in columns"
        :key="col.name"
        class="column-row"
        :class="{ 'pk-row': col.primaryKey, 'fk-row': isFK(col.name) }"
        @dblclick.stop="startEdit('column', col.name)"
      >
        <!-- PK 图标 -->
        <span class="col-icon">
          <span v-if="col.primaryKey" class="pk-badge">🔑</span>
          <span v-else-if="isFK(col.name)" class="fk-badge">🔗</span>
        </span>

        <!-- 列名 -->
        <span class="col-name">
          <template v-if="editingField === col.name">
            <input
              ref="editInputRef"
              class="inline-input"
              v-model="editValue"
              @blur="finishEdit"
              @keydown.enter="finishEdit"
              @keydown.escape="cancelEdit"
              @click.stop
            />
          </template>
          <template v-else>{{ col.name }}</template>
        </span>

        <!-- 类型 -->
        <span class="col-type">{{ formatType(col) }}</span>

        <!-- 注释 tooltip -->
        <el-tooltip
          v-if="col.comment"
          :content="col.comment"
          placement="top"
          :show-after="500"
        >
          <span class="col-comment-icon">💬</span>
        </el-tooltip>
      </div>

      <!-- 无字段时的占位 -->
      <div v-if="columns.length === 0" class="empty-hint">无字段</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { Key } from '@element-plus/icons-vue'
import { getNodeColor } from '@/utils/graphTransformer'
import type { ColumnInfo } from '@/types'

const props = defineProps<{
  tableName: string
  tableComment: string | null
  columns: ColumnInfo[]
  primaryKeys: string[]
  foreignKeys: Array<{ columnName: string; referencedTable: string; referencedColumn: string }>
}>()

const emit = defineEmits<{
  editTableName: [oldName: string, newName: string]
  editColumnName: [tableName: string, oldColName: string, newColName: string]
}>()

// 编辑态
const editingField = ref<string | null>(null)
const editValue = ref('')
const editInputRef = ref<HTMLInputElement | null>(null)

// 节点主题色
const headerColor = computed(() => getNodeColor(props.tableName))
const hasPK = computed(() => props.primaryKeys.length > 0)
const displayTableName = computed(() => props.tableName)

// 判断列是否外键
function isFK(colName: string): boolean {
  return props.foreignKeys.some((fk) => fk.columnName === colName)
}

// 格式化类型显示
function formatType(col: ColumnInfo): string {
  let typeStr = col.type
  if (col.length !== null) {
    typeStr += `(${col.length}`
    if (col.precision !== null) {
      typeStr += `,${col.precision}`
    }
    typeStr += ')'
  }
  if (!col.nullable) typeStr += ' NOT NULL'
  if (col.autoIncrement) typeStr += ' AI'
  return typeStr
}

// 鼠标悬停判断可编辑
function isEditable(): boolean {
  return true
}

// 双击处理
function handleDblClick() {
  // 双击空白区域取消编辑
  if (editingField.value) {
    cancelEdit()
  }
}

function startEdit(type: 'tableName' | 'column', colName?: string) {
  if (type === 'tableName') {
    editingField.value = 'tableName'
    editValue.value = props.tableName
  } else if (colName) {
    editingField.value = colName
    const col = props.columns.find((c) => c.name === colName)
    editValue.value = col?.name ?? colName
  }
  nextTick(() => {
    editInputRef.value?.focus()
    editInputRef.value?.select()
  })
}

function finishEdit() {
  if (!editingField.value) return

  const newValue = editValue.value.trim()
  if (!newValue) {
    cancelEdit()
    return
  }

  if (editingField.value === 'tableName' && newValue !== props.tableName) {
    emit('editTableName', props.tableName, newValue)
  } else if (newValue !== editingField.value) {
    emit('editColumnName', props.tableName, editingField.value, newValue)
  }

  editingField.value = null
}

function cancelEdit() {
  editingField.value = null
}
</script>

<style lang="scss" scoped>
.er-node {
  background: #fff;
  border-radius: 8px;
  border: 2px solid #dcdfe6;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  cursor: move;
  transition: box-shadow 0.2s;
  min-width: 200px;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }

  .node-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    color: #fff;
    font-weight: 600;
    font-size: 13px;
    min-height: 36px;

    .pk-icon {
      font-size: 14px;
      flex-shrink: 0;
    }

    .table-name {
      cursor: text;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .table-comment {
      font-size: 11px;
      font-weight: 400;
      opacity: 0.85;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex-shrink: 1;
    }
  }

  .node-body {
    padding: 4px 0;

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
        font-size: 11px;

        .pk-badge,
        .fk-badge {
          font-size: 10px;
        }
      }

      .col-name {
        font-weight: 500;
        color: #303133;
        cursor: text;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex-shrink: 1;
        min-width: 60px;
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
        cursor: help;
      }
    }

    .empty-hint {
      padding: 12px;
      text-align: center;
      color: #c0c4cc;
      font-size: 12px;
    }
  }

  .inline-input {
    width: 100%;
    border: 1px solid #409eff;
    border-radius: 3px;
    padding: 1px 4px;
    font-size: inherit;
    font-family: inherit;
    outline: none;
    background: rgba(255, 255, 255, 0.9);
    color: #303133;
  }
}
</style>
