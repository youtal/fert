<script setup lang="ts">
/**
 * App.vue
 *
 * 根组件只负责两件事：
 * 1. 挂载全局布局。
 * 2. 通过 KeepAlive 维持各个 view 的会话级连续状态。
 *
 * 这里不放业务状态，避免根组件变成跨模块逻辑入口。
 */
import MainLayout from './layouts/MainLayout.vue'
import AppNotifications from './components/AppNotifications.vue'
import { RouterView } from 'vue-router'
</script>

<template>
  <MainLayout>
    <!-- RouterView + KeepAlive 组合保证视图切换后实例仍然保留 -->
    <router-view v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" />
      </keep-alive>
    </router-view>
  </MainLayout>
  <AppNotifications />
</template>

<style>
:root {
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
  background-color: #0f172a; 
  color: #f8fafc; 
  overflow: hidden;
}
</style>
