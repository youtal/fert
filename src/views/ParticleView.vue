<script setup lang="ts">
/**
 * ParticleView.vue
 * 
 * 粒子演化仿真主视图。
 * 已完成重构：将大型组件拆分为原子组件，增强可维护性。
 */
import { useEcosystem } from '@/composables/useEcosystem'
import EcosystemCanvas from '@/components/ecosystem/EcosystemCanvas.vue'
import EcosystemStatusPanel from '@/components/ecosystem/EcosystemStatusPanel.vue'
import EcosystemHistoryPanel from '@/components/ecosystem/EcosystemHistoryPanel.vue'
import EcosystemControlPanel from '@/components/ecosystem/EcosystemControlPanel.vue'

// 初始化物理仿真钩子，导出鼠标控制接口
const { mouse, setRefs } = useEcosystem()

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