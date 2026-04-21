<script setup lang="ts">
/**
 * GridView.vue
 *
 * 点阵视图负责呈现固定规模的二维点阵。
 * 这里使用 Canvas 承载 150 * 150 个点，并通过滚轮缩放观察局部结构。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'

const GRID_SIZE = 150
const POINT_COUNT = GRID_SIZE * GRID_SIZE
const MIN_ZOOM = 0.12
const MAX_ZOOM = 12
const BASE_RADIUS = 6
const BASE_GAP = BASE_RADIUS * 5
const LOOP_EDGE_RATIO = 0.08
const DEFAULT_ANIMATION_SPEED = 140
const MAX_SEED = 0xffff

type GridDirection = {
  row: number
  col: number
}

type GridSegment = {
  from: number
  to: number
  color: string
}

type SeededRandom = () => number

const canvasRef = ref<HTMLCanvasElement | null>(null)
const seedInput = ref('')
const activeSeed = ref(0)
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

const directions: GridDirection[] = [
  { row: -1, col: 0 },
  { row: 0, col: 1 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
]

const pathColors = [
  '#22d3ee',
  '#a78bfa',
  '#34d399',
  '#fbbf24',
  '#fb7185',
  '#60a5fa',
  '#f472b6',
  '#2dd4bf',
]
const DEFAULT_PATH_COLOR = pathColors[0] ?? '#22d3ee'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const createRandomSeed = () => Math.floor(Math.random() * (MAX_SEED + 1))

const formatSeed = (seed: number) => String(seed).padStart(5, '0')

const normalizeSeed = (value: string) => {
  const seed = Number.parseInt(value, 10)
  if (!Number.isFinite(seed)) return activeSeed.value

  return Math.round(clamp(seed, 0, MAX_SEED))
}

const syncSeedInput = (seed: number) => {
  activeSeed.value = seed
  seedInput.value = formatSeed(seed)
}

/**
 * 16 位 seed 经 SplitMix 风格扩散后进入 Mulberry32。
 * 同一 seed 会产生完全一致的随机序列，从而得到完全一致的折线方案。
 */
