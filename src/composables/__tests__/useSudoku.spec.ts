/**
 * composables/__tests__/useSudoku.spec.ts
 * 
 * 数独逻辑钩子 (useSudoku) 的单元测试。
 * 使用 mount 包装以正确触发生命周期钩子。
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import {
  getSolveCompletePattern,
  getSolveStepFrequency,
  getValidationSuccessPattern,
  useSudoku,
} from '../useSudoku'
import { Sudoku } from '@/utils/sudoku'
import { defineComponent, h, KeepAlive, nextTick, ref } from 'vue'

describe('useSudoku (逻辑钩子) 测试', () => {
  /**
   * 轻量宿主组件。
   * 用于让 composable 在真实组件生命周期中运行，避免直接调用时漏掉 activated / mounted 行为。
   */
  const TestComponent = defineComponent({
    setup() {
      return { ...useSudoku() }
    },
    template: '<div></div>'
  })

  beforeEach(() => {
    vi.useFakeTimers()

    /**
     * 音频参数 mock。
     * 测试不关心 Web Audio 内部实现，只需要保证调用链存在即可。
     */
    class FakeAudioParam {
      setValueAtTime() {}
      exponentialRampToValueAtTime() {}
    }

    // GainNode mock：提供最小可用接口，让 useSudoku 能走完整音效分支。
    class FakeGainNode {
      gain = new FakeAudioParam()
      connect() {}
    }

    // OscillatorNode mock：避免 jsdom 环境缺失浏览器音频对象而导致测试失败。
    class FakeOscillatorNode {
      type: OscillatorType = 'sine'
      frequency = new FakeAudioParam()
      connect() {}
      start() {}
      stop() {}
    }

    class FakeAudioContext {
      state = 'running'
      currentTime = 0
      destination = {}
      resume = vi.fn(async () => {})
      close = vi.fn(async () => {})
      createOscillator() {
        return new FakeOscillatorNode() as unknown as OscillatorNode
      }
      createGain() {
        return new FakeGainNode() as unknown as GainNode
      }
    }

    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      writable: true,
      value: FakeAudioContext,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    Reflect.deleteProperty(window, 'AudioContext')
  })

  it('解算音调应随着剩余空格减少而升高', () => {
    expect(getSolveStepFrequency(80)).toBeLessThan(getSolveStepFrequency(40))
    expect(getSolveStepFrequency(40)).toBeLessThan(getSolveStepFrequency(0))
  })

  it('完成音效与验证成功音效应使用独立的特殊旋律', () => {
    expect(getSolveCompletePattern()).toEqual([880, 1100, 1320])
    expect(getValidationSuccessPattern()).toEqual([740, 988, 1480])
  })

  it('初始化时应生成一个新题目', () => {
    const wrapper = mount(TestComponent)
    const { grid, lockMask, difficulty } = wrapper.vm as any
    
    let nonZero = 0
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] !== 0) {
          nonZero++
          expect(lockMask[r][c]).toBe(true)
        }
      }
    }
    expect(difficulty).toBe(55)
    expect(nonZero).toBeGreaterThan(0)
  })

  it('fillNumber 应该能正确更新非锁定单元格', async () => {
    const wrapper = mount(TestComponent)
    const { grid, lockMask, selectCell, fillNumber } = wrapper.vm as any
    
    let r = -1, c = -1
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (!lockMask[i][j]) {
          r = i; c = j; break
        }
      }
      if (r !== -1) break
    }

    selectCell(r, c)
    fillNumber(5)
    expect(grid[r][c]).toBe(5)
  })

  it('随机题目下用户输入应根据答案副本给出正确或错误反馈', () => {
    const wrapper = mount(TestComponent)
    const { grid, lockMask, solveType, selectCell, fillNumber } = wrapper.vm as any

    let r = -1, c = -1
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (!lockMask[i][j]) {
          r = i
          c = j
          break
        }
      }
      if (r !== -1) break
    }

    const solvedGrid = grid.map((row: number[]) => [...row])
    Sudoku.solve(solvedGrid)
    const expectedValue = solvedGrid[r][c]
    const wrongValue = expectedValue === 9 ? 1 : expectedValue + 1

    selectCell(r, c)
    fillNumber(wrongValue)
    expect(solveType[r][c]).toBe(4)

    fillNumber(expectedValue)
    expect(solveType[r][c]).toBe(3)
  })

  it('solveWithAnimation 应该能启动解算并最终填满网格', async () => {
    const wrapper = mount(TestComponent)
    const { grid, solveWithAnimation } = wrapper.vm as any
    
    const solvePromise = solveWithAnimation()
    await vi.runAllTimersAsync()
    await solvePromise

    expect(Sudoku.validateFullGrid(grid)).toBe(true)
  })

  it('KeepAlive 切走后自动解算应继续进行并在恢复时保持进度', async () => {
    // 子组件只负责暴露 composable，测试重点是 KeepAlive 生命周期而不是模板行为。
    const Child = defineComponent({
      setup() {
        return { ...useSudoku() }
      },
      template: '<div></div>'
    })

    const Parent = defineComponent({
      setup() {
        const show = ref(true)
        return { show }
      },
      render() {
        return h(KeepAlive, null, [this.show ? h(Child) : null])
      }
    })

    const wrapper = mount(Parent)
    const child = wrapper.findComponent(Child)
    const vm = child.vm as any

    vm.solveSpeed = 10
    const solvePromise = vm.solveWithAnimation()

    await vi.advanceTimersByTimeAsync(50)
    wrapper.vm.show = false
    await nextTick()

    await vi.runAllTimersAsync()
    await solvePromise

    wrapper.vm.show = true
    await nextTick()

    const resumed = wrapper.findComponent(Child).vm as any
    expect(Sudoku.validateFullGrid(resumed.grid)).toBe(true)
    expect(resumed.isSolving).toBe(false)
  })
})
