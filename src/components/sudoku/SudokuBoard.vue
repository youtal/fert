<script setup lang="ts">
/**
 * components/sudoku/SudokuBoard.vue
 * 
 * 专门负责数独 9x9 网格的渲染。
 * 核心逻辑：
 * 1. 响应单元格点击事件并向上传递选中坐标。
 * 2. 根据 solveType 和 validationStep 展示动态样式。
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
}

defineProps<Props>()
const emit = defineEmits<{
  (e: 'select', row: number, col: number): void
}>()
</script>

<template>
  <div class="sudoku-board" :class="{ 'validating': isValidating, 'success': isSuccess && !isValidating, 'failure': !isSuccess && !isValidating }">
    <div v-for="(rowArr, r) in grid" :key="r" class="row">
      <div 
        v-for="(cell, c) in rowArr" :key="c" 
        class="cell"
        :class="[
          `type-${solveType[r][c]}`,
          { 
            'locked': lockMask[r][c], 
            'selected': selectedCell.row === r && selectedCell.col === c,
            'validating-highlight': validationStep === r || (validationStep === 9 && isSuccess)
          }
        ]"
        @click="emit('select', r, c)"
      >
        {{ cell !== 0 ? cell : '' }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.sudoku-board {
  display: flex;
  flex-direction: column;
  background: #334155;
  border: 4px solid #334155;
  border-radius: 8px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.row { display: flex; }

.cell {
  width: 54px; height: 54px;
  display: flex; align-items: center; justify-content: center;
  background: #1e293b;
  color: #f8fafc;
  font-size: 1.5rem; font-weight: 600;
  border: 1px solid #334155;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

/* 粗线分界线：3x3 区域 */
.row:nth-child(3n) { border-bottom: 3px solid #334155; }
.row:last-child { border-bottom: none; }
.cell:nth-child(3n) { border-right: 3px solid #334155; }
.cell:last-child { border-right: none; }

.cell:hover { background: #334155; z-index: 2; }
.cell.selected { background: #3b82f6 !important; color: white; transform: scale(1.05); z-index: 10; box-shadow: 0 0 15px rgba(59, 130, 246, 0.5); }
.cell.locked { color: #94a3b8; font-weight: 400; background: #0f172a; }

/* 动态状态颜色 */
.type-1 { color: #10b981; } /* 逻辑解 */
.type-2 { background: #fde047 !important; color: #1e293b; } /* 回溯中 */
.type-3 { color: #34d399; } /* 用户正确 */
.type-4 { color: #f87171; } /* 用户错误 */

/* 验证动画效果 */
.validating-highlight { background: #3b82f6 !important; color: white; }
.success { transform: scale(1.02); box-shadow: 0 0 40px rgba(16, 185, 129, 0.3); border-color: #10b981; }
.failure { animation: shake 0.4s ease-in-out; border-color: #ef4444; }

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-8px); }
  75% { transform: translateX(8px); }
}

/* 适配移动端 */
@media (max-width: 600px) {
  .cell { width: 40px; height: 40px; font-size: 1.1rem; }
}
</style>