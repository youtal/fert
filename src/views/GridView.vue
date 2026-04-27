<script setup lang="ts">
/**
 * GridView.vue
 *
 * 点阵视图负责呈现固定规模的二维点阵。
 * 这里使用 Canvas 承载 150 * 150 个点，并通过滚轮缩放观察局部结构。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import GridControlPanel from '@/components/grid/GridControlPanel.vue'
import { useGridGrowthAnimation, type GridGrowthState } from '@/composables/grid/useGridGrowthAnimation'
import { useGridViewport, type GridViewportState } from '@/composables/grid/useGridViewport'
import { drawGridNetwork } from '@/utils/gridCanvas'
import {
  GRID_SIZE,
  POINT_COUNT,
  SEED_DIGITS,
  createRandomSeed,
  formatSeed,
  generateNetworkPlan,
  normalizeSeed as normalizeGridSeed,
  type CompensationStep,
  type DetectionStep,
  type GridSegment,
} from '@/utils/gridNetwork'

const DEFAULT_ANIMATION_SPEED = 140

const canvasRef = ref<HTMLCanvasElement | null>(null)
const seedInput = ref('')
const activeSeed = ref('0')
const isSeedFrozen = ref(false)
const animationSpeed = ref(DEFAULT_ANIMATION_SPEED)
let resizeObserver: ResizeObserver | null = null
let removeWindowResizeListener: (() => void) | null = null
let renderFrameId = 0
let networkSegments: GridSegment[] = []
let baseSegmentCount = 0
let compensationSteps: CompensationStep[] = []
let detectionSteps: DetectionStep[] = []

const viewport: GridViewportState = {
  viewportWidth: 0,
  viewportHeight: 0,
  zoom: 1,
  originX: 0,
  originY: 0,
}

const growthState: GridGrowthState = {
  animatedSegmentCount: 0,
  activeDetectionStepIndex: 0,
  activeWindow: null,
  activeProbeSegments: [],
}

const normalizeSeed = (value: string) => {
  return normalizeGridSeed(value, activeSeed.value)
}

const syncSeedInput = (seed: string) => {
  activeSeed.value = seed
  seedInput.value = formatSeed(seed)
}

const scheduleDraw = () => {
  if (renderFrameId) return
  renderFrameId = window.requestAnimationFrame(() => {
    renderFrameId = 0
    drawGrid()
  })
}

const { startGrowthAnimation, stopGrowthAnimation } = useGridGrowthAnimation({
  animationSpeed,
  state: growthState,
  getBaseSegmentCount: () => baseSegmentCount,
  getNetworkSegmentCount: () => networkSegments.length,
  getDetectionSteps: () => detectionSteps,
  scheduleDraw,
})

const {
  handleWheel,
  handlePointerDown,
  handlePointerMove,
  stopDragging,
} = useGridViewport({
  canvasRef,
  viewport,
  scheduleDraw,
})

const regenerateNetwork = (seed: string) => {
  const plan = generateNetworkPlan(seed)
  baseSegmentCount = plan.baseSegments.length
  compensationSteps = plan.compensationSteps
  detectionSteps = plan.detectionSteps
  networkSegments = [
    ...plan.baseSegments,
    ...plan.compensationSteps.flatMap((step) => step.segments),
  ]
  startGrowthAnimation()
  scheduleDraw()
}

const applySeedFromInput = () => {
  syncSeedInput(normalizeSeed(seedInput.value))
}

const resetNetwork = () => {
  const nextSeed = isSeedFrozen.value ? normalizeSeed(seedInput.value) : createRandomSeed()
  syncSeedInput(nextSeed)
  regenerateNetwork(nextSeed)
}

const replayNetwork = () => {
  applySeedFromInput()
  regenerateNetwork(activeSeed.value)
}

const syncCanvasSize = () => {
  const canvas = canvasRef.value
  const container = canvas?.parentElement
  if (!canvas || !container) return

  const { width, height } = container.getBoundingClientRect()
  const pixelRatio = window.devicePixelRatio || 1

  viewport.viewportWidth = width
  viewport.viewportHeight = height

  const nextWidth = Math.floor(width * pixelRatio)
  const nextHeight = Math.floor(height * pixelRatio)
  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth
    canvas.height = nextHeight
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
  }
}

const drawGrid = () => {
  const canvas = canvasRef.value
  const context = canvas?.getContext('2d')
  if (!canvas || !context) return

  drawGridNetwork(context, {
    ...viewport,
    animatedSegmentCount: growthState.animatedSegmentCount,
    networkSegments,
    activeWindow: growthState.activeWindow,
    activeProbeSegments: growthState.activeProbeSegments,
    pixelRatio: window.devicePixelRatio || 1,
  })
}

const handleResize = () => {
  syncCanvasSize()
  scheduleDraw()
}

onMounted(() => {
  syncSeedInput(createRandomSeed())
  regenerateNetwork(activeSeed.value)
  handleResize()

  const canvas = canvasRef.value
  const container = canvas?.parentElement
  if (!container) return

  canvas.addEventListener('wheel', handleWheel, { passive: false })
  canvas.addEventListener('pointerdown', handlePointerDown)
  canvas.addEventListener('pointermove', handlePointerMove)
  canvas.addEventListener('pointerup', stopDragging)
  canvas.addEventListener('pointercancel', stopDragging)
  canvas.addEventListener('lostpointercapture', stopDragging)

  if (typeof ResizeObserver === 'undefined') {
    window.addEventListener('resize', handleResize)
    removeWindowResizeListener = () => window.removeEventListener('resize', handleResize)
    return
  }

  resizeObserver = new ResizeObserver(handleResize)
  resizeObserver.observe(container)
})

onBeforeUnmount(() => {
  const canvas = canvasRef.value
  canvas?.removeEventListener('wheel', handleWheel)
  canvas?.removeEventListener('pointerdown', handlePointerDown)
  canvas?.removeEventListener('pointermove', handlePointerMove)
  canvas?.removeEventListener('pointerup', stopDragging)
  canvas?.removeEventListener('pointercancel', stopDragging)
  canvas?.removeEventListener('lostpointercapture', stopDragging)
  resizeObserver?.disconnect()
  resizeObserver = null
  removeWindowResizeListener?.()
  removeWindowResizeListener = null
  if (renderFrameId) {
    window.cancelAnimationFrame(renderFrameId)
    renderFrameId = 0
  }
  stopGrowthAnimation()
})
</script>

<template>
  <section class="grid-view" :aria-label="`${GRID_SIZE} 乘 ${GRID_SIZE} 二维点阵，共 ${POINT_COUNT} 个点`">
    <canvas
      ref="canvasRef"
      class="grid-canvas"
      aria-hidden="true"
    ></canvas>

    <!-- 控制面板复用共享浮层，GridView 只负责响应用户意图并重新生成网络。 -->
    <GridControlPanel
      v-model:seed="seedInput"
      v-model:animation-speed="animationSpeed"
      :seed-digits="SEED_DIGITS"
      :is-seed-frozen="isSeedFrozen"
      @toggle-freeze="isSeedFrozen = !isSeedFrozen"
      @apply-seed="applySeedFromInput"
      @replay="replayNetwork"
      @reset="resetNetwork"
    />
  </section>
</template>

<style scoped>
.grid-view {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 82% 12%, rgba(125, 211, 252, 0.24) 0%, rgba(14, 165, 233, 0.12) 24%, rgba(2, 6, 23, 0) 48%),
    linear-gradient(135deg, #020617 0%, #111827 52%, #09090b 100%);
}

.grid-canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.grid-canvas:active {
  cursor: grabbing;
}
</style>
