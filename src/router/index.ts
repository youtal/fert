/**
 * router/index.ts
 *
 * 路由层只声明导航映射，不承载权限、懒加载或数据预取逻辑。
 * 当前项目的三张主页面都依赖 KeepAlive 保留运行时状态。
 */
import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '@/views/DashboardView.vue'
import ParticleView from '@/views/ParticleView.vue'
import SudokuView from '@/views/SudokuView.vue'
import GridView from '@/views/GridView.vue'

/**
 * 路由表保持显式静态导入：
 * 当前页面数量很少，而 KeepAlive 又要求实例生命周期连续，没必要为了懒加载拆散语义。
 */
const router = createRouter({
  // 使用 HTML5 历史模式，保证地址栏与页面状态同步。
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
    },
    {
      path: '/sudoku',
      name: 'sudoku',
      component: SudokuView,
    },
    {
      path: '/grid',
      name: 'grid',
      component: GridView,
    }
  ],
})

export default router
