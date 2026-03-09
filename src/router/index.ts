import { createRouter, createWebHistory } from 'vue-router'
import ParticleView from '../views/ParticleView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: () => import('../App.vue'), // 临时，稍后修改 App.vue
    },
    {
      path: '/particles',
      name: 'particles',
      component: ParticleView,
    }
  ],
})

export default router
