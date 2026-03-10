<script setup lang="ts">
/**
 * App.vue
 * 
 * 应用程序根组件。
 * 负责全局布局的挂载、路由视图的调度以及全局基础样式的定义。
 * 在此项目中，它将所有路由内容包裹在 MainLayout 容器内，以保持导航栏的一致性。
 */
import MainLayout from './layouts/MainLayout.vue'
import { RouterView } from 'vue-router'
</script>

<template>
  <!-- 统一采用 MainLayout 作为基础布局容器，内含侧边栏和主内容区 -->
  <MainLayout>
    <!-- 路由渲染入口：根据当前路径加载对应的 View 组件（如 Dashboard 或 ParticleView） -->
    <RouterView />
  </MainLayout>
</template>

<style>
/**
 * 全局样式基础定义
 */
:root {
  /* 定义系统主字体栈，优先使用 Inter 字体 */
  --font-main: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  width: 100%;
  font-family: var(--font-main);
  /* 采用深色模式背景 (Slate 950) */
  background-color: #0f172a; 
  /* 浅色文字颜色以确保高对比度 */
  color: #f8fafc; 
  /* 禁用全局滚动，内部滚动由各视图组件自行处理 */
  overflow: hidden;
}
</style>
