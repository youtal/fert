/**
 * composables/grid/useGridViewport.ts
 *
 * GridView 的视口交互控制器。
 * 统一管理滚轮缩放、鼠标拖拽和平移原点，让视图文件不直接持有指针状态机。
 */
import type { Ref } from 'vue'
import { GRID_MAX_ZOOM, GRID_MIN_ZOOM, clamp } from '@/utils/gridCanvas'

export type GridViewportState = {
  viewportWidth: number
  viewportHeight: number
  zoom: number
  originX: number
  originY: number
}

type UseGridViewportOptions = {
  canvasRef: Ref<HTMLCanvasElement | null>
  viewport: GridViewportState
  scheduleDraw: () => void
}

export const useGridViewport = ({ canvasRef, viewport, scheduleDraw }: UseGridViewportOptions) => {
  let isDragging = false
  let lastPointerX = 0
  let lastPointerY = 0

  /**
   * 滚轮缩放以鼠标所在位置为锚点，避免观察局部点阵时视野突然跳走。
   */
  const handleWheel = (event: WheelEvent) => {
    event.preventDefault()

    const previousZoom = viewport.zoom
    const nextZoom = clamp(previousZoom * Math.exp(-event.deltaY * 0.0015), GRID_MIN_ZOOM, GRID_MAX_ZOOM)
    if (nextZoom === previousZoom) return

    const rect = canvasRef.value?.getBoundingClientRect()
    const pointerX = event.clientX - (rect?.left ?? 0)
    const pointerY = event.clientY - (rect?.top ?? 0)
    const centerX = viewport.viewportWidth / 2
    const centerY = viewport.viewportHeight / 2
    const zoomRatio = nextZoom / previousZoom

    viewport.originX = pointerX - centerX - (pointerX - centerX - viewport.originX) * zoomRatio
    viewport.originY = pointerY - centerY - (pointerY - centerY - viewport.originY) * zoomRatio
    viewport.zoom = nextZoom

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

    viewport.originX += event.clientX - lastPointerX
    viewport.originY += event.clientY - lastPointerY
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

  return {
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    stopDragging,
  }
}
