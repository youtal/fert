<script setup lang="ts">
/**
 * components/ecosystem/EcosystemCanvas.vue
 * 
 * 专门负责 Canvas 渲染容器及其事件桥接。
 */
import { ref, onMounted } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)

const emit = defineEmits<{
  (e: 'init', canvas: typeof canvasRef, container: typeof containerRef): void
  (e: 'mousemove', x: number, y: number): void
  (e: 'mouseleave'): void
}>()

onMounted(() => {
  emit('init', canvasRef, containerRef)
})

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