const createSeededRandom = (seed: number): SeededRandom => {
  let state = (seed + 0x9e3779b9) >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let mixed = state
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

const scheduleDraw = () => {
  if (renderFrameId) return
  renderFrameId = window.requestAnimationFrame(() => {
    renderFrameId = 0
    drawGrid()
  })
}

const getPointRow = (index: number) => Math.floor(index / GRID_SIZE)

const getPointCol = (index: number) => index % GRID_SIZE

const getPointIndex = (row: number, col: number) => row * GRID_SIZE + col

const getEdgeKey = (from: number, to: number) => from < to ? `${from}:${to}` : `${to}:${from}`

const getRandomInt = (max: number, random: SeededRandom) => Math.floor(random() * max)

const getNormalPathLength = (random: SeededRandom) => {
  const u = Math.max(random(), Number.EPSILON)
  const v = Math.max(random(), Number.EPSILON)
  const standardNormal = Math.sqrt(-2 * Math.log(u)) * Math.cos(Math.PI * 2 * v)

  return Math.round(clamp(72 + standardNormal * 28, 18, 160))
}

const getRandomUnvisitedPoint = (visited: Uint8Array, random: SeededRandom) => {
  for (let attempt = 0; attempt < 96; attempt += 1) {
    const candidate = getRandomInt(POINT_COUNT, random)
    if (!visited[candidate]) return candidate
  }

  for (let index = 0; index < POINT_COUNT; index += 1) {
    if (!visited[index]) return index
  }

  return -1
}

const getWeightedDirection = (current: number, previousDirection: GridDirection | null, covered: Uint8Array, random: SeededRandom) => {
  const row = getPointRow(current)
  const col = getPointCol(current)
  const candidates = directions
    .filter((direction) => {
      if (previousDirection && direction.row === -previousDirection.row && direction.col === -previousDirection.col) {
        return false
      }

      const nextRow = row + direction.row
      const nextCol = col + direction.col
      return nextRow >= 0 && nextRow < GRID_SIZE && nextCol >= 0 && nextCol < GRID_SIZE
    })
    .map((direction) => {
      const next = getPointIndex(row + direction.row, col + direction.col)
      const straightBias = previousDirection && direction.row === previousDirection.row && direction.col === previousDirection.col ? 2.2 : 1
      const unvisitedBias = covered[next] ? 0.75 : 1.4

      return {
        direction,
        next,
        weight: straightBias * unvisitedBias,
      }
  })

  const totalWeight = candidates.reduce((sum, candidate) => sum + candidate.weight, 0)
  let cursor = random() * totalWeight

  for (const candidate of candidates) {
    cursor -= candidate.weight
    if (cursor <= 0) return candidate
  }

  return candidates[candidates.length - 1] ?? null
}

const findNearbyConnectedPoint = (from: number, connectedPoints: number[], random: SeededRandom) => {
  let bestPoint = connectedPoints[getRandomInt(connectedPoints.length, random)] ?? 0
  let bestDistance = Number.POSITIVE_INFINITY
  const fromRow = getPointRow(from)
  const fromCol = getPointCol(from)
  const sampleCount = Math.min(80, connectedPoints.length)

  for (let index = 0; index < sampleCount; index += 1) {
    const candidate = connectedPoints[getRandomInt(connectedPoints.length, random)] ?? bestPoint
    const distance = Math.abs(fromRow - getPointRow(candidate)) + Math.abs(fromCol - getPointCol(candidate))
    if (distance < bestDistance) {
      bestPoint = candidate
      bestDistance = distance
    }
  }

  return bestPoint
}

const createConnectionPath = (from: number, to: number, random: SeededRandom) => {
  const path: number[] = []
  let row = getPointRow(from)
  let col = getPointCol(from)
  const targetRow = getPointRow(to)
  const targetCol = getPointCol(to)
  const firstAxis = random() < 0.5 ? 'row' : 'col'

  const walkRows = () => {
    while (row !== targetRow) {
      row += row < targetRow ? 1 : -1
      path.push(getPointIndex(row, col))
    }
  }

  const walkCols = () => {
    while (col !== targetCol) {
      col += col < targetCol ? 1 : -1
      path.push(getPointIndex(row, col))
    }
  }

  if (firstAxis === 'row') {
    walkRows()
    walkCols()
  } else {
    walkCols()
    walkRows()
  }

  return path
}

const generateNetworkSegments = (seed: number) => {
  const random = createSeededRandom(seed)
  const covered = new Uint8Array(POINT_COUNT)
  const connectedPoints: number[] = []
  const edgeKeys = new Set<string>()
  const segments: GridSegment[] = []
  let connectedCount = 0
  let pathIndex = 0

  const markCovered = (point: number) => {
    if (covered[point]) return

    covered[point] = 1
    connectedPoints.push(point)
    connectedCount += 1
  }

  const addSegment = (from: number, to: number, color: string) => {
    if (from === to) return false

    const edgeKey = getEdgeKey(from, to)
    if (edgeKeys.has(edgeKey)) return false

    edgeKeys.add(edgeKey)
    segments.push({ from, to, color })
    return true
  }

  markCovered(getRandomInt(POINT_COUNT, random))

  while (connectedCount < POINT_COUNT) {
    const start = getRandomUnvisitedPoint(covered, random)
    if (start < 0) break

    const color = pathColors[pathIndex % pathColors.length] ?? DEFAULT_PATH_COLOR
    const maxLength = getNormalPathLength(random)
    let current = start
    let previousDirection: GridDirection | null = null
    let hasReachedNetwork = false
    const pathPoints = [current]
    const localPoints = new Set<number>(pathPoints)

    const pushLocalPoint = (point: number) => {
      if (localPoints.has(point)) return

      localPoints.add(point)
      pathPoints.push(point)
    }

    for (let step = 0; step < maxLength; step += 1) {
      const candidate = getWeightedDirection(current, previousDirection, covered, random)
      if (!candidate) break

      addSegment(current, candidate.next, color)
      current = candidate.next
      previousDirection = candidate.direction

      if (covered[current]) {
        hasReachedNetwork = true
        break
      }

      pushLocalPoint(current)
    }

    if (!hasReachedNetwork && connectedPoints.length > 1) {
      const target = findNearbyConnectedPoint(current, connectedPoints, random)
      const connectionPath = createConnectionPath(current, target, random)

      for (const next of connectionPath) {
        addSegment(current, next, color)
        current = next

        if (!covered[next]) {
          pushLocalPoint(next)
        }

        if (next === target) break
      }
    }

    for (const point of pathPoints) {
      markCovered(point)
    }

    pathIndex += 1
  }

  const loopTarget = Math.floor(POINT_COUNT * LOOP_EDGE_RATIO)
  let loopEdges = 0
  let attempts = 0

  while (loopEdges < loopTarget && attempts < loopTarget * 28) {
    attempts += 1

    const from = getRandomInt(POINT_COUNT, random)
    const row = getPointRow(from)
    const col = getPointCol(from)
    const validDirections = directions.filter((direction) => {
      const nextRow = row + direction.row
      const nextCol = col + direction.col
      return nextRow >= 0 && nextRow < GRID_SIZE && nextCol >= 0 && nextCol < GRID_SIZE
    })
    const direction = validDirections[getRandomInt(validDirections.length, random)]
    if (!direction) continue

    const to = getPointIndex(row + direction.row, col + direction.col)
    const color = pathColors[(pathIndex + loopEdges) % pathColors.length] ?? DEFAULT_PATH_COLOR

    if (addSegment(from, to, color)) {
      loopEdges += 1
    }
  }

  return segments
}

const startGrowthAnimation = () => {
  if (growthFrameId) {
    window.cancelAnimationFrame(growthFrameId)
  }

  animatedSegmentCount = 0

  const grow = () => {
    animatedSegmentCount = Math.min(animatedSegmentCount + animationSpeed.value, networkSegments.length)
    scheduleDraw()

    if (animatedSegmentCount < networkSegments.length) {
      growthFrameId = window.requestAnimationFrame(grow)
      return
    }

    growthFrameId = 0
  }

  growthFrameId = window.requestAnimationFrame(grow)
}

const regenerateNetwork = (seed: number) => {
  networkSegments = generateNetworkSegments(seed)
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

    <aside class="control-card" @pointerdown.stop @wheel.stop>
      <div class="control-header">
        <div>
          <p class="control-kicker">Seed Control</p>
          <h1>折线生长</h1>
        </div>
        <button
          type="button"
          class="icon-button"
          :class="{ active: isSeedFrozen }"
          :aria-label="isSeedFrozen ? '解除种子冻结' : '冻结种子'"
          :title="isSeedFrozen ? '解除种子冻结' : '冻结种子'"
          @click="isSeedFrozen = !isSeedFrozen"
        >
          {{ isSeedFrozen ? '◆' : '◇' }}
        </button>
      </div>

      <label class="control-field">
        <span>种子</span>
        <input
          v-model="seedInput"
          type="number"
          min="0"
          :max="MAX_SEED"
          inputmode="numeric"
          @change="replayNetwork"
          @blur="applySeedFromInput"
        />
      </label>

      <label class="control-field">
        <span>速度</span>
        <input
          v-model.number="animationSpeed"
          type="range"
          min="40"
          max="420"
          step="20"
        />
      </label>

      <button type="button" class="reset-button" @click="resetNetwork">
        重置
      </button>
    </aside>
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

.control-card {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  width: 260px;
  padding: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.78);
  box-shadow: 0 18px 48px rgba(2, 6, 23, 0.38);
  backdrop-filter: blur(14px);
  z-index: 20;
}

.control-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.control-kicker {
  color: #2dd4bf;
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-bottom: 0.45rem;
}

.control-card h1 {
  color: #f8fafc;
  font-size: 1.25rem;
  line-height: 1;
}

.icon-button {
  width: 34px;
  height: 34px;
  border: 1px solid rgba(125, 211, 252, 0.18);
  border-radius: 10px;
  background: rgba(2, 6, 23, 0.38);
  color: #94a3b8;
  cursor: pointer;
  transition:
    border-color 0.2s,
    color 0.2s,
    background 0.2s;
}

.icon-button.active {
  border-color: rgba(45, 212, 191, 0.55);
  background: rgba(20, 184, 166, 0.14);
  color: #5eead4;
}

.control-field {
  display: grid;
  gap: 0.45rem;
  margin-bottom: 0.95rem;
}

.control-field span {
  color: #94a3b8;
  font-size: 0.78rem;
}

.control-field input[type='number'] {
  width: 100%;
  height: 38px;
  padding: 0 0.75rem;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 10px;
  background: rgba(2, 6, 23, 0.42);
  color: #e0f2fe;
  font: inherit;
}

.control-field input[type='range'] {
  width: 100%;
  accent-color: #2dd4bf;
}

.reset-button {
  width: 100%;
  height: 40px;
  border: 1px solid rgba(125, 211, 252, 0.22);
  border-radius: 10px;
  background: rgba(14, 165, 233, 0.14);
  color: #e0f2fe;
  font-weight: 700;
  cursor: pointer;
}

.reset-button:hover {
  border-color: rgba(125, 211, 252, 0.45);
  background: rgba(14, 165, 233, 0.22);
}

@media (max-width: 760px) {
  .control-card {
    top: 1rem;
    right: 1rem;
    left: 1rem;
    width: auto;
  }
}
</style>
