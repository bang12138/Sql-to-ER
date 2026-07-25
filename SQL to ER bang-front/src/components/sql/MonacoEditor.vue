<template>
  <div ref="editorContainer" class="monaco-editor-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import loader from '@monaco-editor/loader'
import type * as Monaco from 'monaco-editor'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editorContainer = ref<HTMLElement | null>(null)
let editor: Monaco.editor.IStandaloneCodeEditor | null = null

onMounted(async () => {
  // 异步加载 Monaco Editor
  const monaco = await loader.init()

  if (!editorContainer.value) return

  editor = monaco.editor.create(editorContainer.value, {
    value: props.modelValue,
    language: 'sql',
    theme: 'vs',
    fontSize: 14,
    lineNumbers: 'on',
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    wordWrap: 'on',
    tabSize: 2,
    renderWhitespace: 'selection',
    bracketPairColorization: { enabled: true },
    padding: { top: 12, bottom: 12 },
  })

  // 监听内容变化
  editor.onDidChangeModelContent(() => {
    const value = editor?.getValue() ?? ''
    emit('update:modelValue', value)
  })
})

// 外部更新 modelValue 时同步到编辑器
watch(
  () => props.modelValue,
  (newVal) => {
    if (editor && newVal !== editor.getValue()) {
      editor.setValue(newVal)
    }
  },
)

onBeforeUnmount(() => {
  editor?.dispose()
})

/** 暴露 focus 方法供外部调用 */
function focus() {
  editor?.focus()
}

defineExpose({ focus })
</script>

<style lang="scss" scoped>
.monaco-editor-container {
  flex: 1;
  width: 100%;
  min-height: 0;
}
</style>
