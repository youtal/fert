/**
 * composables/grid/useGridGrowthAnimation.ts
 *
 * GridView 的折线生长动画控制器。
 * 该 composable 推进“当前检测到哪个滑窗、哪些点对正在被探测、补偿线段显示到哪里”。
 */
import type { Ref } from 'vue'
import type { DetectionStep, GridSegment, GridWindow } from '@/utils/gridNetwork'

export type GridGrowthState = {
  animatedSegmentCount: number
  activeDetectionStepIndex: number
  activeWindow: GridWindow | null
  activeProbeSegments: GridSegment[]
}

type UseGridGrowthAnimationOptions = {
  animationSpeed: Ref<number>
  state: GridGrowthState
  getBaseSegmentCount: () => number
  getNetworkSegmentCount: () => number
  getDetectionSteps: () => DetectionStep[]
  scheduleDraw: () => void
}

export const useGridGrowthAnimation = ({
  animationSpeed,
  state,
  getBaseSegmentCount,
  getNetworkSegmentCount,
  getDetectionSteps,
  scheduleDraw,
}: UseGridGrowthAnimationOptions) => {
  let growthFrameId = 0

  const stopGrowthAnimation = () => {
    if (!growthFrameId) return
    window.cancelAnimationFrame(growthFrameId)
    growthFrameId = 0
  }

  const startGrowthAnimation = () => {
    stopGrowthAnimation()

    state.animatedSegmentCount = 0
    state.activeWindow = null
    state.activeProbeSegments = []
    state.activeDetectionStepIndex = 0

    const grow = () => {
      const baseSegmentCount = getBaseSegmentCount()

      if (state.animatedSegmentCount < baseSegmentCount) {
        state.animatedSegmentCount = Math.min(state.animatedSegmentCount + animationSpeed.value, baseSegmentCount)
        state.activeWindow = null
        state.activeProbeSegments = []
        scheduleDraw()
        growthFrameId = window.requestAnimationFrame(grow)
        return
      }

      const activeStep = getDetectionSteps()[state.activeDetectionStepIndex]
      if (!activeStep) {
        state.activeWindow = null
        state.activeProbeSegments = []
        scheduleDraw()
        growthFrameId = 0
        return
      }

      state.activeWindow = activeStep.window
      state.activeProbeSegments = activeStep.probes.map((probe) => ({
        from: probe.from,
        to: probe.to,
        color: probe.compensated ? '#fbbf24' : '#94a3b8',
      }))
      state.animatedSegmentCount = Math.min(
        state.animatedSegmentCount + activeStep.segments.length,
        getNetworkSegmentCount(),
      )
      state.activeDetectionStepIndex += 1
      scheduleDraw()

      growthFrameId = window.requestAnimationFrame(grow)
    }

    growthFrameId = window.requestAnimationFrame(grow)
  }

  return {
    startGrowthAnimation,
    stopGrowthAnimation,
  }
}
