<script setup lang="ts">
/**
 * SudokuView.vue (Optimized Solver with Animation & Color Coding)
 * 
 * 1. 题目数字: 白色 (#f8fafc)
 * 2. 逻辑解算数字: 绿色 (#10b981)
 * 3. 暴力回溯数字: 黄色 (#fbbf24)
 */
import { ref, reactive, onMounted } from 'vue'
import { Sudoku, type SudokuGrid } from '@/utils/sudoku'

// --- 状态定义 ---
const grid = ref<SudokuGrid>(Sudoku.createEmptyGrid())
// solveType: 0=题目/手动, 1=逻辑, 2=回溯
const solveType = ref<number[][]>(Array.from({ length: 9 }, () => Array(9).fill(0)))
const lockMask = ref<boolean[][]>(Array.from({ length: 9 }, () => Array(9).fill(false)))
const selectedCell = reactive({ row: -1, col: -1 })
const difficulty = ref(40)
const isSolving = ref(false)
const isValidating = ref(false)
const validationStep = ref(-1)
const isSuccess = ref(true)
const solveSpeed = ref(50) 

const isControlExpanded = ref(true)
const isHistoryExpanded = ref(false)

const isInBlock = (r: number, c: number, blockIdx: number) => {
  return Math.floor(r / 3) * 3 + Math.floor(c / 3) === blockIdx
}

const getHighlightClass = (r: number, c: number) => {
  const isSelected = selectedCell.row === r && selectedCell.col === c
  const isSameRow = selectedCell.row !== -1 && selectedCell.row === r
  const isSameCol = selectedCell.col !== -1 && selectedCell.col === c
  const isSameBlock = selectedCell.row !== -1 && 
                      Math.floor(selectedCell.row / 3) === Math.floor(r / 3) && 
                      Math.floor(selectedCell.col / 3) === Math.floor(c / 3)

  const inValidationScan = isValidating.value && (
    r === validationStep.value || 
    c === validationStep.value || 
    isInBlock(r, c, validationStep.value)
  )

  const type = solveType.value[r]?.[c] ?? 0
  const fixed = lockMask.value[r]?.[c] ?? false

  return {
    'is-selected': isSelected,
    'is-related': !isSelected && (isSameRow || isSameCol || isSameBlock),
    'is-fixed': fixed,
    'is-logic': type === 1,
    'is-backtrack': type === 2,
    'is-validating': inValidationScan, 
    'is-error': isValidating.value && !isSuccess.value && inValidationScan,
    'border-right': (c + 1) % 3 === 0 && c < 8,
    'border-bottom': (r + 1) % 3 === 0 && r < 8
  }
}

const runValidationAnimation = async () => {
  isSuccess.value = Sudoku.validateFullGrid(grid.value)
  isValidating.value = true
  selectedCell.row = -1
  selectedCell.col = -1

  for (let i = 0; i < 9; i++) {
    validationStep.value = i
    await new Promise(resolve => setTimeout(resolve, 150))
  }
  
  await new Promise(resolve => setTimeout(resolve, 300))
  if (!isSuccess.value) {
    alert('验证失败：盘面存在冲突或未填满！')
  }
  validationStep.value = -1
  isValidating.value = false
}

const clearAll = () => {
  if (isSolving.value || isValidating.value) return
  grid.value = Sudoku.createEmptyGrid()
  lockMask.value = Array.from({ length: 9 }, () => Array(9).fill(false))
  solveType.value = Array.from({ length: 9 }, () => Array(9).fill(0))
  selectedCell.row = -1
  selectedCell.col = -1
}

const generateNewPuzzle = () => {
  if (isSolving.value || isValidating.value) return
  const { puzzle } = Sudoku.generatePuzzle(difficulty.value)
  grid.value = puzzle.map(r => [...r])
  lockMask.value = puzzle.map(r => r.map(cell => cell !== 0))
  solveType.value = Array.from({ length: 9 }, () => Array(9).fill(0))
  selectedCell.row = -1
  selectedCell.col = -1
}

const selectCell = (row: number, col: number) => {
  if (isSolving.value || isValidating.value) return
  selectedCell.row = row
  selectedCell.col = col
}

