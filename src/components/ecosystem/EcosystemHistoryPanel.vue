<script setup lang="ts">
/**
 * components/ecosystem/EcosystemHistoryPanel.vue
 * 
 * 展示灭绝历史记录的浮动面板。
 * 仅当历史日志存在时渲染入口，避免空态图标长期占据视线。
 */
import { ref } from 'vue'
import { useEcosystemStore } from '@/stores/ecosystem'

const store = useEcosystemStore()
const isExpanded = ref(false)
const isHovered = ref(false)
</script>

<template>
  <div class="panel-group" v-if="store.historyLogs.length > 0" @mouseenter="isHovered = true" @mouseleave="isHovered = false">
    <div class="icon-trigger" :class="{ 'active-glow': isExpanded }" @click.stop="isExpanded = !isExpanded">
      <span class="icon">📜</span>
    </div>
    <Transition name="slide-fade">
      <div class="floating-panel left-aligned" v-show="isExpanded || isHovered">
        <div class="glass-card">
          <div class="card-header"><h3>灭绝历史</h3></div>
          <div class="card-body">
            <div class="log-list">
              <div class="log-item" v-for="(log, idx) in store.historyLogs" :key="log.id">
                <div class="log-header">纪元 -{{ idx + 1 }} <span>{{ log.uptime }}秒</span></div>
                <div class="log-meta">峰值: {{ log.peak }} | 突变:{{ log.m }}‰</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
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

.card-header h3 { color: #f8fafc; margin: 0 0 1rem 0; font-size: 0.95rem; font-weight: 700; }
.log-item { background: rgba(255,255,255,0.03); border-radius: 8px; padding: 0.6rem; border-left: 2px solid #6366f1; margin-bottom: 0.5rem; }
.log-header { display: flex; justify-content: space-between; font-size: 0.75rem; color: #f1f5f9; }
.log-meta { font-size: 0.65rem; color: #64748b; font-family: monospace; }
</style>
