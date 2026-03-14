/**
 * DashboardView 测试。
 *
 * 由于该页面当前是静态说明页，
 * 所以测试目标是防止展示文案和关键卡片结构被误删。
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
