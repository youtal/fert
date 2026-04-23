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

/* 全局重置：统一盒模型，并默认隐藏文本插入光标，避免普通卡片文字被误认为可编辑区域。 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  caret-color: transparent;
  cursor: default;
}

html, body, #app {
  height: 100%;
  width: 100%;
  font-family: var(--font-main);
  background-color: #0f172a; 
  color: #f8fafc; 
  overflow: hidden;
}

/* 只有真实文本输入控件恢复输入光标与文本指针，Grid 的 seed 输入框依赖这条规则。 */
input[type='text'],
input[type='search'],
input[type='email'],
input[type='password'],
input[type='number'],
textarea,
[contenteditable='true'] {
  caret-color: auto;
  cursor: text;
}

/* 所有可点击控件继续使用手型指针，避免全局 default cursor 降低交互可发现性。 */
button,
input[type='range'],
[role='button'] {
  cursor: pointer;
}

button *,
[role='button'] * {
  cursor: inherit;
}
</style>
