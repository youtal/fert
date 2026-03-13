<script setup lang="ts">
/**
 * SudokuView.vue
 * 
 * 数独功能主视图。
 * 已完成重构：逻辑抽离至 useSudoku，界面拆分为原子组件。
 */
import { useSudoku } from '@/composables/useSudoku'
import SudokuBoard from '@/components/sudoku/SudokuBoard.vue'
import SudokuControls from '@/components/sudoku/SudokuControls.vue'
import SudokuInfo from '@/components/sudoku/SudokuInfo.vue'

const {
  grid, solveType, lockMask, selectedCell, isSettingUp,
  difficulty, isSolving, isValidating, validationStep, isSuccess, solveSpeed,
  selectCell, fillNumber, generateNewPuzzle, clearAll, solveWithAnimation, confirmCustomPuzzle
} = useSudoku()
</script>

<template>
  <div class="sudoku-view">
    <!-- 侧边信息与难度面板 -->
    <SudokuInfo v-model:difficulty="difficulty" />

    <div class="main-layout-horizontal">
      <!-- 核心棋盘 -->
      <div class="board-section">
        <SudokuBoard 
          :grid="grid"
          :solve-type="solveType"
          :lock-mask="lockMask"
          :selected-cell="selectedCell"
          :is-solving="isSolving"
          :is-validating="isValidating"
          :is-success="isSuccess"
          :validation-step="validationStep"
          @select="selectCell"
        />
      </div>

      <!-- 控制面板 -->
      <SudokuControls 
        v-model:solve-speed="solveSpeed"
        :is-solving="isSolving"
        :is-validating="isValidating"
        :is-setting-up="isSettingUp"
        @fill="fillNumber"
        @solve="solveWithAnimation"
        @generate="generateNewPuzzle"
        @clear="clearAll"
        @confirm="confirmCustomPuzzle"
      />
    </div>
  </div>
</template>

<style scoped>
.sudoku-view {
  width: 100%; height: 100%;
  background: radial-gradient(circle at center, #1e293b 0%, #09090b 100%);
  position: absolute; top: 0; left: 0;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}

.main-layout-horizontal {
  display: flex; align-items: flex-start; gap: 3rem; padding: 2rem; z-index: 10;
}
</style>
