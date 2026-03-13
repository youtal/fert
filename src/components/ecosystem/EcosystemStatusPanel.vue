<script setup lang="ts">
/**
 * components/ecosystem/EcosystemStatusPanel.vue
 * 
 * 展示演化状态的浮动面板。
 */
import { ref } from 'vue'
import { useEcosystemStore } from '@/stores/ecosystem'

const store = useEcosystemStore()
const isExpanded = ref(false)
const isHovered = ref(false)
</script>

<template>
  <div class="panel-group" @mouseenter="isHovered = true" @mouseleave="isHovered = false">
    <div class="icon-trigger" :class="{ 'active-glow': isExpanded }" @click.stop="isExpanded = !isExpanded">
      <span class="icon">📊</span>
    </div>
    <Transition name="slide-fade">
      <div class="floating-panel left-aligned" v-show="isExpanded || isHovered">
        <div class="glass-card">
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
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* 此处包含从 ParticleView 迁移来的相关样式 */
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
.floating-panel.left-aligned { left: 64px; }

.glass-card {
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px; padding: 1.2rem;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
}

.slide-fade-enter-active, .slide-fade-leave-active { transition: all 0.3s ease-out; }
.slide-fade-enter-from, .slide-fade-leave-to { transform: translateX(-15px); opacity: 0; }

.card-header h2 { color: #f8fafc; margin: 0 0 1rem 0; font-size: 0.95rem; font-weight: 700; }
.status-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 0.7rem; font-weight: 700; margin-bottom: 0.75rem; text-transform: uppercase; }
.status-badge.running { background: rgba(16, 185, 129, 0.2); color: #10b981; }
.status-badge.collapsed { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
.stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.stat-item .label { font-size: 0.7rem; color: #94a3b8; display: block; }
.stat-item .value { font-size: 1.2rem; font-weight: 800; color: #e2e8f0; font-family: monospace; }
.pred-color { color: #ff3366 !important; }
</style>