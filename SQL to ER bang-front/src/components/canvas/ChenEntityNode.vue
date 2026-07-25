<template>
  <div class="chen-entity-node">
    <div class="entity-label">{{ entityName }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  entityName: string
}>()
</script>

<style lang="scss" scoped>
.chen-entity-node {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #E8F4FD;
  border: 2px solid #1890FF;
  border-radius: 0;
  box-sizing: border-box;

  .entity-label {
    font-size: 14px;
    font-weight: 700;
    color: #333;
    text-align: center;
    padding: 4px;
    word-break: break-all;
  }
}
</style>
