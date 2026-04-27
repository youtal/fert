/**
 * BaseCard 组件测试。
 *
 * BaseCard 是无样式承载模板，测试重点是确认标签和 class 透传稳定，
 * 让后续 view 新增卡片时可以复用同一个结构入口。
 */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseCard from '@/components/shared/BaseCard.vue'

describe('BaseCard 通用卡片模板', () => {
  it('应该按指定标签渲染并保留传入 class', () => {
    const wrapper = mount(BaseCard, {
      props: {
        as: 'article',
      },
      attrs: {
        class: 'intro-card tone-feature',
      },
      slots: {
        default: '<h2>Reusable Card</h2>',
      },
    })

    expect(wrapper.element.tagName).toBe('ARTICLE')
    expect(wrapper.classes()).toContain('intro-card')
    expect(wrapper.classes()).toContain('tone-feature')
    expect(wrapper.text()).toContain('Reusable Card')
  })
})
