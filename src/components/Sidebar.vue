<script setup lang="ts">
/**
 * Sidebar.vue
 * 
 * 系统导航侧边栏组件。
 * 核心功能：
 * 1. 提供全局路由导航入口。
 * 2. 支持折叠/展开状态切换，优化屏幕利用率。
 * 3. 采用深色模式视觉设计 (Dark Mode)。
 */
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'

// 定义属性：控制侧边栏是否处于折叠状态
const props = defineProps<{ isCollapsed: boolean }>()
// 定义事件：通知父组件切换折叠状态
const emit = defineEmits(['toggle'])

const router = useRouter()
const route = useRoute()
// 跟踪 Logo 区域的悬停状态，用于显示交互反馈
const isLogoHovered = ref(false)

/**
 * 处理 Logo 点击事件
 * 若当前处于折叠状态，点击 Logo 区域将触发展开操作
 */
const handleLogoClick = () => {
  if (props.isCollapsed) emit('toggle')
}

/**
 * 路由跳转逻辑
 * @param path 目标路由路径
 */
const navigate = (path: string) => {
  router.push(path)
}
</script>

<template>
  <aside class="sidebar" :class="{ 'is-collapsed': isCollapsed }">
    <!-- 侧边栏头部：包含 Logo 和折叠控制按钮 -->
    <div class="sidebar-header">
      <div 
        class="logo-container" 
        :class="{ 'clickable': isCollapsed }"
        @click="handleLogoClick"
        @mouseenter="isLogoHovered = true"
        @mouseleave="isLogoHovered = false"
      >
        <div class="logo-icon-wrapper">
          <!-- 折叠且悬停时，图标变换为“更多”样式 -->
          <img v-if="isCollapsed && isLogoHovered" src="@/icons/more-dark-mode.svg" class="icon-img" alt="More" />
          <span v-else class="logo-text-icon">F</span>
        </div>
        <span v-if="!isCollapsed" class="logo-text">Fret 框架</span>
      </div>
      
      <!-- 仅在展开模式下显示的折叠按钮 -->
      <button v-if="!isCollapsed" class="collapse-btn" @click="$emit('toggle')" title="折叠导航">
        <span class="btn-arrow">←</span>
      </button>
    </div>

    <!-- 导航菜单区域 -->
    <nav class="nav-menu">
      <!-- 控制台入口 -->
      <div class="nav-item" :class="{ active: route.path === '/' }" @click="navigate('/')">
        <img src="@/icons/home-dark-mode.svg" class="nav-icon" alt="Home" />
        <span v-if="!isCollapsed">控制台</span>
      </div>
      
      <!-- 粒子演化模拟入口 -->
      <div class="nav-item" :class="{ active: route.path === '/particles' }" @click="navigate('/particles')">
        <img src="@/icons/Particle-dark-mode.svg" class="nav-icon" alt="Particles" />
        <span v-if="!isCollapsed">粒子演化</span>
      </div>

      <!-- 暂未开放的功能项：样式设为禁用 -->
      <div class="nav-item disabled">
        <img src="@/icons/analysis-dark-mode.svg" class="nav-icon" alt="Analysis" />
        <span v-if="!isCollapsed">数据分析</span>
      </div>
      
      <div class="nav-item disabled">
        <img src="@/icons/setting-dark-mode.svg" class="nav-icon" alt="Settings" />
        <span v-if="!isCollapsed">系统设置</span>
      </div>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 280px;
  background: #1e293b; /* Slate 800 */
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 10px 0 30px rgba(0, 0, 0, 0.2);
  z-index: 100;
}

.is-collapsed { 
  width: 75px; 
  min-width: 75px;
  max-width: 75px;
}

.sidebar-header {
  padding: 0 1.5rem; height: 80px;
  display: flex; align-items: center; justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.is-collapsed .sidebar-header { justify-content: center; padding: 0; }

.logo-container { display: flex; align-items: center; gap: 0.8rem; cursor: default; }
.logo-container.clickable { cursor: pointer; }

.logo-icon-wrapper {
  width: 40px; height: 40px;
  background: linear-gradient(180deg, #818cf8 0%, #6366f1 100%);
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  color: white; font-weight: 800; font-size: 1.2rem;
}

.logo-text { font-weight: 700; color: #f8fafc; font-size: 1.1rem; }

.nav-menu { padding: 1rem 0.75rem; flex: 1; }
.is-collapsed .nav-menu { padding: 1rem 0; }

.nav-item {
  display: flex; align-items: center; gap: 1rem;
  padding: 0.75rem 1rem; margin-bottom: 0.4rem;
  border-radius: 10px; cursor: pointer;
  transition: all 0.2s; color: #94a3b8; /* Slate 400 文字颜色 */
}

.is-collapsed .nav-item { justify-content: center; margin: 0 8px 8px; }

.nav-item:hover { background: rgba(255, 255, 255, 0.03); color: #e2e8f0; }
.nav-item.active { background: rgba(99, 102, 241, 0.1); color: #818cf8; font-weight: 600; }
.nav-item.disabled { opacity: 0.3; cursor: not-allowed; }

.nav-icon { width: 20px; height: 20px; }

.collapse-btn {
  background: none; border: none; color: #64748b;
  cursor: pointer; font-size: 1.2rem; transition: color 0.2s;
}
.collapse-btn:hover { color: #818cf8; }
</style>
