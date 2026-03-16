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

  const getAudioContext = () => {
    if (audioContext || isClosed || typeof window === 'undefined') return audioContext

    const audioWindow = window as AudioWindow
    const AudioContextCtor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext
    if (!AudioContextCtor) return null

    audioContext = new AudioContextCtor()
    return audioContext
  }

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

  const playPattern = async (pattern: number[]) => {
    for (const [index, frequency] of pattern.entries()) {
      await playStep(frequency)
      if (index < pattern.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 80))
      }
    }
  }

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