const fillNumber = (num: number) => {
  if (isSolving.value || isValidating.value || selectedCell.row === -1) return
  const r = selectedCell.row
  const c = selectedCell.col
  const rowArr = grid.value[r]
  if (rowArr) {
    rowArr[c] = num
    const stRow = solveType.value[r]
    if (stRow) stRow[c] = 0
  }
}

/**
 * 演示钩子函数：负责更新 UI 状态并根据 solveSpeed 等待
 */
const animationStepHook = async (r: number, c: number, v: number, type: 'logic' | 'backtrack') => {
  // 仅在有速度设置时演示
  if (solveSpeed.value > 0) {
    // 同步网格数据到 Vue (虽然算法直接修改了 grid.value，但这样更显式)
    const rowArr = grid.value[r]
    if (rowArr) rowArr[c] = v
    
    // 同步类型
    const stRow = solveType.value[r]
    if (stRow) {
      if (v === 0) stRow[c] = 0 // 回溯清理
      else stRow[c] = (type === 'logic' ? 1 : 2)
    }

    // 聚焦当前单元格
    selectedCell.row = r
    selectedCell.col = c

    // 等待设定时间
    await new Promise(resolve => setTimeout(resolve, solveSpeed.value))
  }
}

const solveWithAnimation = async () => {
  if (isSolving.value || isValidating.value) return
  
  // 锁定当前题目
  lockMask.value = grid.value.map(r => r.map(cell => cell !== 0))
  solveType.value = grid.value.map(r => r.map(() => 0))

  isSolving.value = true
  
  const { rows, cols, blocks } = Sudoku.initializeMasks(grid.value)
  
  // 1. 逻辑解算阶段演示
  await Sudoku.propagateConstraints(grid.value, rows, cols, blocks, animationStepHook)

  // 2. 暴力回溯阶段演示
  const success = await Sudoku.backtrackWithMasks(grid.value, rows, cols, blocks, animationStepHook)

  isSolving.value = false
  selectedCell.row = -1
  selectedCell.col = -1
  
  if (success) {
    await runValidationAnimation()
  } else {
    alert('该数独布局无解！')
  }
}

onMounted(() => {
  window.addEventListener('keydown', (e) => {
    if (e.key >= '1' && e.key <= '9') fillNumber(parseInt(e.key))
    else if (e.key === 'Backspace' || e.key === '0') fillNumber(0)
  })
  generateNewPuzzle()
})
</script>

