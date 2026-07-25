<template>
  <div class="canvas-toolbar">
    <div class="toolbar-group">
      <el-tooltip content="放大" placement="bottom">
        <el-button size="small" circle @click="$emit('zoomIn')">
          <el-icon><ZoomIn /></el-icon>
        </el-button>
      </el-tooltip>
      <span class="zoom-label">{{ Math.round(zoomRatio * 100) }}%</span>
      <el-tooltip content="缩小" placement="bottom">
        <el-button size="small" circle @click="$emit('zoomOut')">
          <el-icon><ZoomOut /></el-icon>
        </el-button>
      </el-tooltip>
      <el-tooltip content="重置缩放" placement="bottom">
        <el-button size="small" @click="$emit('zoomReset')">1:1</el-button>
      </el-tooltip>
    </div>

    <div class="toolbar-divider"></div>

    <div class="toolbar-group">
      <el-tooltip content="自动布局" placement="bottom">
        <el-button size="small" @click="$emit('autoLayout')">
          <el-icon><Grid /></el-icon>
        </el-button>
      </el-tooltip>
      <el-tooltip content="适配画布" placement="bottom">
        <el-button size="small" @click="$emit('zoomToFit')">
          <el-icon><FullScreen /></el-icon>
        </el-button>
      </el-tooltip>
    </div>

    <div class="toolbar-divider"></div>

    <div class="toolbar-group">
      <!-- V1.1: 模式切换 -->
      <el-dropdown trigger="click" @command="handleSwitchMode">
        <el-button size="small">
          <el-icon><Switch /></el-icon>
          {{ modeLabel }}
          <el-icon class="el-icon--right"><ArrowDown /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="physical" :class="{ 'is-active': mode === 'physical' }">
              <el-icon><Histogram /></el-icon>
              物理 ER（DataGrip 风格）
            </el-dropdown-item>
            <el-dropdown-item command="chen" :class="{ 'is-active': mode === 'chen' }">
              <el-icon><Connection /></el-icon>
              概念 ER（Chen 风格）
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <div class="toolbar-divider"></div>

    <div class="toolbar-group">
      <el-tooltip content="导出图片" placement="bottom">
        <el-button size="small" type="primary" @click="$emit('export')">
          <el-icon><Download /></el-icon>
          导出
        </el-button>
      </el-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  ZoomIn, ZoomOut, Grid, FullScreen, Download,
  Switch, ArrowDown, Histogram, Connection,
} from '@element-plus/icons-vue'
import type { ErMode } from '@/types'

const props = defineProps<{
  zoomRatio: number
  mode: ErMode
}>()

const emit = defineEmits<{
  zoomIn: []
  zoomOut: []
  zoomReset: []
  autoLayout: []
  zoomToFit: []
  export: []
  switchMode: [mode: ErMode]
}>()

const modeLabel = computed(() => {
  return props.mode === 'physical' ? '物理 ER' : '概念 ER'
})

function handleSwitchMode(command: string) {
  emit('switchMode', command as ErMode)
}
</script>

<style lang="scss" scoped>
.canvas-toolbar {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 10;
  user-select: none;

  .toolbar-group {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .toolbar-divider {
    width: 1px;
    height: 20px;
    background: #e4e7ed;
    margin: 0 4px;
  }

  .zoom-label {
    font-size: 12px;
    color: #606266;
    min-width: 42px;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
}
</style>
