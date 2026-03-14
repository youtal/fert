<script setup lang="ts">
/**
 * components/ecosystem/EcosystemCanvas.vue
 *
 * 画布容器组件。
 * 只负责：
 * 1. 暴露 canvas / container 引用给上层。
 * 2. 将鼠标坐标转换为画布局部坐标。
 *
 * 这里不直接持有仿真状态，避免渲染层与计算层耦合。
 */
import { ref, onMounted } from 'vue'

// 真实 canvas DOM 引用，由 useEcosystem 接管后参与尺寸同步与绘制。
const canvasRef = ref<HTMLCanvasElement | null>(null)
// 外层容器 DOM 引用，用于响应式读取可用尺寸。
const containerRef = ref<HTMLDivElement | null>(null)

const emit = defineEmits<{
  (e: 'init', canvas: typeof canvasRef, container: typeof containerRef): void
  (e: 'mousemove', x: number, y: number): void
  (e: 'mouseleave'): void
}>()

onMounted(() => {
  // 组件挂载后再把真实 DOM ref 交给 composable 初始化。
  emit('init', canvasRef, containerRef)
})

/**
 * 将浏览器窗口坐标转换为 canvas 内部坐标，
 * 供上层转化为粒子的引导目标点。
 */
const onMouseMove = (e: MouseEvent) => {
  if (!canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  emit('mousemove', e.clientX - rect.left, e.clientY - rect.top)
}
</script>

<template>
  <div class="canvas-container" ref="containerRef">
    <canvas 
      ref="canvasRef" 
      @mousemove="onMouseMove" 
      @mouseleave="emit('mouseleave')"
    ></canvas>
  </div>
</template>

<style scoped>
.canvas-container {
  width: 100%; height: 100%;
  position: absolute; top: 0; left: 0;
}
canvas { display: block; width: 100%; height: 100%; cursor: crosshair; }
</style>
