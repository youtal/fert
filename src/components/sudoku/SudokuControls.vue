<script setup lang="ts">
/**
 * components/sudoku/SudokuControls.vue
 *
 * 数独控制面板。
 * 职责是发出用户操作事件，而不是直接读写棋盘数据。
 * 这样可以保证所有业务分支都收口到 useSudoku 中处理。
 */
import { ref, watch } from 'vue'
import BaseCard from '@/components/shared/BaseCard.vue'

const props = defineProps<{
  isSolving: boolean
  isValidating: boolean
  solveSpeed: number
  isSettingUp: boolean
}>()

const emit = defineEmits([
  'fill', 'update:solveSpeed', 'solve', 'generate', 'clear', 'confirm'
])

// 本地镜像值让滑块拖动更顺滑，并维持受控组件语义。
const localSolveSpeed = ref(props.solveSpeed)
watch(() => props.solveSpeed, (newVal) => {
  localSolveSpeed.value = newVal
})

/**
 * 将本地滑块值同步回父级。
 * 父级仍是唯一真实状态源，这里只处理拖动过程中的过渡体验。
 */
const updateSpeed = () => emit('update:solveSpeed', localSolveSpeed.value)
</script>

<template>
  <div class="controls-section">
    <BaseCard class="glass-card control-panel-inner">
      <div class="card-header"><h3>数字面板</h3></div>
      <div class="number-pad">
        <button v-for="n in 9" :key="n" @click="emit('fill', n)" class="pad-btn" :disabled="isSolving || isValidating">{{ n }}</button>
        <button @click="emit('fill', 0)" class="pad-btn clear" :disabled="isSolving || isValidating">清除</button>
      </div>

      <div class="divider"></div>

      <div class="card-header"><h3>动画配置</h3></div>
      <div class="slider-group">
        <div class="slider-info"><span>解算速度</span><span class="slider-val">{{ localSolveSpeed }}ms</span></div>
        <input 
          type="range" 
          v-model.number="localSolveSpeed" 
          @input="updateSpeed"
          min="0" max="200" step="10" 
          class="neon-slider purple" 
        />
      </div>

      <div class="action-buttons">
        <button v-if="isSettingUp" class="action-btn confirm-btn" @click="emit('confirm')">
          确认自定义题目
        </button>
        <button v-else class="action-btn primary" @click="emit('solve')" :disabled="isSolving || isValidating">
          {{ isSolving ? '正在解算...' : (isValidating ? '正在校验...' : '一键解算') }}
        </button>
        <div class="button-row">
          <button class="action-btn secondary flex-1" @click="emit('generate')" :disabled="isSolving || isValidating">随机题目</button>
          <button class="action-btn danger flex-1" @click="emit('clear')" :disabled="isSolving || isValidating">清空棋盘</button>
        </div>
      </div>
    </BaseCard>
  </div>
</template>

<style scoped>
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
.action-btn.confirm-btn { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; margin-bottom: 0.5rem; }
.action-btn.secondary { background: rgba(255,255,255,0.05); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.1); }
.action-btn.danger { background: rgba(239, 68, 68, 0.1); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.2); }

.glass-card {
  background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 1.5rem;
}
.card-header h3 { margin-bottom: 1rem; color: #f1f5f9; font-size: 1.1rem; }

.slider-group { margin-bottom: 1.2rem; }
.slider-info { display: flex; justify-content: space-between; font-size: 0.8rem; color: #94a3b8; margin-bottom: 8px; }
.slider-val { color: #818cf8; font-weight: 700; font-family: monospace; }
.neon-slider { -webkit-appearance: none; width: 100%; height: 4px; background: #334155; border-radius: 2px; }
.neon-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: #6366f1; cursor: pointer; border: 3px solid #fff; }

@media (max-width: 980px) {
  /* 上下布局下让控制面板按容器宽度伸展，避免保留桌面端的窄侧栏比例。 */
  .controls-section {
    width: min(100%, 560px);
  }

  .control-panel-inner {
    width: 100%;
  }
}
</style>
