<script setup lang="ts">
/**
 * components/ecosystem/EcosystemControlPanel.vue
 * 
 * 演化参数控制面板。
 * 这里只负责改写 store 中的参数，不感知任何仿真推进细节。
 */
import { useEcosystemStore } from '@/stores/ecosystem'
import FloatingPanelGroup from '@/components/shared/FloatingPanelGroup.vue'

const store = useEcosystemStore()
</script>

<template>
  <FloatingPanelGroup icon="⚙️" label="演化控制台" side="right">
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
  </FloatingPanelGroup>
</template>

<style scoped>
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
