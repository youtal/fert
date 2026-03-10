<script setup lang="ts">
/**
 * ParticleView.vue
 * 
 * 粒子演化仿真主视图。
 * 核心职责：
 * 1. 承载 Canvas 渲染容器。
 * 2. 提供侧边浮动交互面板，用于实时调参及数据监控。
 * 3. 桥接鼠标交互事件至物理引擎。
 */
import { ref } from 'vue'
import { useEcosystemStore } from '@/stores/ecosystem'
import { useEcosystem } from '@/composables/useEcosystem'

// DOM 引用：Canvas 绘图区域及其父容器（用于自适应尺寸计算）
const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)

const store = useEcosystemStore()
// 初始化物理仿真钩子，导出鼠标控制接口
const { mouse } = useEcosystem(canvasRef, containerRef)

/**
 * 交互面板状态管理
 * 采用独立的显隐控制，支持点击展开或悬停暂显
 */
const isStatusExpanded = ref(false)
const isStatusHovered = ref(false)
const isHistoryExpanded = ref(false)
const isHistoryHovered = ref(false)
const isControlExpanded = ref(false)
const isControlHovered = ref(false)

/**
 * 处理鼠标移动事件
 * 将屏幕坐标转换为 Canvas 内部坐标并激活交互引力
 */
