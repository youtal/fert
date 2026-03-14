/**
 * ParticleView 集成测试。
 *
 * 这里通过 mock useEcosystem 隔离真实仿真，
 * 专注验证视图层对左右面板和 store 数据的编排是否正确。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ParticleView from '../ParticleView.vue'
import { createPinia, setActivePinia } from 'pinia'
import { useEcosystemStore } from '@/stores/ecosystem'
import * as useEcosystemComposable from '@/composables/useEcosystem'

// 模拟复杂的逻辑钩子，仅保留状态接口
vi.mock('@/composables/useEcosystem', () => ({
  useEcosystem: vi.fn(() => ({
    mouse: { x: 0, y: 0, active: false }
  }))
}))

describe('ParticleView (粒子演化视图) 测试', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('应该正确渲染 Canvas 画布和左右交互边栏', () => {
    const wrapper = mount(ParticleView)
    expect(wrapper.find('canvas').exists()).toBe(true)
    expect(wrapper.find('.interactive-sidebar.left').exists()).toBe(true)
    expect(wrapper.find('.interactive-sidebar.right').exists()).toBe(true)
  })

  it('点击图标时应能切换状态面板显示', async () => {
    const wrapper = mount(ParticleView)
    const statusTrigger = wrapper.find('.interactive-sidebar.left .icon-trigger')
    
    // 面板初始应为隐藏（通过 v-show 控制）
    expect(wrapper.find('.floating-panel.left-aligned').isVisible()).toBe(false)
    
    await statusTrigger.trigger('click')
    await new Promise(resolve => setTimeout(resolve, 0)) // 等待 Vue 异步更新
    
    // 验证激活样式是否应用
    expect(statusTrigger.classes()).toContain('active-glow')
    
    // 验证面板 style 是否已移除 display: none
    const panel = wrapper.find('.floating-panel.left-aligned')
    expect(panel.attributes('style')).not.toContain('display: none')
  })

  it('应该能实时展示来自 store 的统计数据', async () => {
    const store = useEcosystemStore()
    // 手动注入测试数据
    store.state.preys = 123
    store.state.predators = 5
    store.state.uptime = 45
    
    const wrapper = mount(ParticleView)
    // 展开状态面板以使统计项可寻址
    await wrapper.find('.interactive-sidebar.left .icon-trigger').trigger('click')
    
    expect(wrapper.text()).toContain('123')
    expect(wrapper.text()).toContain('5')
    expect(wrapper.text()).toContain('45s')
  })

  it('拖动滑块时应同步更新 store 的演化参数', async () => {
    const store = useEcosystemStore()
    const wrapper = mount(ParticleView)
    
    // 展开控制面板
    await wrapper.find('.interactive-sidebar.right .icon-trigger').trigger('click')
    
    // 查找第一个滑块（通常是繁衍周期 n）
    const nSlider = wrapper.find('input[type="range"]') 
    await nSlider.setValue(10)
    
    // 验证 store 参数是否同步变更
    expect(store.params.n).toBe(10)
  })

  it('当历史日志存在时应渲染历史记录列表', async () => {
    const store = useEcosystemStore()
    store.addLog({ id: 1, uptime: 10, peak: 100, n: 8, m: 4, k: 6 })
    
    const wrapper = mount(ParticleView)
    // 获取左侧第二个触发图标（对应历史记录）
    const historyTrigger = wrapper.findAll('.interactive-sidebar.left .icon-trigger')[1]
    expect(historyTrigger).toBeDefined()
    
    if (historyTrigger) {
      await historyTrigger.trigger('click')
      expect(wrapper.text()).toContain('纪元 -1')
      expect(wrapper.text()).toContain('10秒')
    }
  })
})
