<script setup lang="ts">
/**
 * components/sudoku/SudokuInfo.vue
 *
 * 数独视图的悬浮信息区与难度调节区。
 * 行为与生态系统面板保持一致：
 * 1. 默认折叠。
 * 2. 悬浮时临时展开。
 * 3. 点击图标切换常驻展开状态。
 */
import { ref, watch } from 'vue'
import FloatingPanelGroup from '@/components/shared/FloatingPanelGroup.vue'

const props = defineProps<{
  difficulty: number
}>()

const emit = defineEmits(['update:difficulty'])

// 本地镜像让滑块在拖动过程中更顺滑，同时继续保持受控组件语义。
const localDifficulty = ref(props.difficulty)
watch(() => props.difficulty, (newVal) => {
  localDifficulty.value = newVal
})

/**
 * 将本地难度值同步回父组件。
 * 真正的题目生成时机仍由父组件决定，信息面板只发出参数变更。
 */
const updateDifficulty = () => emit('update:difficulty', localDifficulty.value)
</script>

<template>
  <div class="info-layout">
    <div class="interactive-sidebar left">
      <FloatingPanelGroup icon="ℹ️" label="解算说明" side="left" panel-width="280px">
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
      </FloatingPanelGroup>
    </div>

    <div class="interactive-sidebar right">
      <FloatingPanelGroup icon="⚙️" label="难度调节" side="right" panel-width="280px">
        <div class="card-header"><h3>难度调节</h3></div>
        <div class="slider-group">
          <div class="slider-info"><span>挖空数量</span><span class="slider-val">{{ localDifficulty }}</span></div>
          <input 
            type="range" 
            v-model.number="localDifficulty" 
            @input="updateDifficulty"
            min="20" max="65" step="1" 
            class="neon-slider blue" 
          />
        </div>
      </FloatingPanelGroup>
    </div>
  </div>
</template>

<style scoped>
.interactive-sidebar { position: absolute; top: 1.5rem; z-index: 200; }
.interactive-sidebar.left { left: 1.5rem; }
.interactive-sidebar.right { right: 1.5rem; }
.card-header h2, .card-header h3 { color: #f8fafc; margin: 0 0 1rem 0; font-size: 1.1rem; font-weight: 700; }

.slider-group { margin-bottom: 1.2rem; }
.slider-info { display: flex; justify-content: space-between; font-size: 0.8rem; color: #94a3b8; margin-bottom: 8px; }
.slider-val { color: #818cf8; font-weight: 700; font-family: monospace; }
.neon-slider { -webkit-appearance: none; width: 100%; height: 4px; background: #334155; border-radius: 2px; }
.neon-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: #6366f1; cursor: pointer; border: 3px solid #fff; }

.color-legend { margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
.legend-item { display: flex; align-items: center; gap: 0.8rem; font-size: 0.85rem; color: #cbd5e1; }
.dot { width: 10px; height: 10px; border-radius: 50%; }
.dot.white { background: #f8fafc; box-shadow: 0 0 5px #f8fafc; }
.dot.green { background: #10b981; box-shadow: 0 0 5px #10b981; }
.dot.yellow { background: #fbbf24; box-shadow: 0 0 5px #fbbf24; }

.desc-text { font-size: 0.85rem; color: #cbd5e1; }
.desc-list { font-size: 0.85rem; color: #94a3b8; padding-left: 1.2rem; margin: 0.5rem 0; }
</style>