<template>
  <div class="sudoku-view">
    <div class="interactive-sidebar left">
      <div class="panel-group">
        <div class="icon-trigger" :class="{ 'active-glow': isHistoryExpanded }" @click="isHistoryExpanded = !isHistoryExpanded">
          <span class="icon">ℹ️</span>
        </div>
        <Transition name="slide-fade" :style="{ '--offset': '-15px' }">
          <div class="floating-panel left-aligned" v-show="isHistoryExpanded">
            <div class="glass-card">
              <div class="card-header"><h2>解算说明</h2></div>
              <div class="card-body">
                <p class="desc-text">解算过程分为两个阶段：</p>
                <ul class="desc-list">
                  <li><b>1. 逻辑阶段：</b>通过约束传播直接确定唯一值。</li>
                  <li><b>2. 回溯阶段：</b>基于启发式搜索尝试可能解。</li>
                </ul>
                <div class="color-legend">
                  <div class="legend-item"><span class="dot white"></span><span>题目数字</span></div>
                  <div class="legend-item"><span class="dot green"></span><span>逻辑推理</span></div>
                  <div class="legend-item"><span class="dot yellow"></span><span>暴力回溯</span></div>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <div class="main-layout-horizontal">
      <div class="board-section">
        <div class="sudoku-board" :class="{ 
          'solving-active': isSolving, 
          'validation-active': isValidating && isSuccess,
          'validation-error': isValidating && !isSuccess
        }">
          <div v-for="(row, rIdx) in grid" :key="rIdx" class="board-row">
            <div 
              v-for="(cell, cIdx) in row" 
              :key="cIdx" 
              class="board-cell"
              :class="getHighlightClass(rIdx, cIdx)"
              @click="selectCell(rIdx, cIdx)"
            >
              {{ cell === 0 ? '' : cell }}
            </div>
          </div>
        </div>
      </div>

      <div class="controls-section">
        <div class="glass-card control-panel-inner">
          <div class="card-header"><h3>数字面板</h3></div>
          <div class="number-pad">
            <button v-for="n in 9" :key="n" @click="fillNumber(n)" class="pad-btn" :disabled="isSolving || isValidating">{{ n }}</button>
            <button @click="fillNumber(0)" class="pad-btn clear" :disabled="isSolving || isValidating">清除</button>
          </div>

          <div class="divider"></div>

          <div class="card-header"><h3>动画配置</h3></div>
          <div class="slider-group">
            <div class="slider-info"><span>解算速度</span><span class="slider-val">{{ solveSpeed }}ms</span></div>
            <input type="range" v-model.number="solveSpeed" min="0" max="200" step="10" class="neon-slider purple" />
          </div>

          <div class="action-buttons">
            <button class="action-btn primary" @click="solveWithAnimation" :disabled="isSolving || isValidating">
              {{ isSolving ? '正在解算...' : (isValidating ? '正在校验...' : '一键解算') }}
            </button>
            <div class="button-row">
              <button class="action-btn secondary flex-1" @click="generateNewPuzzle" :disabled="isSolving || isValidating">随机题目</button>
              <button class="action-btn danger flex-1" @click="clearAll" :disabled="isSolving || isValidating">清空棋盘</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="interactive-sidebar right">
      <div class="panel-group">
        <Transition name="slide-fade" :style="{ '--offset': '15px' }">
          <div class="floating-panel right-aligned" v-show="isControlExpanded">
            <div class="glass-card">
              <div class="card-header"><h3>难度调节</h3></div>
              <div class="slider-group">
                <div class="slider-info"><span>挖空数量</span><span class="slider-val">{{ difficulty }}</span></div>
                <input type="range" v-model.number="difficulty" min="20" max="65" step="1" class="neon-slider blue" />
              </div>
            </div>
          </div>
        </Transition>
        <div class="icon-trigger" :class="{ 'active-glow': isControlExpanded }" @click="isControlExpanded = !isControlExpanded">
          <span class="icon">⚙️</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 保持原有样式，仅微调颜色定义 */
