/**
 * composables/grid/useGridGrowthAnimation.ts
 *
 * GridView 的折线生长动画控制器。
 * 该 composable 只推进“当前应该显示多少线段”和“当前高亮哪个滑窗”。
 */
import type { Ref } from 'vue'
import type { CompensationStep, GridWindow } from '@/utils/gridNetwork'

export type GridGrowthState = {
  animatedSegmentCount: number
  activeCompensationStepIndex: number
  activeWindow: GridWindow | null
}

type UseGridGrowthAnimationOptions = {
  animationSpeed: Ref<number>
  state: GridGrowthState
  getBaseSegmentCount: () => number
  getNetworkSegmentCount: () => number
  getCompensationSteps: () => CompensationStep[]
  scheduleDraw: () => void
}

export const useGridGrowthAnimation = ({
  animationSpeed,
  state,
  getBaseSegmentCount,
  getNetworkSegmentCount,
  getCompensationSteps,
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
    state.activeCompensationStepIndex = 0

    const grow = () => {
      const baseSegmentCount = getBaseSegmentCount()

      if (state.animatedSegmentCount < baseSegmentCount) {
        state.animatedSegmentCount = Math.min(state.animatedSegmentCount + animationSpeed.value, baseSegmentCount)
        state.activeWindow = null
        scheduleDraw()
        growthFrameId = window.requestAnimationFrame(grow)
        return
      }

      const activeStep = getCompensationSteps()[state.activeCompensationStepIndex]
      if (!activeStep) {
        state.activeWindow = null
        scheduleDraw()
        growthFrameId = 0
        return
      }

      state.activeWindow = activeStep.window
      state.animatedSegmentCount = Math.min(
        state.animatedSegmentCount + activeStep.segments.length,
        getNetworkSegmentCount(),
      )
      state.activeCompensationStepIndex += 1
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
