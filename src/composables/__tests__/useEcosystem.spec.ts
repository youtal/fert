/**
 * composables/__tests__/useEcosystem.spec.ts
 *
 * 验证生态系统在 KeepAlive 场景下的后台持续仿真与前台渲染分离。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, h, KeepAlive, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useEcosystem } from '../useEcosystem'
import { useEcosystemStore } from '@/stores/ecosystem'

class ResizeObserverMock {
  observe = vi.fn()
  disconnect = vi.fn()
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock)

describe('useEcosystem', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-14T00:00:00Z'))
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      return setTimeout(() => callback(performance.now()), 16) as unknown as number
    })
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      clearTimeout(id)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('视图切走后应停止渲染但保持后台仿真', async () => {
    const store = useEcosystemStore()
    const clearRect = vi.fn()
    const mockContext = {
      clearRect,
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      shadowBlur: 0,
      shadowColor: '',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      globalAlpha: 1,
    }

    const Child = defineComponent({
      setup() {
        const { setRefs } = useEcosystem()
        const canvas = ref({
          getContext: vi.fn(() => mockContext),
          width: 800,
          height: 600,
        } as unknown as HTMLCanvasElement)
        const container = ref({
          clientWidth: 800,
          clientHeight: 600,
        } as unknown as HTMLDivElement)

        setRefs(canvas, container)
        return () => h('div')
      },
    })

    const Parent = defineComponent({
      setup() {
        const show = ref(true)
        return { show }
      },
      render() {
        return h(KeepAlive, null, [this.show ? h(Child) : null])
      },
    })

    const wrapper = mount(Parent)
    await vi.advanceTimersByTimeAsync(100)

    expect(store.state.status).toBe('运行中')
    const renderCallsBeforeDeactivate = clearRect.mock.calls.length
    expect(renderCallsBeforeDeactivate).toBeGreaterThan(0)

    wrapper.vm.show = false
    await nextTick()

    const uptimeBeforeBackground = store.state.uptime
    await vi.advanceTimersByTimeAsync(2200)
    const renderCallsAfterDeactivate = clearRect.mock.calls.length

    expect(clearRect.mock.calls.length).toBe(renderCallsAfterDeactivate)
    expect(store.state.uptime).toBeGreaterThan(uptimeBeforeBackground)

    wrapper.vm.show = true
    await nextTick()
    await vi.advanceTimersByTimeAsync(100)

    expect(clearRect.mock.calls.length).toBeGreaterThan(renderCallsAfterDeactivate)
  })
})