const onMouseMove = (e: MouseEvent) => {
  if (!canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  mouse.x = e.clientX - rect.left; mouse.y = e.clientY - rect.top
  mouse.active = true
}
</script>

<template>
  <div class="particle-view" ref="containerRef">
    
    <!-- 左侧交互面板：数据展示与历史记录 -->
    <div class="interactive-sidebar left">
      <!-- 演化状态面板：实时监控粒子数量及运行时间 -->
      <div class="panel-group" @mouseenter="isStatusHovered = true" @mouseleave="isStatusHovered = false">
        <div class="icon-trigger" :class="{ 'active-glow': isStatusExpanded }" @click="isStatusExpanded = !isStatusExpanded">
          <span class="icon">📊</span>
        </div>
        <Transition name="slide-fade" :style="{ '--offset': '-15px' }">
          <div class="floating-panel left-aligned" v-show="isStatusExpanded || isStatusHovered">
            <div class="glass-card">
              <div class="card-header"><h2>演化状态</h2></div>
              <div class="card-body">
                <!-- 运行状态标签 -->
                <div class="status-badge" :class="store.state.status === '运行中' ? 'running' : 'collapsed'">{{ store.state.status }}</div>
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

      <!-- 灭绝记录面板：仅在存在历史记录时显示 -->
      <div class="panel-group" v-if="store.historyLogs.length > 0" @mouseenter="isHistoryHovered = true" @mouseleave="isHistoryHovered = false">
        <div class="icon-trigger" :class="{ 'active-glow': isHistoryExpanded }" @click="isHistoryExpanded = !isHistoryExpanded">
          <span class="icon">📜</span>
        </div>
        <Transition name="slide-fade" :style="{ '--offset': '-15px' }">
          <div class="floating-panel left-aligned" v-show="isHistoryExpanded || isHistoryHovered">
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
    </div>

    <!-- 右侧交互面板：控制控制台 -->
    <div class="interactive-sidebar right">
      <div class="panel-group" @mouseenter="isControlHovered = true" @mouseleave="isControlHovered = false">
        <Transition name="slide-fade" :style="{ '--offset': '15px' }">
          <div class="floating-panel right-aligned" v-show="isControlExpanded || isControlHovered">
            <div class="glass-card control-card">
              <div class="card-header"><h3>演化控制台</h3></div>
              <!-- 繁衍周期调节 (n) -->
              <div class="slider-group">
                <div class="slider-info"><span>繁衍周期 (n)</span><span class="slider-val">{{ store.params.n }}s</span></div>
                <input type="range" v-model.number="store.params.n" min="2" max="15" step="1" class="neon-slider blue" />
              </div>
              <!-- 突变概率调节 (m) -->
              <div class="slider-group">
                <div class="slider-info"><span>突变概率 (m)</span><span class="slider-val pred-color">{{ store.params.m }}‰</span></div>
                <input type="range" v-model.number="store.params.m" min="0" max="20" step="1" class="neon-slider red" />
              </div>
              <!-- 捕食者死亡阈值调节 (k) -->
              <div class="slider-group">
                <div class="slider-info"><span>饥饿阈值 (k)</span><span class="slider-val">{{ store.params.k }}s</span></div>
                <input type="range" v-model.number="store.params.k" min="2" max="15" step="1" class="neon-slider purple" />
              </div>
              <!-- 粒子排斥力调节 -->
              <div class="slider-group">
                <div class="slider-info"><span>粒子间隙</span><span class="slider-val green-val">{{ store.params.minSpacing }}px</span></div>
                <input type="range" v-model.number="store.params.minSpacing" min="10" max="100" step="1" class="neon-slider green" />
              </div>
            </div>
          </div>
        </Transition>
        <div class="icon-trigger" :class="{ 'active-glow': isControlExpanded }" @click="isControlExpanded = !isControlExpanded">
          <span class="icon">⚙️</span>
        </div>
      </div>
    </div>

    <!-- 渲染层：承载高性能 WebGL 或 2D Canvas 绘图 -->
    <canvas ref="canvasRef" @mousemove="onMouseMove" @mouseleave="mouse.active = false"></canvas>
  </div>
</template>

<style scoped>
.particle-view {
  width: 100%; height: 100%;
  background: radial-gradient(circle at top right, #1e293b 0%, #09090b 100%);
  position: absolute; top: 0; left: 0; overflow: hidden;
}

canvas { display: block; width: 100%; height: 100%; cursor: crosshair; }

/* 交互面板基础布局 */
.interactive-sidebar {
  position: absolute; top: 1.5rem;
  display: flex; flex-direction: column; gap: 2.5rem;
  z-index: 30;
}
.interactive-sidebar.left { left: 1.5rem; }
.interactive-sidebar.right { right: 1.5rem; align-items: flex-end; }

.panel-group { position: relative; display: flex; align-items: flex-start; }

/* 图标触发器核心样式 */
.icon-trigger {
  width: 52px; height: 52px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 1.4rem; z-index: 32; user-select: none;
}
.icon-trigger:hover { background: rgba(255, 255, 255, 0.08); transform: scale(1.05); }

.active-glow {
  background: rgba(255, 255, 255, 0.12) !important;
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  border-color: rgba(99, 102, 241, 0.4);
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.2);
}

/* 浮动面板统一定位 */
.floating-panel { position: absolute; top: 0; width: 300px; z-index: 31; pointer-events: auto; }
.floating-panel.left-aligned { left: 64px; }
.floating-panel.right-aligned { right: 64px; }

/* 通用毛玻璃卡片 */
.glass-card {
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px; padding: 1.2rem;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
}

/* 合并后的平滑过渡动画 */
.slide-fade-enter-active, .slide-fade-leave-active { transition: all 0.3s ease-out; }
.slide-fade-enter-from, .slide-fade-leave-to { transform: translateX(var(--offset)); opacity: 0; }

/* 内部原子组件样式 */
.card-header h2, .card-header h3 { color: #f8fafc; margin: 0 0 1rem 0; font-size: 0.95rem; font-weight: 700; }
.status-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 0.7rem; font-weight: 700; margin-bottom: 0.75rem; text-transform: uppercase; }
.status-badge.running { background: rgba(16, 185, 129, 0.2); color: #10b981; }
.status-badge.collapsed { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
.stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.stat-item .label { font-size: 0.7rem; color: #94a3b8; display: block; }
.stat-item .value { font-size: 1.2rem; font-weight: 800; color: #e2e8f0; font-family: monospace; }
.pred-color { color: #ff3366 !important; }
.green-val { color: #10b981 !important; }
.log-item { background: rgba(255,255,255,0.03); border-radius: 8px; padding: 0.6rem; border-left: 2px solid #6366f1; margin-bottom: 0.5rem; }
.log-header { display: flex; justify-content: space-between; font-size: 0.75rem; color: #f1f5f9; }
.log-meta { font-size: 0.65rem; color: #64748b; font-family: monospace; }
.slider-group { margin-bottom: 1rem; }
.slider-info { display: flex; justify-content: space-between; font-size: 0.8rem; color: #cbd5e1; margin-bottom: 4px; }
.slider-val { background: rgba(255,255,255,0.1); padding: 1px 6px; border-radius: 4px; font-family: monospace; color: #38bdf8; }
input[type=range] { -webkit-appearance: none; width: 100%; background: transparent; height: 16px; outline: none; }
input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 4px; border-radius: 2px; }
input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 14px; width: 14px; border-radius: 50%; margin-top: -5px; cursor: pointer; border: 2px solid #fff; }
.neon-slider.blue::-webkit-slider-runnable-track { background: #3b82f6; }
.neon-slider.red::-webkit-slider-runnable-track { background: #ef4444; }
.neon-slider.purple::-webkit-slider-runnable-track { background: #8b5cf6; }
.neon-slider.green::-webkit-slider-runnable-track { background: #10b981; }
</style>
