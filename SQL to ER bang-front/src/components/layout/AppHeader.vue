<template>
  <header class="app-header">
    <div class="header-left">
      <span class="logo">🔷</span>
      <h1 class="title">SQL to ER bang</h1>
    </div>
    <div class="header-right">
      <a
        href="https://github.com/bang12138/Sql-to-ER"
        target="_blank"
        rel="noopener noreferrer"
        class="github-link"
      >
        <el-icon :size="18"><Link /></el-icon>
        <span>GitHub</span>
      </a>
    </div>
  </header>
</template>

<script setup lang="ts">
import { Link } from '@element-plus/icons-vue'
</script>

<style lang="scss" scoped>
.app-header {
  height: var(--header-height);
  background: #fff;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
  z-index: 100;

  .header-left {
    display: flex;
    align-items: center;
    gap: 10px;

    .logo {
      font-size: 22px;
    }

    .title {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
    }
  }

  .header-right {
    .github-link {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 13px;
      padding: 6px 12px;
      border-radius: 6px;
      transition: all 0.2s;

      &:hover {
        color: #409eff;
        background: #ecf5ff;
      }
    }
  }
}
</style>
