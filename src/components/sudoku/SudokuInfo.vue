<script setup lang="ts">
/**
 * components/sudoku/SudokuInfo.vue
 * 
 * 数独辅助信息组件（说明与难度设置）。
 * 负责：侧边浮动面板的展示。
 */
import { ref } from 'vue'

const props = defineProps<{
  difficulty: number
}>()

const emit = defineEmits(['update:difficulty'])

const isHistoryExpanded = ref(false)
const isHistoryHovered = ref(false)
const isControlExpanded = ref(false)
const isControlHovered = ref(false)

const localDifficulty = ref(props.difficulty)
const updateDifficulty = () => emit('update:difficulty', localDifficulty.value)
</script>

<template>
  <div>
    <!-- 左侧：解算说明 -->
    <div class="interactive-sidebar left">
      <div class="panel-group" @mouseenter="isHistoryHovered = true" @mouseleave="isHistoryHovered = false">
        <div class="icon-trigger" :class="{ 'active-glow': isHistoryExpanded }" @click.stop="isHistoryExpanded = !isHistoryExpanded">
          <span class="icon">ℹ️</span>
        </div>
        <Transition name="slide-fade" :style="{ '--offset': '-15px' }">
          <div class="floating-panel left-aligned" v-show="isHistoryExpanded || isHistoryHovered">
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

    <!-- 右侧：难度调节 -->
    <div class="interactive-sidebar right">
      <div class="panel-group" @mouseenter="isControlHovered = true" @mouseleave="isControlHovered = false">
        <Transition name="slide-fade" :style="{ '--offset': '15px' }">
          <div class="floating-panel right-aligned" v-show="isControlExpanded || isControlHovered">
            <div class="glass-card">
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
            </div>
          </div>
        </Transition>
        <div class="icon-trigger" :class="{ 'active-glow': isControlExpanded }" @click.stop="isControlExpanded = !isControlExpanded">
          <span class="icon">⚙️</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.interactive-sidebar { position: absolute; top: 1.5rem; z-index: 200; }
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

.card-header h2, .card-header h3 { color: #f1f5f9; margin-bottom: 1rem; font-size: 1.1rem; }

.slider-group { margin-bottom: 1.2rem; }
.slider-info { display: flex; justify-content: space-between; font-size: 0.8rem; color: #94a3b8; margin-bottom: 8px; }
.slider-val { background: rgba(255,255,255,0.1); padding: 1px 6px; border-radius: 4px; font-family: monospace; color: #38bdf8; font-weight: 700; }
.neon-slider { -webkit-appearance: none; width: 100%; height: 16px; background: transparent; outline: none; }
.neon-slider::-webkit-slider-runnable-track { width: 100%; height: 4px; background: #334155; border-radius: 2px; }
.neon-slider.blue::-webkit-slider-runnable-track { background: #3b82f6; }
.neon-slider::-webkit-slider-thumb { -webkit-appearance: none; height: 14px; width: 14px; border-radius: 50%; background: #6366f1; cursor: pointer; border: 2px solid #fff; margin-top: -5px; box-shadow: 0 0 10px rgba(99, 102, 241, 0.4); }

.slide-fade-enter-active, .slide-fade-leave-active { transition: all 0.3s ease-out; }
.slide-fade-enter-from, .slide-fade-leave-to { transform: translateX(var(--offset)); opacity: 0; }

.color-legend { margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
.legend-item { display: flex; align-items: center; gap: 0.8rem; font-size: 0.85rem; color: #cbd5e1; }
.dot { width: 10px; height: 10px; border-radius: 50%; }
.dot.white { background: #f8fafc; box-shadow: 0 0 5px #f8fafc; }
.dot.green { background: #10b981; box-shadow: 0 0 5px #10b981; }
.dot.yellow { background: #fbbf24; box-shadow: 0 0 5px #fbbf24; }

.desc-text { font-size: 0.85rem; color: #94a3b8; }
.desc-list { font-size: 0.85rem; color: #94a3b8; padding-left: 1.2rem; margin: 0.5rem 0; }
</style>
