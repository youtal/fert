/**
 * useGridGrowthAnimation 测试。
 *
 * 验证 Grid 动画按检测步骤推进：当前高亮窗口、探测点对和补偿线段数量
 * 都来自同一个 DetectionStep，避免演示与真实检测过程脱节。
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useGridGrowthAnimation, type GridGrowthState } from '../useGridGrowthAnimation'
import type { DetectionStep } from '@/utils/gridNetwork'

describe('useGridGrowthAnimation', () => {
  let queuedFrames: FrameRequestCallback[]

  beforeEach(() => {
    queuedFrames = []
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      queuedFrames.push(callback)
      return queuedFrames.length
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const flushFrame = () => {
    const callback = queuedFrames.shift()
    callback?.(0)
  }

  it('应该按检测步骤同步窗口、探测线和补偿线段', () => {
    const state: GridGrowthState = {
      animatedSegmentCount: 0,
      activeDetectionStepIndex: 0,
      activeWindow: null,
      activeProbeSegments: [],
    }
    const detectionSteps: DetectionStep[] = [
      {
        window: { top: 0, left: 0 },
        probes: [
          { from: 0, to: 9, distance: 9, distanceLimit: 15, networkDistance: 20, compensated: true },
          { from: 10, to: 19, distance: 9, distanceLimit: 15, networkDistance: 12, compensated: false },
        ],
        segments: [
          { from: 0, to: 1, color: '#fbbf24' },
          { from: 1, to: 2, color: '#fbbf24' },
        ],
      },
      {
        window: { top: 0, left: 9 },
        probes: [
          { from: 9, to: 18, distance: 9, distanceLimit: 15, networkDistance: 16, compensated: true },
        ],
        segments: [
          { from: 9, to: 10, color: '#fbbf24' },
        ],
      },
    ]
    const scheduleDraw = vi.fn()

    const { startGrowthAnimation } = useGridGrowthAnimation({
      animationSpeed: ref(5),
      state,
      getBaseSegmentCount: () => 5,
      getNetworkSegmentCount: () => 8,
      getDetectionSteps: () => detectionSteps,
      scheduleDraw,
    })

    startGrowthAnimation()
    flushFrame()
    expect(state.animatedSegmentCount).toBe(5)
    expect(state.activeWindow).toBeNull()

    flushFrame()
    expect(state.activeWindow).toEqual({ top: 0, left: 0 })
    expect(state.activeProbeSegments).toEqual([
      { from: 0, to: 9, color: '#fbbf24' },
      { from: 10, to: 19, color: '#94a3b8' },
    ])
    expect(state.animatedSegmentCount).toBe(7)

    flushFrame()
    expect(state.activeWindow).toEqual({ top: 0, left: 9 })
    expect(state.activeProbeSegments).toEqual([
      { from: 9, to: 18, color: '#fbbf24' },
    ])
    expect(state.animatedSegmentCount).toBe(8)

    flushFrame()
    expect(state.activeWindow).toBeNull()
    expect(state.activeProbeSegments).toEqual([])
    expect(scheduleDraw).toHaveBeenCalledTimes(4)
  })
})
