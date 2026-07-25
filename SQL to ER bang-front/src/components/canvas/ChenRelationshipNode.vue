<template>
  <div class="chen-relationship-node">
    <span class="relation-label">{{ relationName }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  relationName: string
}>()
</script>

<style lang="scss" scoped>
.chen-relationship-node {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFF1F0;
  border: 1.5px solid #FF4D4F;
  transform: rotate(45deg);
  box-sizing: border-box;

  .relation-label {
    font-size: 12px;
    font-weight: 700;
    color: #CF1322;
    text-align: center;
    padding: 2px;
    transform: rotate(-45deg);
    word-break: break-all;
  }
}
</style>
