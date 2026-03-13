<script setup lang="ts">
/**
 * components/ecosystem/EcosystemControlPanel.vue
 * 
 * 演化参数控制面板。
 */
import { ref } from 'vue'
import { useEcosystemStore } from '@/stores/ecosystem'

const store = useEcosystemStore()
const isExpanded = ref(false)
const isHovered = ref(false)
</script>

<template>
  <div class="panel-group" @mouseenter="isHovered = true" @mouseleave="isHovered = false">
    <Transition name="slide-fade">
      <div class="floating-panel right-aligned" v-show="isExpanded || isHovered">
        <div class="glass-card control-card">
          <div class="card-header"><h3>演化控制台</h3></div>
          
          <div class="slider-group">
            <div class="slider-info"><span>繁衍周期 (n)</span><span class="slider-val">{{ store.params.n }}s</span></div>
            <input type="range" v-model.number="store.params.n" min="2" max="15" step="1" class="neon-slider blue" />
          </div>

          <div class="slider-group">
            <div class="slider-info"><span>突变概率 (m)</span><span class="slider-val pred-color">{{ store.params.m }}‰</span></div>
            <input type="range" v-model.number="store.params.m" min="0" max="20" step="1" class="neon-slider red" />
          </div>

          <div class="slider-group">
            <div class="slider-info"><span>饥饿阈值 (k)</span><span class="slider-val">{{ store.params.k }}s</span></div>
            <input type="range" v-model.number="store.params.k" min="2" max="15" step="1" class="neon-slider purple" />
          </div>

          <div class="slider-group">
            <div class="slider-info"><span>粒子间隙</span><span class="slider-val green-val">{{ store.params.minSpacing }}px</span></div>
            <input type="range" v-model.number="store.params.minSpacing" min="10" max="100" step="1" class="neon-slider green" />
          </div>
        </div>
      </div>
    </Transition>
    <div class="icon-trigger" :class="{ 'active-glow': isExpanded }" @click.stop="isExpanded = !isExpanded">
      <span class="icon">⚙️</span>
    </div>
  </div>
</template>

<style scoped>
.panel-group { position: relative; display: flex; align-items: flex-start; }

.icon-trigger {
  width: 52px; height: 52px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 1.4rem; z-index: 232; user-select: none;
  caret-color: transparent; outline: none;
}
.icon-trigger:hover { background: rgba(255, 255, 255, 0.08); transform: scale(1.05); }

.active-glow {
  background: rgba(255, 255, 255, 0.12) !important;
  backdrop-filter: blur(12px); border-color: rgba(99, 102, 241, 0.4);
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.2);
}

.floating-panel { position: absolute; top: 0; width: 300px; z-index: 31; pointer-events: auto; }
.floating-panel.right-aligned { right: 64px; }

.glass-card {
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px; padding: 1.2rem;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
}

.slide-fade-enter-active, .slide-fade-leave-active { transition: all 0.3s ease-out; }
.slide-fade-enter-from, .slide-fade-leave-to { transform: translateX(15px); opacity: 0; }

.card-header h3 { color: #f8fafc; margin: 0 0 1rem 0; font-size: 0.95rem; font-weight: 700; }
.slider-group { margin-bottom: 1rem; }
.slider-info { display: flex; justify-content: space-between; font-size: 0.8rem; color: #cbd5e1; margin-bottom: 4px; }
.slider-val { background: rgba(255,255,255,0.1); padding: 1px 6px; border-radius: 4px; font-family: monospace; color: #38bdf8; }
.pred-color { color: #ff3366 !important; }
.green-val { color: #10b981 !important; }

input[type=range] { -webkit-appearance: none; width: 100%; background: transparent; height: 16px; outline: none; }
input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 4px; border-radius: 2px; }
input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 14px; width: 14px; border-radius: 50%; margin-top: -5px; cursor: pointer; border: 2px solid #fff; }
.neon-slider.blue::-webkit-slider-runnable-track { background: #3b82f6; }
.neon-slider.red::-webkit-slider-runnable-track { background: #ef4444; }
.neon-slider.purple::-webkit-slider-runnable-track { background: #8b5cf6; }
.neon-slider.green::-webkit-slider-runnable-track { background: #10b981; }
</style>