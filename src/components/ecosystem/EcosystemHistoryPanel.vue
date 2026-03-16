<script setup lang="ts">
/**
 * components/ecosystem/EcosystemHistoryPanel.vue
 * 
 * 展示灭绝历史记录的浮动面板。
 * 仅当历史日志存在时渲染入口，避免空态图标长期占据视线。
 */
import { useEcosystemStore } from '@/stores/ecosystem'
import FloatingPanelGroup from '@/components/shared/FloatingPanelGroup.vue'

const store = useEcosystemStore()
</script>

<template>
  <FloatingPanelGroup
    v-if="store.historyLogs.length > 0"
    icon="📜"
    label="灭绝历史"
    side="left"
  >
    <div class="card-header"><h3>灭绝历史</h3></div>
    <div class="card-body">
      <div class="log-list">
        <div class="log-item" v-for="(log, idx) in store.historyLogs" :key="log.id">
          <div class="log-header">纪元 -{{ idx + 1 }} <span>{{ log.uptime }}秒</span></div>
          <div class="log-meta">峰值: {{ log.peak }} | 突变:{{ log.m }}‰</div>
        </div>
      </div>
    </div>
  </FloatingPanelGroup>
</template>

<style scoped>
.card-header h3 { color: #f8fafc; margin: 0 0 1rem 0; font-size: 0.95rem; font-weight: 700; }
.log-item { background: rgba(255,255,255,0.03); border-radius: 8px; padding: 0.6rem; border-left: 2px solid #6366f1; margin-bottom: 0.5rem; }
.log-header { display: flex; justify-content: space-between; font-size: 0.75rem; color: #f1f5f9; }
.log-meta { font-size: 0.65rem; color: #64748b; font-family: monospace; }
</style>
