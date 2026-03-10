/**
 * router/index.ts
 * 
 * 路由配置文件。
 * 定义了控制台与粒子演化的导航映射。
 */
import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '@/views/DashboardView.vue'
import ParticleView from '@/views/ParticleView.vue'

const router = createRouter({
  // 使用 HTML5 历史模式
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
    },
    {
      path: '/particles',
      name: 'particles',
      component: ParticleView,
    }
  ],
})

export default router
