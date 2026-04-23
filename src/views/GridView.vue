<script setup lang="ts">
/**
 * GridView.vue
 *
 * 点阵视图负责呈现固定规模的二维点阵。
 * 这里使用 Canvas 承载 150 * 150 个点，并通过滚轮缩放观察局部结构。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import GridControlPanel from '@/components/grid/GridControlPanel.vue'
import {
  GRID_SIZE,
  POINT_COUNT,
  SEED_DIGITS,
  WINDOW_SIZE,
  createRandomSeed,
  formatSeed,
  generateNetworkPlan,
  getPointCol,
  getPointRow,
  normalizeSeed as normalizeGridSeed,
  type CompensationStep,
  type GridSegment,
  type GridWindow,
} from '@/utils/gridNetwork'

const MIN_ZOOM = 0.12
const MAX_ZOOM = 12
const BASE_RADIUS = 6
const BASE_GAP = BASE_RADIUS * 5
const DEFAULT_ANIMATION_SPEED = 140

const canvasRef = ref<HTMLCanvasElement | null>(null)
const seedInput = ref('')
const activeSeed = ref('0')
const isSeedFrozen = ref(false)
const animationSpeed = ref(DEFAULT_ANIMATION_SPEED)
let resizeObserver: ResizeObserver | null = null
let removeWindowResizeListener: (() => void) | null = null
let renderFrameId = 0
let growthFrameId = 0
let viewportWidth = 0
let viewportHeight = 0
let zoom = 1
let originX = 0
let originY = 0
let isDragging = false
let lastPointerX = 0
let lastPointerY = 0
let animatedSegmentCount = 0
let networkSegments: GridSegment[] = []
let baseSegmentCount = 0
let compensationSteps: CompensationStep[] = []
let activeCompensationStepIndex = 0
let activeWindow: GridWindow | null = null

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

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

const startGrowthAnimation = () => {
  if (growthFrameId) {
    window.cancelAnimationFrame(growthFrameId)
  }

  animatedSegmentCount = 0
  activeWindow = null
  activeCompensationStepIndex = 0

  const grow = () => {
    if (animatedSegmentCount < baseSegmentCount) {
      animatedSegmentCount = Math.min(animatedSegmentCount + animationSpeed.value, baseSegmentCount)
      activeWindow = null
      scheduleDraw()
      growthFrameId = window.requestAnimationFrame(grow)
      return
    }

    const activeStep = compensationSteps[activeCompensationStepIndex]
    if (!activeStep) {
      activeWindow = null
      scheduleDraw()
      growthFrameId = 0
      return
    }

    activeWindow = activeStep.window
    animatedSegmentCount = Math.min(animatedSegmentCount + activeStep.segments.length, networkSegments.length)
    activeCompensationStepIndex += 1
    scheduleDraw()

    if (activeCompensationStepIndex < compensationSteps.length) {
      growthFrameId = window.requestAnimationFrame(grow)
      return
    }

    growthFrameId = window.requestAnimationFrame(grow)
  }

  growthFrameId = window.requestAnimationFrame(grow)
}

const regenerateNetwork = (seed: string) => {
  const plan = generateNetworkPlan(seed)
  baseSegmentCount = plan.baseSegments.length
  compensationSteps = plan.compensationSteps
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

  viewportWidth = width
  viewportHeight = height

  const nextWidth = Math.floor(width * pixelRatio)
  const nextHeight = Math.floor(height * pixelRatio)
  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth
    canvas.height = nextHeight
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
  }
}

/**
 * 绘制时只处理可见点，并将圆点合并到同一个路径后统一填充。
 * 这样能显著降低首屏和滚轮缩放期间的 Canvas 指令开销。
 */
