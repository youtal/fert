/**
 * GridControlPanel 组件测试。
 *
 * 控制面板已从 GridView 中拆出，这里验证它仍然只做展示与事件转发：
 * 1. 复用共享浮层壳。
 * 2. 种子输入、速度滑块、冻结与重置动作都向父级发出事件。
 */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import GridControlPanel from '@/components/grid/GridControlPanel.vue'

const mountPanel = () => mount(GridControlPanel, {
  props: {
    seed: '0000000000000001',
    seedDigits: 16,
    isSeedFrozen: false,
    animationSpeed: 140,
  },
})

describe('GridControlPanel 点阵控制面板', () => {
  it('应该复用共享浮层结构并渲染控制项', () => {
    const wrapper = mountPanel()

    expect(wrapper.find('.panel-group').exists()).toBe(true)
    expect(wrapper.find('.floating-panel.right-aligned').exists()).toBe(true)
    expect(wrapper.find('input[type="text"]').attributes('maxlength')).toBe('16')
    expect(wrapper.text()).toContain('折线生长')
    expect(wrapper.text()).toContain('重置')
  })

  it('应该将用户操作转发给父组件', async () => {
    const wrapper = mountPanel()

    await wrapper.find('input[type="text"]').setValue('1234')
    await wrapper.find('input[type="text"]').trigger('change')
    await wrapper.find('input[type="text"]').trigger('blur')
    await wrapper.find('input[type="range"]').setValue(220)
    await wrapper.find('.icon-button').trigger('click')
    await wrapper.find('.reset-button').trigger('click')

    expect(wrapper.emitted('update:seed')?.[0]).toEqual(['1234'])
    expect(wrapper.emitted('replay')).toBeTruthy()
    expect(wrapper.emitted('apply-seed')).toBeTruthy()
    expect(wrapper.emitted('update:animationSpeed')?.[0]).toEqual([220])
    expect(wrapper.emitted('toggle-freeze')).toBeTruthy()
    expect(wrapper.emitted('reset')).toBeTruthy()
  })
})
