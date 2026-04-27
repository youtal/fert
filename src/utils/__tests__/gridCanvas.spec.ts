/**
 * gridCanvas 绘制层测试。
 *
 * Canvas 像素结果不适合在 jsdom 中精确比较，这里验证抽出的绘制函数会稳定触发
 * 背景、滑窗、线段和可见点绘制指令。
 */
import { describe, expect, it, vi } from 'vitest'
import { drawGridNetwork } from '@/utils/gridCanvas'

const createContextMock = () => ({
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
  fillStyle: '',
  strokeStyle: '',
  globalAlpha: 1,
  lineWidth: 1,
  lineCap: 'round',
  lineJoin: 'round',
})

describe('gridCanvas 绘制层', () => {
  it('应该绘制背景、滑窗、探测点对、网络线段和可见点', () => {
    const context = createContextMock()

    drawGridNetwork(context as unknown as CanvasRenderingContext2D, {
      viewportWidth: 900,
      viewportHeight: 700,
      zoom: 1,
      originX: 0,
      originY: 0,
      animatedSegmentCount: 2,
      networkSegments: [
        { from: 11325, to: 11326, color: '#22d3ee' },
        { from: 11326, to: 11476, color: '#a78bfa' },
      ],
      activeWindow: { top: 0, left: 0 },
      activeProbeSegments: [
        { from: 11325, to: 11335, color: '#94a3b8' },
      ],
      pixelRatio: 2,
    })

    expect(context.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0)
    expect(context.fillRect).toHaveBeenCalled()
    expect(context.strokeRect).toHaveBeenCalled()
    expect(context.lineTo).toHaveBeenCalled()
    expect(context.stroke).toHaveBeenCalled()
    expect(context.arc).toHaveBeenCalled()
    expect(context.fill).toHaveBeenCalled()
  })

  it('应该跳过视口外的网络线段', () => {
    const context = createContextMock()

    drawGridNetwork(context as unknown as CanvasRenderingContext2D, {
      viewportWidth: 900,
      viewportHeight: 700,
      zoom: 1,
      originX: 0,
      originY: 0,
      animatedSegmentCount: 1,
      networkSegments: [
        { from: 0, to: 1, color: '#22d3ee' },
      ],
      activeWindow: null,
      pixelRatio: 1,
    })

    expect(context.lineTo).not.toHaveBeenCalled()
    expect(context.stroke).not.toHaveBeenCalled()
    expect(context.arc).toHaveBeenCalled()
  })
})
