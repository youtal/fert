<script setup lang="ts">
/**
 * App.vue
 * 
 * 应用程序根组件。
 */
import MainLayout from './layouts/MainLayout.vue'
import { RouterView } from 'vue-router'
</script>

<template>
  <MainLayout>
    <router-view v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" />
      </keep-alive>
    </router-view>
  </MainLayout>
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
