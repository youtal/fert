<script setup lang="ts">
/**
 * Sidebar.vue
 *
 * 全局导航组件，负责：
 * 1. 呈现当前路由状态。
 * 2. 提供展开 / 折叠能力。
 * 3. 在折叠状态下提供图标 + Tooltip 的低占位导航方式。
 */
import { useRouter, useRoute } from 'vue-router'
import { ref } from 'vue'

const props = defineProps<{ isCollapsed: boolean }>()
const emit = defineEmits(['toggle'])

const router = useRouter()
const route = useRoute()
// 折叠状态下仅在 hover 时切换 Logo 图标，避免常态视觉噪音。
const isLogoHovered = ref(false)

type RoutePath = '/' | '/particles' | '/sudoku'

/**
 * 折叠状态下点击 Logo 代表“展开导航”，
 * 展开状态下 Logo 只承担品牌展示，不重复绑定其它动作。
 */
const handleLogoClick = () => {
  if (props.isCollapsed) emit('toggle')
}

/**
 * 跳转到目标页面。
 * 这里使用受限联合类型，避免模板里写出未注册路由。
 */
const navigate = (path: RoutePath) => {
  router.push(path)
}
</script>

<template>
  <aside class="sidebar" :class="{ 'is-collapsed': isCollapsed }">
    <div class="sidebar-header">
      <div 
        class="logo-container" 
        @click="handleLogoClick"
        @mouseenter="isLogoHovered = true"
        @mouseleave="isLogoHovered = false"
      >
        <div class="icon-fixed-wrapper">
          <div class="logo-icon-wrapper">
            <img v-if="isCollapsed && isLogoHovered" src="@/icons/more-dark-mode.svg" class="icon-img" alt="More" />
            <span v-else class="logo-text-icon">F</span>
          </div>
        </div>
        <div class="text-container" :class="{ 'hidden': isCollapsed }">
          <span class="logo-text">Fret 框架</span>
        </div>
      </div>
      
      <!-- 展开状态下才显示显式折叠按钮，降低视觉噪音 -->
      <button v-if="!isCollapsed" class="collapse-btn" @click="$emit('toggle')">←</button>
    </div>

    <nav class="nav-menu">
      <div class="nav-item" :class="{ active: route.path === '/' }" @click="navigate('/')" data-tooltip="控制台">
        <div class="icon-fixed-wrapper">
          <img src="@/icons/home-dark-mode.svg" class="nav-icon" alt="Home" />
        </div>
        <div class="text-container" :class="{ 'hidden': isCollapsed }">
          <span class="nav-text">控制台</span>
        </div>
      </div>
      
      <div class="nav-item" :class="{ active: route.path === '/particles' }" @click="navigate('/particles')" data-tooltip="粒子演化">
        <div class="icon-fixed-wrapper">
          <img src="@/icons/Particle-dark-mode.svg" class="nav-icon" alt="Particles" />
        </div>
        <div class="text-container" :class="{ 'hidden': isCollapsed }">
          <span class="nav-text">粒子演化</span>
        </div>
      </div>

      <div class="nav-item" :class="{ active: route.path === '/sudoku' }" @click="navigate('/sudoku')" data-tooltip="数独解算">
        <div class="icon-fixed-wrapper">
          <img src="@/icons/sudoku-dark-mode.svg" class="nav-icon" alt="Sudoku" />
        </div>
        <div class="text-container" :class="{ 'hidden': isCollapsed }">
          <span class="nav-text">数独解算</span>
        </div>
      </div>

      <div class="nav-item disabled" data-tooltip="系统设置">
        <div class="icon-fixed-wrapper">
          <img src="@/icons/setting-dark-mode.svg" class="nav-icon" alt="Settings" />
        </div>
        <div class="text-container" :class="{ 'hidden': isCollapsed }">
          <span class="nav-text">系统设置</span>
        </div>
      </div>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 260px; height: 100vh;
  background: #0f172a; border-right: 1px solid rgba(255, 255, 255, 0.05);
  display: flex; flex-direction: column;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 100; position: relative;
  /* 移除 overflow: hidden 保证 Tooltip 显示 */
}

.is-collapsed { width: 72px; }

.sidebar-header {
  height: 80px; display: flex; align-items: center; padding: 0 1rem;
}

.logo-container { display: flex; align-items: center; cursor: pointer; }

/* 固定图标容器：无论侧边栏如何折叠，图标相对于左侧边缘的位置保持不变 */
.icon-fixed-wrapper {
  width: 40px; height: 40px;
  display: flex; align-items: center; justify-content: center;
  margin-left: 4px; /* 居中于 72px 侧边栏的 40px 容器 */
}

.logo-icon-wrapper {
  width: 40px; height: 40px; background: linear-gradient(180deg, #818cf8 0%, #6366f1 100%);
  border-radius: 10px; display: flex; align-items: center; justify-content: center;
  color: white; font-weight: 800;
}

.text-container {
  margin-left: 1rem; transition: opacity 0.3s, transform 0.3s;
  opacity: 1; transform: translateX(0); white-space: nowrap;
}
.text-container.hidden { opacity: 0; transform: translateX(-10px); pointer-events: none; }

.nav-menu { padding: 1rem 0.75rem; flex: 1; }
.nav-item {
  display: flex; align-items: center; padding: 0.75rem 0.5rem;
  margin-bottom: 0.5rem; border-radius: 12px; cursor: pointer;
  transition: background 0.2s, color 0.2s; color: #94a3b8;
  position: relative;
}
.nav-item:hover { background: rgba(255, 255, 255, 0.05); color: #f1f5f9; }
.nav-item.active { background: rgba(99, 102, 241, 0.15); color: #818cf8; }
.nav-item.disabled { opacity: 0.2; cursor: not-allowed; }

.nav-icon { width: 22px; height: 22px; }

/* Tooltip 增强逻辑 */
.is-collapsed .nav-item:hover::after {
  content: attr(data-tooltip);
  position: absolute; left: 100%; top: 50%; transform: translateY(-50%);
  margin-left: 15px; padding: 6px 12px;
  background: #1e293b; color: white; font-size: 0.8rem; font-weight: 500;
  border-radius: 6px; white-space: nowrap;
  pointer-events: none; z-index: 1000;
  box-shadow: 0 4px 20px rgba(0,0,0,0.5);
  border: 1px solid rgba(255,255,255,0.1);
}

.collapse-btn {
  background: none; border: none; color: #64748b; margin-left: auto;
  cursor: pointer; font-size: 1.2rem;
}
</style>
