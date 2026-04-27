/**
 * GridView 测试。
 *
 * 点阵本身由 Canvas 绘制，测试侧重视图装配与固定规格展示，
 * 避免把像素级绘制细节绑定到 jsdom 环境。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import GridView from '../GridView.vue'

const contextMock = {
  setTransform: vi.fn(),
  clearRect: vi.fn(),
  createRadialGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  arc: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  fill: vi.fn(),
}

let queuedFrames: FrameRequestCallback[] = []

describe('GridView (二维点阵视图) 测试', () => {
  beforeEach(() => {
    queuedFrames = []
    vi.clearAllMocks()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(contextMock as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 900,
      height: 700,
      top: 0,
      left: 0,
      right: 900,
      bottom: 700,
      x: 0,
      y: 0,
      toJSON: vi.fn(),
    })
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      queuedFrames.push(callback)
      return queuedFrames.length
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  const flushFrame = () => {
    const callback = queuedFrames.shift()
    callback?.(0)
  }

  it('应该渲染 150 x 150 点阵画布并移除信息卡片', () => {
    const wrapper = mount(GridView)

    expect(wrapper.find('canvas.grid-canvas').exists()).toBe(true)
    expect(wrapper.attributes('aria-label')).toContain('150 乘 150')
    expect(wrapper.attributes('aria-label')).toContain('22500')
    expect(wrapper.find('.grid-summary').exists()).toBe(false)
  })

  it('应该使用共享浮层渲染种子、动画速度与重置控制', async () => {
    const wrapper = mount(GridView)

    expect(wrapper.find('.panel-group').exists()).toBe(true)
    expect(wrapper.find('.floating-panel.right-aligned').exists()).toBe(true)
    expect(wrapper.find('.icon-trigger').attributes('aria-label')).toBe('折线生长控制')
    expect(wrapper.text()).toContain('折线生长')
    expect(wrapper.text()).toContain('种子')
    expect(wrapper.text()).toContain('速度')

    const seedInput = wrapper.find('input[type="text"]')
    const speedInput = wrapper.find('input[type="range"]')
    const freezeButton = wrapper.find('.icon-button')
    const resetButton = wrapper.find('.reset-button')

    expect(seedInput.exists()).toBe(true)
    expect(seedInput.attributes('maxlength')).toBe('16')
    expect(speedInput.exists()).toBe(true)
    expect(resetButton.text()).toBe('重置')

    await freezeButton.trigger('click')
    expect(freezeButton.classes()).toContain('active')
  })

  it('鼠标滚轮缩放时应该重绘点阵', async () => {
    const wrapper = mount(GridView)
    const canvas = wrapper.find('canvas').element
    const drawCount = contextMock.arc.mock.calls.length

    canvas.dispatchEvent(new WheelEvent('wheel', {
      deltaY: -120,
      clientX: 450,
      clientY: 350,
      cancelable: true,
    }))
    for (let frame = 0; frame < 4; frame += 1) {
      flushFrame()
    }

    expect(contextMock.arc.mock.calls.length).toBeGreaterThan(drawCount)
  })

  it('鼠标左键拖动时应该平移并重绘点阵', () => {
    const wrapper = mount(GridView)
    const canvas = wrapper.find('canvas').element
    canvas.setPointerCapture = vi.fn()
    canvas.hasPointerCapture = vi.fn(() => true)
    canvas.releasePointerCapture = vi.fn()
    const drawCount = contextMock.arc.mock.calls.length

    canvas.dispatchEvent(new PointerEvent('pointerdown', {
      button: 0,
      pointerId: 1,
      clientX: 260,
      clientY: 240,
    }))
    canvas.dispatchEvent(new PointerEvent('pointermove', {
      pointerId: 1,
      clientX: 320,
      clientY: 280,
    }))
    canvas.dispatchEvent(new PointerEvent('pointerup', {
      pointerId: 1,
      clientX: 320,
      clientY: 280,
    }))
    for (let frame = 0; frame < 4; frame += 1) {
      flushFrame()
    }

    expect(contextMock.arc.mock.calls.length).toBeGreaterThan(drawCount)
    expect(canvas.setPointerCapture).toHaveBeenCalledWith(1)
    expect(canvas.releasePointerCapture).toHaveBeenCalledWith(1)
  })
})
