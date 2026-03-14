/**
 * composables/useSudoku.ts
 * 
 * 数独功能核心控制器 (已还原至稳定版本)。
 */
import { ref, reactive, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue'
import { Sudoku, type SudokuGrid } from '@/utils/sudoku'

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

  const animationStepHook = async (runId: number, r: number, c: number, v: number, type: 'logic' | 'backtrack') => {
    if (runId !== solveRunId) return
    if (solveSpeed.value > 0) {
      setCell(r, c, v)
      setSolveType(r, c, v === 0 ? 0 : (type === 'logic' ? 1 : 2))
      selectedCell.row = r; selectedCell.col = c
      await new Promise(resolve => setTimeout(resolve, solveSpeed.value))
    }
  }

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
  })

  return {
    grid, solveType, lockMask, selectedCell, isSettingUp,
    difficulty, isSolving, isValidating, validationStep, isSuccess, solveSpeed,
    selectCell: (r: number, c: number) => { if(!isSolving.value && !isValidating.value) { selectedCell.row = r; selectedCell.col = c } },
    fillNumber, generateNewPuzzle, clearAll, solveWithAnimation, confirmCustomPuzzle
  }
}
