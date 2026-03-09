<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const props = defineProps<{
  isCollapsed: boolean
}>()

const emit = defineEmits(['toggle'])
const router = useRouter()
const route = useRoute()

const isLogoHovered = ref(false)

const handleLogoClick = () => {
  if (props.isCollapsed) {
    emit('toggle')
  }
}

const navigate = (path: string) => {
  router.push(path)
}
</script>

<template>
  <aside class="sidebar" :class="{ 'is-collapsed': isCollapsed }">
    <div class="sidebar-header">
      <div 
        class="logo-container" 
        :class="{ 'clickable': isCollapsed }"
        @click="handleLogoClick"
        @mouseenter="isLogoHovered = true"
        @mouseleave="isLogoHovered = false"
      >
        <div class="logo-icon-wrapper">
          <img v-if="isCollapsed && isLogoHovered" src="/src/icons/more-light-mode.svg" class="icon-img" alt="更多" />
          <span v-else class="logo-text-icon">F</span>
        </div>
        <span v-if="!isCollapsed" class="logo-text">Fret 框架</span>
      </div>
      
      <button v-if="!isCollapsed" class="collapse-btn" @click="$emit('toggle')" title="折叠">
        <span class="btn-arrow">←</span>
      </button>
    </div>

    <nav class="nav-menu">
      <div class="nav-item" :class="{ active: route.path === '/' }" @click="navigate('/')">
        <img src="/src/icons/home-light-mode.svg" class="nav-icon" />
        <span v-if="!isCollapsed">控制台</span>
      </div>
      <div class="nav-item" :class="{ active: route.path === '/particles' }" @click="navigate('/particles')">
        <img src="/src/icons/Particle-light-mode.svg" class="nav-icon" />
        <span v-if="!isCollapsed">粒子演化</span>
      </div>
      <div class="nav-item">
        <img src="/src/icons/analysis-light-mode.svg" class="nav-icon" />
        <span v-if="!isCollapsed">数据分析</span>
      </div>
      <div class="nav-item">
        <img src="/src/icons/setting-light-mode.svg" class="nav-icon" />
        <span v-if="!isCollapsed">系统设置</span>
      </div>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 400px;
  min-width: 400px;
  background: white;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.02);
  overflow: hidden;
  flex-shrink: 0;
}

.is-collapsed {
  width: 80px !important;
  min-width: 80px !important;
  max-width: 80px !important;
}

.sidebar-header {
  padding: 0 1.5rem;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f1f5f9;
}

.is-collapsed .sidebar-header {
  justify-content: center;
  padding: 0;
  height: 90px;
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.2s;
  padding: 8px;
}

.logo-icon-wrapper {
  width: 42px;
  height: 42px;
  background: linear-gradient(180deg, #6366f1 0%, #4f46e5 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.logo-text-icon {
  color: white;
  font-weight: 800;
  font-size: 1.4rem;
}

.nav-menu {
  padding: 1.5rem 0.75rem;
  flex: 1;
}

.is-collapsed .nav-menu {
  padding: 1.5rem 0;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 0.85rem 1.25rem;
  margin-bottom: 0.5rem;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  color: #64748b;
  gap: 1.25rem;
}

.is-collapsed .nav-item {
  justify-content: center;
  padding: 1.2rem 0;
  margin: 0 8px 8px 8px;
}

.nav-item.active {
  background: #eff6ff;
  color: #6366f1;
  font-weight: 600;
}

.nav-icon {
  width: 24px;
  height: 24px;
  opacity: 0.6;
}
</style>
