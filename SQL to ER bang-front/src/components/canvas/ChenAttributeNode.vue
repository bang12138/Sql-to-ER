<template>
  <div class="chen-attribute-node" :class="{ pk: isPrimaryKey }">
    <span class="attr-text">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  isPrimaryKey: boolean
}>()
</script>

<style lang="scss" scoped>
.chen-attribute-node {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFFBE6;
  border: 1.5px solid #FAAD14;
  border-radius: 50%;
  box-sizing: border-box;

  &.pk {
    background: #FFF1F0;
    border-color: #FF4D4F;
  }

  .attr-text {
    font-size: 11px;
    color: #555;
    text-align: center;
    padding: 2px 6px;
    text-decoration: v-bind("isPrimaryKey ? 'underline' : 'none'");
  }
}
</style>
