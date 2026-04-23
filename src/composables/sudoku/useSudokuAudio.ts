/**
 * composables/sudoku/useSudokuAudio.ts
 *
 * 数独解算音效控制器。
 * 该文件只封装 Web Audio API 的创建、播放和释放：
 * 1. 根据剩余空格数计算普通解算步进音高。
 * 2. 提供解算完成与验证成功的短音阶模式。
 * 3. 在组件或 composable 结束时关闭 AudioContext，避免后台保留音频资源。
 */
const SOLVE_AUDIO_MIN_FREQUENCY = 240
const SOLVE_AUDIO_MAX_FREQUENCY = 1080
const SOLVE_COMPLETE_PATTERN = [880, 1100, 1320]
const VALIDATION_SUCCESS_PATTERN = [740, 988, 1480]

type AudioContextLike = {
  state?: string
  currentTime: number
  destination: AudioDestinationNode
  resume?: () => Promise<void>
  close?: () => Promise<void>
  createOscillator: () => OscillatorNode
  createGain: () => GainNode
}

type AudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: new () => AudioContextLike
}

export const getSolveStepFrequency = (emptyCells: number) => {
  const normalizedEmptyCells = Math.max(0, Math.min(80, emptyCells))
  const progress = (80 - normalizedEmptyCells) / 80
  return SOLVE_AUDIO_MIN_FREQUENCY + (SOLVE_AUDIO_MAX_FREQUENCY - SOLVE_AUDIO_MIN_FREQUENCY) * progress
}

export const getSolveCompletePattern = () => [...SOLVE_COMPLETE_PATTERN]

export const getValidationSuccessPattern = () => [...VALIDATION_SUCCESS_PATTERN]

export const createSolveAudioController = () => {
  let audioContext: AudioContextLike | null = null
  let isClosed = false

  /**
   * 懒创建 AudioContext。
   * 浏览器通常要求用户交互后才能恢复音频上下文，因此这里不在模块初始化时提前创建。
   */
  const getAudioContext = () => {
    if (audioContext || isClosed || typeof window === 'undefined') return audioContext

    const audioWindow = window as AudioWindow
    const AudioContextCtor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext
    if (!AudioContextCtor) return null

    audioContext = new AudioContextCtor()
    return audioContext
  }

  /**
   * 播放单个短促正弦音。
   * gain 使用指数包络，避免点击噪声，同时让每一步解算反馈保持轻量。
   */
  const playStep = async (frequency: number) => {
    const context = getAudioContext()
    if (!context) return

    if (context.state === 'suspended' && context.resume) {
      try {
        await context.resume()
      } catch {
        return
      }
    }

    const oscillator = context.createOscillator()
    const gainNode = context.createGain()
    const startTime = context.currentTime
    const safeFrequency = Math.max(SOLVE_AUDIO_MIN_FREQUENCY, Math.min(SOLVE_AUDIO_MAX_FREQUENCY, frequency))

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(safeFrequency, startTime)

    gainNode.gain.setValueAtTime(0.0001, startTime)
    gainNode.gain.exponentialRampToValueAtTime(0.035, startTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.12)

    oscillator.connect(gainNode)
    gainNode.connect(context.destination)
    oscillator.start(startTime)
    oscillator.stop(startTime + 0.12)
  }

  /**
   * 顺序播放一组音高。
   * 用于“解算完成”和“验证成功”这类比普通步进更明确的状态反馈。
   */
  const playPattern = async (pattern: number[]) => {
    for (const [index, frequency] of pattern.entries()) {
      await playStep(frequency)
      if (index < pattern.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 80))
      }
    }
  }

  /**
   * 关闭音频控制器。
   * 设置 isClosed 后，即便异步回调晚到，也不会重新创建 AudioContext。
   */
  const stop = () => {
    isClosed = true
    if (audioContext?.close) {
      void audioContext.close()
    }
    audioContext = null
  }

  return {
    playStep,
    playPattern,
    stop,
  }
}
