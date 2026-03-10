/**
 * main.ts
 * 
 * 应用程序入口文件。
 * 核心职责：
 * 1. 创建 Vue 应用实例。
 * 2. 初始化并注入全局状态管理插件 (Pinia)。
 * 3. 初始化并注入路由插件 (Vue Router)。
 * 4. 将应用挂载至宿主 HTML 页面。
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

// 创建 Vue 应用实例，入口组件为 App.vue
const app = createApp(App)

// 注册 Pinia 插件，实现全局响应式状态共享
app.use(createPinia())

// 注册 Vue Router，根据 URL 地址驱动视图组件切换
app.use(router)

// 执行挂载：将 Vue 生成的 DOM 结构插入 index.html 中 id 为 'app' 的元素内
app.mount('#app')
