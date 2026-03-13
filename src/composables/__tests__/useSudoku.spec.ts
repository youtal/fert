/**
 * composables/__tests__/useSudoku.spec.ts
 * 
 * 数独逻辑钩子 (useSudoku) 的单元测试。
 * 使用 mount 包装以正确触发生命周期钩子。
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { useSudoku } from '../useSudoku'
import { Sudoku } from '@/utils/sudoku'
import { defineComponent } from 'vue'

describe('useSudoku (逻辑钩子) 测试', () => {
  const TestComponent = defineComponent({
    setup() {
      return { ...useSudoku() }
    },
    template: '<div></div>'
  })

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('初始化时应生成一个新题目', () => {
    const wrapper = mount(TestComponent)
    const { grid, lockMask } = wrapper.vm as any
    
    let nonZero = 0
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] !== 0) {
          nonZero++
          expect(lockMask[r][c]).toBe(true)
        }
      }
    }
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

  it('solveWithAnimation 应该能启动解算并最终填满网格', async () => {
    const wrapper = mount(TestComponent)
    const { grid, solveWithAnimation } = wrapper.vm as any
    
    const solvePromise = solveWithAnimation()
    await vi.runAllTimersAsync()
    await solvePromise

    expect(Sudoku.validateFullGrid(grid)).toBe(true)
  })
})
