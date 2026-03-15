<script setup lang="ts">
/**
 * SudokuView.vue
 *
 * 数独视图承担模块装配职责：
 * 1. 承接 useSudoku 暴露的状态与操作。
 * 2. 将信息区、棋盘与控制面板组装成完整工作台。
 * 3. 保持模板层无求解算法细节。
 */
import { useSudoku } from '@/composables/useSudoku'
import SudokuBoard from '@/components/sudoku/SudokuBoard.vue'
import SudokuControls from '@/components/sudoku/SudokuControls.vue'
import SudokuInfo from '@/components/sudoku/SudokuInfo.vue'

// SudokuView 仅负责把 useSudoku 暴露的状态绑定到各子组件。
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
  overflow: auto;
}

.main-layout-horizontal {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 3rem;
  padding: 2rem;
  z-index: 10;
  width: min(100%, 1100px);
}

.board-section {
  display: flex;
  justify-content: center;
  flex: 0 1 auto;
}

@media (max-width: 980px) {
  .sudoku-view {
    align-items: flex-start;
  }

  /* 当横向空间不足时切换为上下布局，优先保障棋盘与面板都能完整显示。 */
  .main-layout-horizontal {
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    width: 100%;
    padding: 5.5rem 1.5rem 1.5rem;
  }

  .board-section {
    width: 100%;
  }
}

@media (max-width: 600px) {
  .main-layout-horizontal {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}
</style>
