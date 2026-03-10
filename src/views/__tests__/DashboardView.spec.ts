/**
 * views/__tests__/DashboardView.spec.ts
 * 
 * 仪表盘视图单元测试。
 * 验证静态卡片及关键统计指标的正确显示。
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DashboardView from '../DashboardView.vue'

describe('DashboardView (仪表盘) 测试', () => {
  it('应该正确渲染所有核心展示卡片', () => {
    const wrapper = mount(DashboardView)
    expect(wrapper.text()).toContain('系统性能')
    expect(wrapper.text()).toContain('实时可用性')
    expect(wrapper.text()).toContain('内存占用')
    // 验证特定统计数值
    expect(wrapper.find('.stat-value').text()).toBe('99.9%')
  })
})
