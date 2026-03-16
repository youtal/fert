<script setup lang="ts">
/**
 * FloatingPanelGroup.vue
 *
 * 共享浮层壳组件。
 * 统一处理：
 * 1. 悬浮预览与点击锁定展开。
 * 2. 左右两侧的浮层定位。
 * 3. 图标触发器的基础可访问性属性。
 */
import { computed, ref } from 'vue'

const props = withDefaults(defineProps<{
  icon: string
  label: string
  side: 'left' | 'right'
  panelWidth?: string
}>(), {
  panelWidth: '300px',
})

const isExpanded = ref(false)
const isHovered = ref(false)

const alignmentClass = computed(() => `${props.side}-aligned`)
const offset = computed(() => (props.side === 'left' ? '-15px' : '15px'))
</script>

<template>
  <div
    class="panel-group"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <Transition name="slide-fade">
      <div
        v-if="props.side === 'right'"
        v-show="isExpanded || isHovered"
        class="floating-panel"
        :class="alignmentClass"
        :style="{ width: props.panelWidth, '--offset': offset }"
      >
        <div class="glass-card">
          <slot />
        </div>
      </div>
    </Transition>

    <button
      type="button"
      class="icon-trigger"
      :class="{ 'active-glow': isExpanded }"
      :aria-expanded="isExpanded || isHovered"
      :aria-label="label"
      @click.stop="isExpanded = !isExpanded"
    >
      <span class="icon" aria-hidden="true">{{ icon }}</span>
    </button>

    <Transition name="slide-fade">
      <div
        v-if="props.side === 'left'"
        v-show="isExpanded || isHovered"
        class="floating-panel"
        :class="alignmentClass"
        :style="{ width: props.panelWidth, '--offset': offset }"
      >
        <div class="glass-card">
          <slot />
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.panel-group {
  position: relative;
  display: flex;
  align-items: flex-start;
}

.icon-trigger {
  width: 52px;
  height: 52px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 1.4rem;
  z-index: 232;
  user-select: none;
  color: inherit;
}

.icon-trigger:hover,
.icon-trigger:focus-visible {
  background: rgba(255, 255, 255, 0.08);
  transform: scale(1.05);
  outline: none;
}

.active-glow {
  background: rgba(255, 255, 255, 0.12) !important;
  backdrop-filter: blur(12px);
  border-color: rgba(99, 102, 241, 0.4);
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.2);
}

.floating-panel {
  position: absolute;
  top: 0;
  z-index: 31;
  pointer-events: auto;
}

.floating-panel.left-aligned {
  left: 64px;
}

.floating-panel.right-aligned {
  right: 64px;
}

.glass-card {
  background: rgba(15, 23, 42, 0.72);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 1.2rem;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease-out;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(var(--offset));
  opacity: 0;
}
</style>
