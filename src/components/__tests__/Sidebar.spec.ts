/**
 * components/__tests__/Sidebar.spec.ts
 * 
 * 侧边栏组件单元测试。
 * 验证折叠状态切换、Logo 点击反馈及路由导航触发逻辑。
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Sidebar from '../Sidebar.vue'
import { useRouter, useRoute } from 'vue-router'

// 模拟路由功能
vi.mock('vue-router', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn()
  })),
  useRoute: vi.fn(() => ({
    path: '/'
  }))
}))

describe('Sidebar (侧边栏) 组件测试', () => {
  it('展开状态下应正确渲染 Logo 文字', () => {
    const wrapper = mount(Sidebar, {
      props: { isCollapsed: false }
    })
    expect(wrapper.text()).toContain('Fret 框架')
    expect(wrapper.find('.logo-text').exists()).toBe(true)
  })

  it('折叠状态下不应显示 Logo 文字', () => {
    const wrapper = mount(Sidebar, {
      props: { isCollapsed: true }
    })
    expect(wrapper.text()).not.toContain('Fret 框架')
    expect(wrapper.find('.logo-text').exists()).toBe(false)
  })

  it('点击折叠按钮时应触发 toggle 事件', async () => {
    const wrapper = mount(Sidebar, {
      props: { isCollapsed: false }
    })
    await wrapper.find('.collapse-btn').trigger('click')
    expect(wrapper.emitted('toggle')).toBeTruthy()
  })

  it('折叠状态下点击 Logo 区域应触发 toggle 事件', async () => {
    const wrapper = mount(Sidebar, {
      props: { isCollapsed: true }
    })
    await wrapper.find('.logo-container').trigger('click')
    expect(wrapper.emitted('toggle')).toBeTruthy()
  })

  it('点击导航项时应调用 router.push 进行页面跳转', async () => {
    const pushMock = vi.fn()
    vi.mocked(useRouter).mockReturnValue({ push: pushMock } as any)
    
    const wrapper = mount(Sidebar, {
      props: { isCollapsed: false }
    })
    
    const navItems = wrapper.findAll('.nav-item')
    // 索引 1 对应的项通常是“粒子演化”
    const particleNavItem = navItems[1]
    if (particleNavItem) {
      await particleNavItem.trigger('click')
      expect(pushMock).toHaveBeenCalledWith('/particles')
    }
  })
})
