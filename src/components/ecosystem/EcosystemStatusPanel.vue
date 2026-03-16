<script setup lang="ts">
/**
 * components/ecosystem/EcosystemStatusPanel.vue
 * 
 * 展示演化状态的浮动面板。
 * 数据完全来自 store，因此它天然能反映后台持续运行的状态。
 */
import { useEcosystemStore } from '@/stores/ecosystem'
import FloatingPanelGroup from '@/components/shared/FloatingPanelGroup.vue'

const store = useEcosystemStore()
</script>

<template>
  <FloatingPanelGroup icon="📊" label="演化状态" side="left">
    <div class="card-header"><h2>演化状态</h2></div>
    <div class="card-body">
      <div class="status-badge" :class="store.state.status === '运行中' ? 'running' : 'collapsed'">
        {{ store.state.status }}
      </div>
      <div class="stat-grid">
        <div class="stat-item"><span class="label">猎物数量</span><span class="value">{{ store.state.preys }}</span></div>
        <div class="stat-item"><span class="label">捕食者</span><span class="value pred-color">{{ store.state.predators }}</span></div>
        <div class="stat-item"><span class="label">存活时间</span><span class="value">{{ store.state.uptime }}s</span></div>
        <div class="stat-item"><span class="label">种群峰值</span><span class="value">{{ store.state.peak }}</span></div>
      </div>
    </div>
  </FloatingPanelGroup>
</template>

<style scoped>
.card-header h2 { color: #f8fafc; margin: 0 0 1rem 0; font-size: 0.95rem; font-weight: 700; }
.status-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 0.7rem; font-weight: 700; margin-bottom: 0.75rem; text-transform: uppercase; }
.status-badge.running { background: rgba(16, 185, 129, 0.2); color: #10b981; }
.status-badge.collapsed { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
.stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.stat-item .label { font-size: 0.7rem; color: #94a3b8; display: block; }
.stat-item .value { font-size: 1.2rem; font-weight: 800; color: #e2e8f0; font-family: monospace; }
.pred-color { color: #ff3366 !important; }
</style>
