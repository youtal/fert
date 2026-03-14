/**
 * composables/useSudoku.ts
 * 
 * 数独功能核心控制器 (已还原至稳定版本)。
 */
import { ref, reactive, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue'
import { Sudoku, type SudokuGrid } from '@/utils/sudoku'

/**
 * 自动解算提示音的频率上下界。
 * 选在这个区间是为了让手机与桌面扬声器都能稳定发声，同时避免高频刺耳。
 */
const SOLVE_AUDIO_MIN_FREQUENCY = 240
const SOLVE_AUDIO_MAX_FREQUENCY = 1080

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

/**
 * 统计当前棋盘剩余空位。
 * 音效与“解题进度”绑定，而不是与步数绑定，这样回溯时也能反映盘面整体收敛程度。
 */
const countEmptyCells = (grid: SudokuGrid) => grid.reduce(
  (count, row) => count + row.filter((cell) => cell === 0).length,
  0,
)

const createSolveAudioController = () => {
  let audioContext: AudioContextLike | null = null
  let isClosed = false

  /**
   * 惰性获取音频上下文。
   * 只有用户真的触发自动解算时才初始化，避免页面初次加载就占用音频资源。
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
   * 播放单次短音。
   * 包络使用快速起音 + 快速衰减，避免连续步进时尾音堆叠得过于明显。
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
   * 在组件最终卸载时释放音频上下文。
   * KeepAlive 切换不调用此逻辑，避免返回页面后频繁重建上下文。
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
    stop,
  }
}

export function useSudoku() {
  const grid = ref<SudokuGrid>(Sudoku.createEmptyGrid())
  const solutionSnapshot = ref<SudokuGrid | null>(null) 
  
  // solveType: 0=题目(白), 1=解算结果(绿), 2=回溯中(黄), 3=用户正确(绿), 4=用户错误(红)
  const solveType = ref<number[][]>(Array.from({ length: 9 }, () => Array(9).fill(0)))
  const lockMask = ref<boolean[][]>(Array.from({ length: 9 }, () => Array(9).fill(false)))
  const selectedCell = reactive({ row: -1, col: -1 })
  
  const isSettingUp = ref(false) 
  const difficulty = ref(40)
  const isSolving = ref(false)
  const isValidating = ref(false)
  const validationStep = ref(-1)
  const isSuccess = ref(true)
  const solveSpeed = ref(50)
  let solveRunId = 0
  const solveAudio = createSolveAudioController()

  const setCell = (row: number, col: number, value: number) => {
    const rowValues = grid.value[row]
    if (!rowValues) return
    rowValues[col] = value
  }
  const setSolveType = (row: number, col: number, value: number) => {
    const rowValues = solveType.value[row]
    if (!rowValues) return
    rowValues[col] = value
  }
  const getLock = (row: number, col: number) => lockMask.value[row]?.[col] ?? false

  /**
   * 动画步进钩子是自动解算与 UI 同步的唯一出口。
   * 所有“格子值变化 + 颜色标记 + 选中态 + 音效”都从这里收口，便于保持一致性。
   */
  const animationStepHook = async (runId: number, r: number, c: number, v: number, type: 'logic' | 'backtrack') => {
    if (runId !== solveRunId) return
    if (solveSpeed.value > 0) {
      setCell(r, c, v)
      setSolveType(r, c, v === 0 ? 0 : (type === 'logic' ? 1 : 2))
      if (v !== 0) {
        void solveAudio.playStep(getSolveStepFrequency(countEmptyCells(grid.value)))
      }
      selectedCell.row = r; selectedCell.col = c
      await new Promise(resolve => setTimeout(resolve, solveSpeed.value))
    }
  }

  /**
   * 解算成功后的全盘校验动画。
   * 这里复用 `validationStep` 驱动行/列/宫扫描高亮，而不额外维护另一套动画状态机。
   */
  const runValidationAnimation = async (runId: number) => {
    if (runId !== solveRunId) return
    isSuccess.value = Sudoku.validateFullGrid(grid.value)
    isValidating.value = true
    selectedCell.row = -1; selectedCell.col = -1
    for (let i = 0; i < 9; i++) {
      if (runId !== solveRunId) return
      validationStep.value = i
      await new Promise(resolve => setTimeout(resolve, 150))
    }
    await new Promise(resolve => setTimeout(resolve, 300))
    if (runId !== solveRunId) return
    if (!isSuccess.value) {
      alert('验证失败：盘面存在冲突或未填满！')
    } else {
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (solveType.value[r]?.[c] === 2) setSolveType(r, c, 1)
        }
      }
    }
    validationStep.value = -1
    isValidating.value = false
  }

  /**
   * 自动解算入口。
   * 执行顺序固定为：输入前置校验 -> 掩码初始化 -> 逻辑推理 -> 回溯搜索 -> 结果校验。
   */
  const solveWithAnimation = async () => {
    if (isSolving.value || isValidating.value) return
    if (isSettingUp.value) {
      alert('请先点击“确认题目”后再进行自动解算。')
      return
    }
    const maskState = Sudoku.initializeMasks(grid.value)
    if (!maskState) {
      alert('该布局无解！')
      return
    }
    isSolving.value = true
    const runId = ++solveRunId
    const { rows, cols, blocks } = maskState
    await Sudoku.propagateConstraints(grid.value, rows, cols, blocks, (r, c, v, type) => animationStepHook(runId, r, c, v, type))
    const success = await Sudoku.backtrackWithMasks(grid.value, rows, cols, blocks, (r, c, v, type) => animationStepHook(runId, r, c, v, type))
    if (runId !== solveRunId) return
    isSolving.value = false
    selectedCell.row = -1; selectedCell.col = -1
    if (success) await runValidationAnimation(runId)
    else alert('该布局无解！')
  }

  /**
   * 处理用户对当前选中格子的输入。
   * 在“自定义题目模式”和“正式作答模式”下，合法性规则不同，因此在这里显式分支。
   */
  const fillNumber = (num: number) => {
    if (isSolving.value || isValidating.value || selectedCell.row === -1) return
    const r = selectedCell.row, c = selectedCell.col
    if (isSettingUp.value) {
      if (num === 0) { setCell(r, c, 0); return }
      if (!Sudoku.isValid(grid.value, r, c, num)) {
        alert(`题目冲突：在当前位置填入 ${num} 会导致题目本身不合法！`)
        return
      }
      setCell(r, c, num); return
    }
    if (getLock(r, c)) return 
    setCell(r, c, num)
    if (solutionSnapshot.value) {
      const correctVal = solutionSnapshot.value[r]?.[c]
      setSolveType(r, c, num === 0 ? 0 : (num === correctVal ? 3 : 4))
    }
  }

  /**
   * 确认用户自定义题目。
   * 只有在题面合法且唯一解成立时才退出设置模式，并同步生成 `solutionSnapshot`。
   */
  const confirmCustomPuzzle = () => {
    if (!Sudoku.validateInitialGrid(grid.value)) {
      alert('题目校验失败：该布局存在冲突！')
      return
    }
    const solCount = Sudoku.countSolutions(grid.value)
    if (solCount === 0) alert('题目校验失败：该布局无解！')
    else if (solCount > 1) alert('题目校验失败：该布局存在多个解！')
    else {
      const tempGrid = grid.value.map(r => [...r])
      if (!Sudoku.solve(tempGrid)) {
        alert('题目校验失败：该布局无解！')
        return
      }
      solutionSnapshot.value = tempGrid.map((row) => [...row])
      lockMask.value = grid.value.map(r => r.map(cell => cell !== 0))
      solveType.value = grid.value.map(r => r.map(() => 0))
      isSettingUp.value = false
      alert('题目确认成功！')
    }
  }

  /**
   * 生成随机题目并重置所有与上一局相关的可视状态。
   */
  const generateNewPuzzle = () => {
    solveRunId++
    isSolving.value = false
    isValidating.value = false
    validationStep.value = -1
    isSettingUp.value = false
    const { puzzle, solution } = Sudoku.generatePuzzle(difficulty.value)
    grid.value = puzzle
    solutionSnapshot.value = solution.map((row) => [...row])
    lockMask.value = puzzle.map(r => r.map(cell => cell !== 0))
    solveType.value = Array.from({ length: 9 }, () => Array(9).fill(0))
    selectedCell.row = -1; selectedCell.col = -1
  }

  /**
   * 清空棋盘并进入自定义题目模式。
   */
  const clearAll = () => {
    solveRunId++
    isSolving.value = false
    isValidating.value = false
    validationStep.value = -1
    grid.value = Sudoku.createEmptyGrid(); solutionSnapshot.value = null
    lockMask.value = Array.from({ length: 9 }, () => Array(9).fill(false))
    solveType.value = Array.from({ length: 9 }, () => Array(9).fill(0))
    isSettingUp.value = true 
    selectedCell.row = -1; selectedCell.col = -1
  }

  /**
   * 键盘输入只在视图激活期间监听，避免切到其它页面时仍然误写数独。
   */
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key >= '1' && e.key <= '9') fillNumber(parseInt(e.key))
    else if (e.key === 'Backspace' || e.key === '0') fillNumber(0)
  }

  onMounted(() => {
    generateNewPuzzle()
  })

  onActivated(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onDeactivated(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
    solveAudio.stop()
  })

  return {
    grid, solveType, lockMask, selectedCell, isSettingUp,
    difficulty, isSolving, isValidating, validationStep, isSuccess, solveSpeed,
    selectCell: (r: number, c: number) => { if(!isSolving.value && !isValidating.value) { selectedCell.row = r; selectedCell.col = c } },
    fillNumber, generateNewPuzzle, clearAll, solveWithAnimation, confirmCustomPuzzle
  }
}
