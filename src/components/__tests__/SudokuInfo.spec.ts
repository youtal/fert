import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import SudokuInfo from '../sudoku/SudokuInfo.vue'

describe('SudokuInfo', () => {
  // 信息面板的设计与生态系统浮层保持一致：默认折叠、悬浮预览、点击锁定。
  it('两个面板默认都为折叠状态', () => {
    const wrapper = mount(SudokuInfo, {
      props: { difficulty: 40 },
    })

    const panels = wrapper.findAll('.floating-panel')
    expect(panels).toHaveLength(2)
    expect(panels[0]?.isVisible()).toBe(false)
    expect(panels[1]?.isVisible()).toBe(false)
  })

  it('悬浮到图标区域时应临时展开，移出后收起', async () => {
    const wrapper = mount(SudokuInfo, {
      props: { difficulty: 40 },
    })

    const leftGroup = wrapper.find('.interactive-sidebar.left .panel-group')
    const leftPanel = wrapper.find('.interactive-sidebar.left .floating-panel')

    expect(leftPanel.attributes('style')).toContain('display: none')

    await leftGroup.trigger('mouseenter')
    await nextTick()
    expect(leftPanel.attributes('style') ?? '').not.toContain('display: none')

    await leftGroup.trigger('mouseleave')
    await nextTick()
    expect(leftPanel.attributes('style')).toContain('display: none')
  })

  it('点击图标后应切换为常驻展开状态', async () => {
    const wrapper = mount(SudokuInfo, {
      props: { difficulty: 40 },
    })

    const rightIcon = wrapper.find('.interactive-sidebar.right .icon-trigger')
    const rightPanel = wrapper.find('.interactive-sidebar.right .floating-panel')

    expect(rightPanel.attributes('style')).toContain('display: none')

    await rightIcon.trigger('click')
    await nextTick()
    expect(rightPanel.attributes('style') ?? '').not.toContain('display: none')

    await wrapper.find('.interactive-sidebar.right .panel-group').trigger('mouseleave')
    await nextTick()
    expect(rightPanel.attributes('style') ?? '').not.toContain('display: none')

    await rightIcon.trigger('click')
    await nextTick()
    expect(rightPanel.attributes('style')).toContain('display: none')
  })
})
