<script setup lang="ts">
/**
 * MainLayout.vue
 *
 * 主布局负责统一应用的空间结构。
 * 这里维护的状态只有布局级 UI 状态，例如侧边栏折叠与展开；
 * 业务状态仍然由各自模块的 composable / store 负责。
 */
import { ref } from 'vue'
import Sidebar from '@/components/Sidebar.vue'

// 默认折叠，让首次进入时的内容区域尽量完整。
const isSidebarCollapsed = ref(true)

/**
 * 切换侧边栏状态。
 * 该方法只影响布局，不应触发业务逻辑分支。
 */
const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}
</script>

<template>
  <div class="main-layout">
    <!-- 侧边栏导航：所有 view 共用同一套导航上下文 -->
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
