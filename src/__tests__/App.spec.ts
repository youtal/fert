/**
 * App.spec.ts
 * 
 * 根组件 App 的单元测试。
 * 主要验证应用挂载逻辑及基础布局组件的渲染。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '../App.vue'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'

// 模拟路由配置
// 使用简单的内存路由以避免测试中的导航副作用
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div>Home</div>' } },
    { path: '/particles', component: { template: '<div>Particles</div>' } }
  ]
})

describe('App 组件测试', () => {
  beforeEach(() => {
    // 每次测试前重置 Pinia 状态
    setActivePinia(createPinia())
  })

  it('应该能够成功挂载', async () => {
    // 导航到初始路径并等待路由就绪
    router.push('/')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [router]
      }
    })
    
    // 验证侧边栏组件是否渲染，以此判断 MainLayout 布局是否生效
    expect(wrapper.findComponent({ name: 'Sidebar' }).exists()).toBe(true)
  })
})
