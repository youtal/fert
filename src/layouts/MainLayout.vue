<script setup lang="ts">
/**
 * MainLayout.vue
 * 
 * 应用程序主布局组件。
 * 职责：
 * 1. 组合全局侧边栏导航。
 * 2. 提供响应式的内容展示区域，承载不同的 View 视图组件。
 * 3. 管理全局布局相关的 UI 状态（如侧边栏的展开/折叠）。
 */
import { ref } from 'vue'
import Sidebar from '@/components/Sidebar.vue'

// 局部响应式状态：管理侧边栏的折叠状态
// 默认折叠以提供最大化内容展示空间
const isSidebarCollapsed = ref(true)

/**
 * 切换侧边栏状态的开关函数
 */
const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}
</script>

<template>
  <div class="main-layout">
    <!-- 侧边栏导航：传入折叠状态并监听切换请求 -->
    <Sidebar :is-collapsed="isSidebarCollapsed" @toggle="toggleSidebar" />
    
    <!-- 主内容区：使用 <main> 语义化标签 -->
    <main class="content-body">
      <!-- Slot 插槽：用于渲染路由匹配到的视图组件 -->
      <slot></slot>
    </main>
  </div>
</template>

<style scoped>
.main-layout {
  display: flex;
  height: 100vh; /* 撑满屏幕高度 */
  width: 100vw;  /* 撑满屏幕宽度 */
  overflow: hidden; /* 防止出现意外的全局滚动条 */
  background-color: #0f172a; /* 使用深蓝色 (Slate 900) 作为应用底色 */
}

.content-body {
  flex: 1; /* 占据侧边栏之外的剩余全部空间 */
  position: relative;
  overflow-y: auto; /* 仅在内容溢出时允许垂直滚动 */
  overflow-x: hidden;
  /* 平滑过渡背景色或可能的布局位移 */
  transition: all 0.3s; 
}
</style>
