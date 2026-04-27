/**
 * gridCanvas.ts
 *
 * GridView 的 Canvas 绘制层。
 * 该文件只负责把网络状态绘制到 2D context，不处理 seed、动画或 DOM 事件。
 */
import {
  GRID_SIZE,
  WINDOW_SIZE,
  getPointCol,
  getPointRow,
  type GridSegment,
  type GridWindow,
} from '@/utils/gridNetwork'

export const GRID_MIN_ZOOM = 0.12
export const GRID_MAX_ZOOM = 12
export const GRID_BASE_RADIUS = 6
export const GRID_BASE_GAP = GRID_BASE_RADIUS * 5

export type GridCanvasState = {
  viewportWidth: number
  viewportHeight: number
  zoom: number
  originX: number
  originY: number
  animatedSegmentCount: number
  networkSegments: GridSegment[]
  activeWindow: GridWindow | null
  activeProbeSegments?: GridSegment[]
  pixelRatio: number
}

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/**
 * 绘制时只处理可见点，并将圆点合并到同一个路径后统一填充。
 * 这样能显著降低首屏和滚轮缩放期间的 Canvas 指令开销。
 */
export const drawGridNetwork = (context: CanvasRenderingContext2D, state: GridCanvasState) => {
  const {
    viewportWidth,
    viewportHeight,
    zoom,
    originX,
    originY,
    animatedSegmentCount,
    networkSegments,
    activeWindow,
    activeProbeSegments = [],
    pixelRatio,
  } = state
  const gap = GRID_BASE_GAP * zoom
  const dotRadius = clamp(GRID_BASE_RADIUS * zoom, 1.2, 24)

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

  const gridWorldSize = (GRID_SIZE - 1) * GRID_BASE_GAP
  const baseX = viewportWidth / 2 + originX - (gridWorldSize * zoom) / 2
  const baseY = viewportHeight / 2 + originY - (gridWorldSize * zoom) / 2
  const lineWidth = clamp(GRID_BASE_RADIUS * 0.55 * zoom, 1, 10)

  if (activeWindow) {
    const windowX = baseX + activeWindow.left * gap
    const windowY = baseY + activeWindow.top * gap
    const windowSize = (WINDOW_SIZE - 1) * gap

    context.globalAlpha = 0.16
    context.fillStyle = '#fbbf24'
    context.fillRect(windowX - dotRadius, windowY - dotRadius, windowSize + dotRadius * 2, windowSize + dotRadius * 2)
    context.globalAlpha = 0.72
    context.strokeStyle = '#fde68a'
    context.lineWidth = clamp(GRID_BASE_RADIUS * 0.35 * zoom, 1, 5)
    context.strokeRect(windowX - dotRadius, windowY - dotRadius, windowSize + dotRadius * 2, windowSize + dotRadius * 2)
  }

  context.lineWidth = lineWidth
  context.lineCap = 'round'
  context.lineJoin = 'round'

  if (activeProbeSegments.length > 0) {
    context.lineWidth = clamp(GRID_BASE_RADIUS * 0.22 * zoom, 1, 4)
    for (const segment of activeProbeSegments) {
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
      context.globalAlpha = 0.38
      context.beginPath()
      context.moveTo(fromX, fromY)
      context.lineTo(toX, toY)
      context.stroke()
    }
    context.lineWidth = lineWidth
  }

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
