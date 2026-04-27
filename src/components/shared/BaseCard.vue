<script setup lang="ts">
/**
 * components/shared/BaseCard.vue
 *
 * 通用卡片承载模板。
 * 组件本身不声明视觉样式，只负责统一卡片的根节点与透传属性；
 * 具体外观继续由调用方传入的 class 和原有 scoped CSS 决定。
 */
withDefaults(defineProps<{
  as?: string
}>(), {
  as: 'div',
})
</script>

<template>
  <component :is="as">
    <slot />
  </component>
</template>
