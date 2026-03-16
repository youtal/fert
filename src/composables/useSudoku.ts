/**
 * composables/useSudoku.ts
 *
 * 数独功能核心控制器。
 * 当前版本保留题目流转、棋盘状态、解算流程与生命周期监听，
 * 音频与全局通知等外围能力已拆到独立模块，降低文件职责密度。
 */
import { ref, reactive, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue'
import { Sudoku, type SudokuGrid } from '@/utils/sudoku'
import { pushNotification } from '@/composables/useAppNotifications'
import {
  createSolveAudioController,
  getSolveCompletePattern,
  getSolveStepFrequency,
  getValidationSuccessPattern,
} from '@/composables/sudoku/useSudokuAudio'

/**
 * 统计当前棋盘剩余空位。
 * 音效与“解题进度”绑定，而不是与步数绑定，这样回溯时也能反映盘面整体收敛程度。
 */
const countEmptyCells = (grid: SudokuGrid) => grid.reduce(
  (count, row) => count + row.filter((cell) => cell === 0).length,
  0,
)

export { getSolveCompletePattern, getSolveStepFrequency, getValidationSuccessPattern }

/**
 * 数独模块总控制器。
 * 它统一收口题目生成、用户输入、自动解算、校验动画与生命周期监听，
 * 让视图层只负责组装组件，不直接操心求解细节。
 */
export function useSudoku() {
  const grid = ref<SudokuGrid>(Sudoku.createEmptyGrid())
  const solutionSnapshot = ref<SudokuGrid | null>(null) 
  
  // solveType: 0=题目(白), 1=解算结果(绿), 2=回溯中(黄), 3=用户正确(绿), 4=用户错误(红)
  const solveType = ref<number[][]>(Array.from({ length: 9 }, () => Array(9).fill(0)))
  const lockMask = ref<boolean[][]>(Array.from({ length: 9 }, () => Array(9).fill(false)))
  const selectedCell = reactive({ row: -1, col: -1 })
  
  const isSettingUp = ref(false) 
  const difficulty = ref(55)
  const isSolving = ref(false)
  const isValidating = ref(false)
  const validationStep = ref(-1)
  const isSuccess = ref(true)
  const solveSpeed = ref(50)
  let solveRunId = 0
  const solveAudio = createSolveAudioController()

  /**
   * 原地更新棋盘单元格。
   * 单独封装后，动画步进和用户输入都复用同一写入口。
   */
  const setCell = (row: number, col: number, value: number) => {
    const rowValues = grid.value[row]
    if (!rowValues) return
    rowValues[col] = value
  }

  /**
   * 写入当前格子的视觉语义类型。
   * 颜色与高亮表现都依赖这份矩阵，而不是从棋盘值反推。
   */
  const setSolveType = (row: number, col: number, value: number) => {
    const rowValues = solveType.value[row]
    if (!rowValues) return
    rowValues[col] = value
  }

  /**
   * 读取给定格子是否为题面锁定格。
   * 对外隐藏 `lockMask` 的可选链细节，让调用点保持干净。
   */
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
      pushNotification('error', '验证失败：盘面存在冲突或未填满！')
    } else {
      void solveAudio.playPattern(getValidationSuccessPattern())
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
      pushNotification('info', '请先点击“确认题目”后再进行自动解算。')
      return
    }
    const maskState = Sudoku.initializeMasks(grid.value)
    if (!maskState) {
      pushNotification('error', '该布局无解！')
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
    if (success) {
      void solveAudio.playPattern(getSolveCompletePattern())
      await runValidationAnimation(runId)
    }
    else pushNotification('error', '该布局无解！')
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
        pushNotification('error', `题目冲突：在当前位置填入 ${num} 会导致题目本身不合法！`)
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
      pushNotification('error', '题目校验失败：该布局存在冲突！')
      return
    }
    const solCount = Sudoku.countSolutions(grid.value)
    if (solCount === 0) pushNotification('error', '题目校验失败：该布局无解！')
    else if (solCount > 1) pushNotification('error', '题目校验失败：该布局存在多个解！')
    else {
      const tempGrid = grid.value.map(r => [...r])
      if (!Sudoku.solve(tempGrid)) {
        pushNotification('error', '题目校验失败：该布局无解！')
        return
      }
      solutionSnapshot.value = tempGrid.map((row) => [...row])
      lockMask.value = grid.value.map(r => r.map(cell => cell !== 0))
      solveType.value = grid.value.map(r => r.map(() => 0))
      isSettingUp.value = false
      pushNotification('success', '题目确认成功！')
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

  /**
   * 视图层只消费这些状态和命令。
   * `selectCell` 保持内联，是为了把“解算/校验期间禁止切换选中格”这条约束封在导出边界上。
   */
  return {
    grid, solveType, lockMask, selectedCell, isSettingUp,
    difficulty, isSolving, isValidating, validationStep, isSuccess, solveSpeed,
    selectCell: (r: number, c: number) => { if(!isSolving.value && !isValidating.value) { selectedCell.row = r; selectedCell.col = c } },
    fillNumber, generateNewPuzzle, clearAll, solveWithAnimation, confirmCustomPuzzle
  }
}
