<template>
  <div class="sql-input-panel">
    <div class="panel-header">
      <span class="panel-title">📝 SQL 输入</span>
      <span class="char-count">{{ internalSql.length }} 字符</span>
    </div>
    <div class="editor-wrapper">
      <MonacoEditor
        :model-value="internalSql"
        @update:model-value="onEditorChange"
        ref="editorRef"
      />
    </div>
    <div class="panel-actions">
      <el-button
        type="primary"
        :loading="loading"
        :disabled="!internalSql.trim()"
        @click="$emit('parse', internalSql)"
      >
        <el-icon v-if="!loading"><MagicStick /></el-icon>
        {{ loading ? '解析中...' : '解析' }}
      </el-button>
      <el-button @click="$emit('loadExample')">
        <el-icon><FolderOpened /></el-icon>
        加载示例
      </el-button>
      <el-button
        :disabled="!internalSql"
        @click="handleClear"
      >
        <el-icon><Delete /></el-icon>
        清空
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { MagicStick, FolderOpened, Delete } from '@element-plus/icons-vue'
import MonacoEditor from './MonacoEditor.vue'

const props = defineProps<{
  loading: boolean
  sqlText: string
}>()

const emit = defineEmits<{
  parse: [sql: string]
  loadExample: []
  clear: []
  'update:sqlText': [value: string]
}>()

const editorRef = ref<InstanceType<typeof MonacoEditor> | null>(null)
const internalSql = ref(props.sqlText)

// 同步外部 sqlText 到编辑器
watch(
  () => props.sqlText,
  (newVal) => {
    if (newVal !== internalSql.value) {
      internalSql.value = newVal
    }
  },
)

function onEditorChange(value: string) {
  internalSql.value = value
  emit('update:sqlText', value)
}

function handleClear() {
  internalSql.value = ''
  emit('update:sqlText', '')
  emit('clear')
  editorRef.value?.focus()
}

defineExpose({ sqlText: internalSql })
</script>

<style lang="scss" scoped>
.sql-input-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;

    .panel-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .char-count {
      font-size: 12px;
      color: var(--text-muted);
    }
  }

  .editor-wrapper {
    flex: 1;
    display: flex;
    min-height: 0;
    overflow: hidden;
  }

  .panel-actions {
    display: flex;
    gap: 8px;
    padding: 10px 16px;
    border-top: 1px solid var(--border-color);
    flex-shrink: 0;
  }
}
</style>