const drawGrid = () => {
  const canvas = canvasRef.value
  const context = canvas?.getContext('2d')
  if (!canvas || !context) return

  const pixelRatio = window.devicePixelRatio || 1
  const gap = BASE_GAP * zoom
  const dotRadius = clamp(BASE_RADIUS * zoom, 1.2, 24)

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  context.clearRect(0, 0, viewportWidth, viewportHeight)

  const gradient = context.createRadialGradient(
    viewportWidth * 0.5,
    viewportHeight * 0.45,
    0,
    viewportWidth * 0.5,
    viewportHeight * 0.45,
    Math.max(viewportWidth, viewportHeight) * 0.65,
  )
  gradient.addColorStop(0, 'rgba(14, 165, 233, 0.12)')
  gradient.addColorStop(1, 'rgba(2, 6, 23, 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, viewportWidth, viewportHeight)

  const gridWorldSize = (GRID_SIZE - 1) * BASE_GAP
  const baseX = viewportWidth / 2 + originX - (gridWorldSize * zoom) / 2
  const baseY = viewportHeight / 2 + originY - (gridWorldSize * zoom) / 2
  const lineWidth = clamp(BASE_RADIUS * 0.55 * zoom, 1, 10)

  if (activeWindow) {
    const windowX = baseX + activeWindow.left * gap
    const windowY = baseY + activeWindow.top * gap
    const windowSize = (WINDOW_SIZE - 1) * gap

    context.globalAlpha = 0.16
    context.fillStyle = '#fbbf24'
    context.fillRect(windowX - dotRadius, windowY - dotRadius, windowSize + dotRadius * 2, windowSize + dotRadius * 2)
    context.globalAlpha = 0.72
    context.strokeStyle = '#fde68a'
    context.lineWidth = clamp(BASE_RADIUS * 0.35 * zoom, 1, 5)
    context.strokeRect(windowX - dotRadius, windowY - dotRadius, windowSize + dotRadius * 2, windowSize + dotRadius * 2)
  }

  context.lineWidth = lineWidth
  context.lineCap = 'round'
  context.lineJoin = 'round'

  for (let index = 0; index < animatedSegmentCount; index += 1) {
    const segment = networkSegments[index]
    if (!segment) continue

    const fromX = baseX + getPointCol(segment.from) * gap
    const fromY = baseY + getPointRow(segment.from) * gap
    const toX = baseX + getPointCol(segment.to) * gap
    const toY = baseY + getPointRow(segment.to) * gap

    if (
      Math.max(fromX, toX) < -lineWidth ||
      Math.min(fromX, toX) > viewportWidth + lineWidth ||
      Math.max(fromY, toY) < -lineWidth ||
      Math.min(fromY, toY) > viewportHeight + lineWidth
    ) {
      continue
    }

    context.strokeStyle = segment.color
    context.globalAlpha = 0.72
    context.beginPath()
    context.moveTo(fromX, fromY)
    context.lineTo(toX, toY)
    context.stroke()
  }

  const startCol = clamp(Math.floor((-baseX - dotRadius) / gap), 0, GRID_SIZE - 1)
  const endCol = clamp(Math.ceil((viewportWidth - baseX + dotRadius) / gap), 0, GRID_SIZE - 1)
  const startRow = clamp(Math.floor((-baseY - dotRadius) / gap), 0, GRID_SIZE - 1)
  const endRow = clamp(Math.ceil((viewportHeight - baseY + dotRadius) / gap), 0, GRID_SIZE - 1)

  context.fillStyle = '#7dd3fc'
  context.globalAlpha = 0.9
  context.beginPath()

  for (let row = startRow; row <= endRow; row += 1) {
    const y = baseY + row * gap
    for (let col = startCol; col <= endCol; col += 1) {
      const x = baseX + col * gap
      context.moveTo(x + dotRadius, y)
      context.arc(x, y, dotRadius, 0, Math.PI * 2)
    }
  }

  context.fill()
  context.globalAlpha = 1
}

const handleResize = () => {
  syncCanvasSize()
  scheduleDraw()
}

/**
 * 滚轮缩放以鼠标所在位置为锚点，避免观察局部点阵时视野突然跳走。
 */
const handleWheel = (event: WheelEvent) => {
  event.preventDefault()

  const previousZoom = zoom
  const nextZoom = clamp(previousZoom * Math.exp(-event.deltaY * 0.0015), MIN_ZOOM, MAX_ZOOM)
  if (nextZoom === previousZoom) return

  const rect = canvasRef.value?.getBoundingClientRect()
  const pointerX = event.clientX - (rect?.left ?? 0)
  const pointerY = event.clientY - (rect?.top ?? 0)
  const centerX = viewportWidth / 2
  const centerY = viewportHeight / 2
  const zoomRatio = nextZoom / previousZoom

  originX = pointerX - centerX - (pointerX - centerX - originX) * zoomRatio
  originY = pointerY - centerY - (pointerY - centerY - originY) * zoomRatio
  zoom = nextZoom

  scheduleDraw()
}

const handlePointerDown = (event: PointerEvent) => {
  if (event.button !== 0) return

  isDragging = true
  lastPointerX = event.clientX
  lastPointerY = event.clientY
  canvasRef.value?.setPointerCapture(event.pointerId)
}

const handlePointerMove = (event: PointerEvent) => {
  if (!isDragging) return

  originX += event.clientX - lastPointerX
  originY += event.clientY - lastPointerY
  lastPointerX = event.clientX
  lastPointerY = event.clientY

  scheduleDraw()
}

const stopDragging = (event: PointerEvent) => {
  if (!isDragging) return

  isDragging = false
  const canvas = canvasRef.value
  if (canvas?.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId)
  }
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
  if (growthFrameId) {
    window.cancelAnimationFrame(growthFrameId)
    growthFrameId = 0
  }
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
