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
    // 用 timeout 模拟 RAF，便于在 fake timers 下精确验证“渲染停、仿真不停”的时序。
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
    wrapper.unmount()
  })

  it('重复挂载时不应创建第二套后台仿真时钟', async () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
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

    const createCanvasRef = () => ref({
      getContext: vi.fn(() => mockContext),
      width: 800,
      height: 600,
    } as unknown as HTMLCanvasElement)

    const createContainerRef = () => ref({
      clientWidth: 800,
      clientHeight: 600,
    } as unknown as HTMLDivElement)

    const Child = defineComponent({
      props: {
        instanceId: {
          type: Number,
          required: true,
        },
      },
      setup() {
        const { setRefs } = useEcosystem()
        setRefs(createCanvasRef(), createContainerRef())
        return () => h('div')
      },
    })

    const wrapper = mount(defineComponent({
      render() {
        return h('div', [h(Child, { instanceId: 1 }), h(Child, { instanceId: 2 })])
      },
    }))

    await vi.advanceTimersByTimeAsync(100)

    expect(setIntervalSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy.mock.calls[0]?.[0]).toContain('duplicate runtime binding ignored')
    expect(clearRect).toHaveBeenCalled()

    wrapper.unmount()
  })
})