.sudoku-view {
  width: 100%; height: 100%;
  background: radial-gradient(circle at center, #1e293b 0%, #09090b 100%);
  position: absolute; top: 0; left: 0;
  display: flex; align-items: center; justify-content: center;
}

.main-layout-horizontal {
  display: flex; align-items: flex-start; gap: 3rem; padding: 2rem; z-index: 10;
}

.sudoku-board {
  background: rgba(15, 23, 42, 0.8);
  border: 3px solid #334155; border-radius: 12px; padding: 6px;
  box-shadow: 0 0 40px rgba(0,0,0,0.5);
  transition: all 0.5s;
}
.solving-active { border-color: #818cf8; box-shadow: 0 0 50px rgba(99, 102, 241, 0.2); }

.validation-active { 
  border-color: #10b981; 
  box-shadow: 0 0 60px rgba(16, 185, 129, 0.3);
  animation: successPulse 1.5s infinite;
}
.validation-error {
  border-color: #ef4444;
  box-shadow: 0 0 60px rgba(239, 68, 68, 0.3);
  animation: errorPulse 0.5s infinite;
}

@keyframes successPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.01); box-shadow: 0 0 80px rgba(16, 185, 129, 0.4); }
  100% { transform: scale(1); }
}
@keyframes errorPulse {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

.board-row { display: flex; }

.board-cell {
  width: 54px; height: 54px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.5rem; font-weight: 700;
  border: 1px solid rgba(71, 85, 105, 0.2);
  cursor: pointer; transition: all 0.1s;
  position: relative;
}

/* 颜色定义 */
.board-cell.is-fixed { color: #f8fafc; }     /* 题目: 白色 */
.board-cell.is-logic { color: #10b981; }     /* 逻辑: 绿色 */
.board-cell.is-backtrack { color: #fbbf24; } /* 回溯: 黄色 */

.board-cell.is-selected {
  background: rgba(99, 102, 241, 0.4) !important;
  box-shadow: inset 0 0 15px rgba(129, 140, 248, 0.6);
  z-index: 5; transform: scale(1.05);
  border-radius: 4px; border-color: #818cf8;
}

.board-cell.is-related { background: rgba(255, 255, 255, 0.04); }

.board-cell.is-validating {
  background: rgba(16, 185, 129, 0.25) !important;
  border-color: #10b981;
  color: #10b981 !important;
  text-shadow: 0 0 10px rgba(16, 185, 129, 0.8);
}
.board-cell.is-error {
  background: rgba(239, 68, 68, 0.25) !important;
  border-color: #ef4444;
  color: #ef4444 !important;
}

.border-right { border-right: 3px solid #475569; }
.border-bottom { border-bottom: 3px solid #475569; }

.control-panel-inner { width: 320px; }
.divider { height: 1px; background: rgba(255,255,255,0.05); margin: 1.5rem 0; }

.number-pad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.6rem; }
.pad-btn {
  height: 48px; border-radius: 10px; background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.05); color: #f1f5f9; font-weight: 700; cursor: pointer; transition: all 0.2s;
}
.pad-btn:hover:not(:disabled) { background: #6366f1; border-color: #818cf8; transform: translateY(-2px); }
.pad-btn:disabled { opacity: 0.2; cursor: not-allowed; }
.pad-btn.clear { grid-column: span 3; background: rgba(239, 68, 68, 0.1); color: #f87171; }

.action-buttons { display: flex; flex-direction: column; gap: 0.8rem; margin-top: 1rem; }
.button-row { display: flex; gap: 0.8rem; }
.flex-1 { flex: 1; }

.action-btn {
  padding: 0.9rem; border-radius: 12px; border: none; font-weight: 800; cursor: pointer; transition: all 0.3s; font-size: 0.9rem;
}
.action-btn.primary { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; }
.action-btn.secondary { background: rgba(255,255,255,0.05); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.1); }
.action-btn.danger { background: rgba(239, 68, 68, 0.1); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.2); }

.interactive-sidebar { position: absolute; top: 1.5rem; z-index: 30; }
.interactive-sidebar.left { left: 1.5rem; }
.interactive-sidebar.right { right: 1.5rem; }

.icon-trigger {
  width: 52px; height: 52px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px;
  display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s; font-size: 1.4rem;
}
.active-glow { background: rgba(255, 255, 255, 0.12); border-color: rgba(99, 102, 241, 0.4); }

.floating-panel { position: absolute; top: 0; width: 280px; }
.floating-panel.left-aligned { left: 64px; }
.floating-panel.right-aligned { right: 64px; }

.glass-card {
  background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 1.5rem;
}

.slider-group { margin-bottom: 1.2rem; }
.slider-info { display: flex; justify-content: space-between; font-size: 0.8rem; color: #94a3b8; margin-bottom: 8px; }
.slider-val { color: #818cf8; font-weight: 700; font-family: monospace; }
.neon-slider { -webkit-appearance: none; width: 100%; height: 4px; background: #334155; border-radius: 2px; }
.neon-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: #6366f1; cursor: pointer; border: 3px solid #fff; }

.slide-fade-enter-active, .slide-fade-leave-active { transition: all 0.3s ease-out; }
.slide-fade-enter-from, .slide-fade-leave-to { transform: translateX(var(--offset)); opacity: 0; }

.color-legend { margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
.legend-item { display: flex; align-items: center; gap: 0.8rem; font-size: 0.85rem; color: #cbd5e1; }
.dot { width: 10px; height: 10px; border-radius: 50%; }
.dot.white { background: #f8fafc; box-shadow: 0 0 5px #f8fafc; }
.dot.green { background: #10b981; box-shadow: 0 0 5px #10b981; }
.dot.yellow { background: #fbbf24; box-shadow: 0 0 5px #fbbf24; }

.desc-list { font-size: 0.85rem; color: #94a3b8; padding-left: 1.2rem; margin: 0.5rem 0; }
</style>
