<script setup lang="ts">
/**
 * components/sudoku/SudokuBoard.vue
 * 
 * 专门负责数独 9x9 网格的渲染。
 * 恢复了原始的样式、高亮逻辑与动画。
 */
import type { SudokuGrid } from '@/utils/sudoku'

interface Props {
  grid: SudokuGrid
  solveType: number[][]
  lockMask: boolean[][]
  selectedCell: { row: number; col: number }
  validationStep: number
  isValidating: boolean
  isSuccess: boolean
  isSolving: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'select', row: number, col: number): void
}>()

const isInBlock = (r: number, c: number, blockIdx: number) => {
  return Math.floor(r / 3) * 3 + Math.floor(c / 3) === blockIdx
}

const getHighlightClass = (r: number, c: number) => {
  const isSelected = props.selectedCell.row === r && props.selectedCell.col === c
  const isSameRow = props.selectedCell.row !== -1 && props.selectedCell.row === r
  const isSameCol = props.selectedCell.col !== -1 && props.selectedCell.col === c
  const isSameBlock = props.selectedCell.row !== -1 && 
                      Math.floor(props.selectedCell.row / 3) === Math.floor(r / 3) && 
                      Math.floor(props.selectedCell.col / 3) === Math.floor(c / 3)

  const inValidationScan = props.isValidating && (
    r === props.validationStep || 
    c === props.validationStep || 
    isInBlock(r, c, props.validationStep)
  )

  const type = props.solveType[r]?.[c] ?? 0
  const fixed = props.lockMask[r]?.[c] ?? false

  return {
    'is-selected': isSelected,
    'is-related': !isSelected && (isSameRow || isSameCol || isSameBlock),
    'is-fixed': fixed,
    'is-logic': type === 1,
    'is-backtrack': type === 2,
    'is-validating': inValidationScan, 
    'is-error': props.isValidating && !props.isSuccess && inValidationScan,
    'border-right': (c + 1) % 3 === 0 && c < 8,
    'border-bottom': (r + 1) % 3 === 0 && r < 8
  }
}
</script>

<template>
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
        @click="emit('select', rIdx, cIdx)"
      >
        {{ cell === 0 ? '' : cell }}
      </div>
    </div>
  </div>
</template>

<style scoped>
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

/* 适配移动端 */
@media (max-width: 600px) {
  .board-cell { width: 40px; height: 40px; font-size: 1.1rem; }
}
</style>