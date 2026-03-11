/**
 * views/__tests__/SudokuView.spec.ts
 * 
 * 数独视图组件测试。
 * 验证棋盘渲染、单元格选择及生成操作。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SudokuView from '../SudokuView.vue'
import { Sudoku } from '@/utils/sudoku'

// Mock 掉 Sudoku 工具类以确保测试的可预测性
vi.mock('@/utils/sudoku', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/sudoku')>()
  return {
    ...actual,
    Sudoku: {
      ...actual.Sudoku,
      createEmptyGrid: vi.fn(() => Array.from({ length: 9 }, () => Array(9).fill(0))),
      generatePuzzle: vi.fn(() => ({
        puzzle: Array.from({ length: 9 }, () => Array(9).fill(0)),
        solution: Array.from({ length: 9 }, () => Array(9).fill(1))
      }))
    }
  }
})

describe('SudokuView.vue', () => {
  it('应该正确渲染 81 个单元格', () => {
    const wrapper = mount(SudokuView)
    const cells = wrapper.findAll('.board-cell')
    expect(cells.length).toBe(81)
  })

  it('点击单元格应将其标记为选中状态', async () => {
    const wrapper = mount(SudokuView)
    const firstCell = wrapper.find('.board-cell')
    
    await firstCell.trigger('click')
    expect(firstCell.classes()).toContain('is-selected')
  })

  it('点击“生成新题目”按钮应触发生成逻辑', async () => {
    const wrapper = mount(SudokuView)
    // 初始加载会调用一次，重置调用次数
    vi.mocked(Sudoku.generatePuzzle).mockClear()

    const generateBtn = wrapper.find('.action-btn.secondary')
    
    await generateBtn.trigger('click')
    expect(Sudoku.generatePuzzle).toHaveBeenCalled()
  })

  it('控制面板在初始状态下应为展开', () => {
    const wrapper = mount(SudokuView)
    const controlPanel = wrapper.find('.floating-panel.right-aligned')
    expect(controlPanel.isVisible()).toBe(true)
  })
})
