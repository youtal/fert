<script setup lang="ts">
/**
 * ParticleView.vue
 *
 * 生态系统视图只做编排：
 * 1. 将状态面板、历史面板、控制面板布置在画布两侧。
 * 2. 将鼠标事件转给 useEcosystem，避免组件层持有仿真逻辑。
 */
import { useEcosystem } from '@/composables/useEcosystem'
import EcosystemCanvas from '@/components/ecosystem/EcosystemCanvas.vue'
import EcosystemStatusPanel from '@/components/ecosystem/EcosystemStatusPanel.vue'
import EcosystemHistoryPanel from '@/components/ecosystem/EcosystemHistoryPanel.vue'
import EcosystemControlPanel from '@/components/ecosystem/EcosystemControlPanel.vue'

// useEcosystem 内部负责后台仿真与前台渲染分离。
const { mouse, setRefs } = useEcosystem()

/**
 * 鼠标移动仅更新目标点，不直接操作粒子数组。
 */
const onMouseMove = (x: number, y: number) => {
  mouse.x = x
  mouse.y = y
  mouse.active = true
}
</script>

<template>
  <div class="particle-view">
    <!-- 左侧交互面板组 -->
    <div class="interactive-sidebar left">
      <EcosystemStatusPanel />
      <EcosystemHistoryPanel />
    </div>

    <!-- 右侧交互面板组 -->
    <div class="interactive-sidebar right">
      <EcosystemControlPanel />
    </div>

    <!-- 高性能渲染层 -->
    <EcosystemCanvas 
      @init="setRefs"
      @mousemove="onMouseMove"
      @mouseleave="mouse.active = false"
    />
  </div>
</template>

<style scoped>
.particle-view {
  width: 100%; height: 100%;
  background: radial-gradient(circle at top right, #1e293b 0%, #09090b 100%);
  position: absolute; top: 0; left: 0; overflow: hidden;
}

.interactive-sidebar {
  position: absolute; top: 1.5rem;
  display: flex; flex-direction: column; gap: 2.5rem;
  z-index: 200;
}
.interactive-sidebar.left { left: 1.5rem; }
.interactive-sidebar.right { right: 1.5rem; align-items: flex-end; }
</style>
