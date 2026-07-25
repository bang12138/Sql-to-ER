<template>
  <el-dialog
    v-model="dialogVisible"
    title="导出 ER 图"
    width="420px"
    :close-on-click-modal="false"
    destroy-on-close
  >
    <el-form label-position="top" size="default">
      <el-form-item label="导出格式">
        <el-radio-group v-model="exportFormat">
          <el-radio-button value="png">
            <el-icon><Picture /></el-icon>
            PNG
          </el-radio-button>
          <el-radio-button value="jpeg">
            <el-icon><PictureFilled /></el-icon>
            JPEG
          </el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="背景色">
        <el-radio-group v-model="background">
          <el-radio-button value="#ffffff">白色</el-radio-button>
          <el-radio-button value="transparent" :disabled="exportFormat === 'jpeg'">
            透明
          </el-radio-button>
        </el-radio-group>
        <div class="form-tip" v-if="exportFormat === 'jpeg'">
          JPEG 格式不支持透明背景
        </div>
      </el-form-item>

      <el-form-item label="文件名">
        <el-input
          v-model="filename"
          placeholder="ER 图文件名"
          :suffix="`.${exportFormat}`"
        />
      </el-form-item>
    </el-form>

    <div class="export-preview-info">
      <el-alert
        title="导出提示"
        type="info"
        :closable="false"
        show-icon
      >
        <template #default>
          <p>导出将包含当前画布内所有可见的节点和连线。</p>
          <p>建议先使用「适配画布」确保全部内容可见。</p>
        </template>
      </el-alert>
    </div>

    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleExport">
        <el-icon><Download /></el-icon>
        导出
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Picture, PictureFilled, Download } from '@element-plus/icons-vue'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  export: [options: { format: 'png' | 'jpeg'; background: string }]
}>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
})

const exportFormat = ref<'png' | 'jpeg'>('png')
const background = ref('#ffffff')
const filename = ref('er-diagram')

// JPEG 时强制白色背景
watch(exportFormat, (val) => {
  if (val === 'jpeg' && background.value === 'transparent') {
    background.value = '#ffffff'
  }
})

function handleExport() {
  emit('export', {
    format: exportFormat.value,
    background: background.value,
  })
  dialogVisible.value = false
}
</script>

<style lang="scss" scoped>
.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.export-preview-info {
  margin-top: 8px;

  p {
    font-size: 12px;
    line-height: 1.6;
    margin: 0;
  }
}
</style>
