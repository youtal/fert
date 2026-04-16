/**
 * DashboardView 测试。
 *
 * 默认首页现在是项目介绍页，因此这里关注：
 * 1. 主标题与说明文案是否存在。
 * 2. 瀑布流卡片是否按预期渲染。
 * 3. 关键介绍区块是否未被误删。
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DashboardView from '../DashboardView.vue'

describe('DashboardView (项目介绍页) 测试', () => {
  it('应该渲染主标题、瀑布流卡片和关键项目介绍内容', () => {
    const wrapper = mount(DashboardView)

    expect(wrapper.text()).toContain('Fret 项目介绍')
    expect(wrapper.text()).toContain('生态系统模块')
    expect(wrapper.text()).toContain('Sudoku 模块')
    expect(wrapper.text()).toContain('运行时约定')
    expect(wrapper.text()).toContain('开发入口')

    expect(wrapper.find('.waterfall').exists()).toBe(true)
    expect(wrapper.findAll('.intro-card').length).toBeGreaterThanOrEqual(6)
    expect(wrapper.find('.metric-value').text()).toBe('Pass')
  })

  it('不应再渲染旧版仪表盘文案', () => {
    const wrapper = mount(DashboardView)

    expect(wrapper.text()).not.toContain('实时可用性')
    expect(wrapper.text()).not.toContain('系统性能')
    expect(wrapper.text()).not.toContain('内存占用')
  })

  it('应该渲染开发命令卡片中的关键命令', () => {
    const wrapper = mount(DashboardView)
    const commands = wrapper.findAll('.command-list code').map((node) => node.text())

    expect(commands).toContain('npm run dev')
    expect(commands).toContain('npm run test:unit -- --run')
    expect(commands).toContain('npm run type-check')
    expect(commands).toContain('npm run build')
  })

})
