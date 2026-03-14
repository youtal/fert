/**
 * views/__tests__/SudokuView.spec.ts
 * 
 * 数独视图组件测试。
 * 已同步最新的组件结构和原始类名 (.board-cell, .is-selected)。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SudokuView from '../SudokuView.vue'
import { Sudoku } from '@/utils/sudoku'

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
    // 恢复为原始类名 .board-cell
    const cells = wrapper.findAll('.board-cell')
    expect(cells.length).toBe(81)
  })

  it('点击单元格应将其标记为选中状态', async () => {
    const wrapper = mount(SudokuView)
    const firstCell = wrapper.find('.board-cell')
    
    await firstCell.trigger('click')
    // 恢复为原始类名 .is-selected
    expect(firstCell.classes()).toContain('is-selected')
  })

  it('点击“随机题目”按钮应触发生成逻辑', async () => {
    const wrapper = mount(SudokuView)
    vi.mocked(Sudoku.generatePuzzle).mockClear()

    // 找到包含“随机题目”文字的按钮
    const buttons = wrapper.findAll('button')
    const generateBtn = buttons.find(b => b.text().includes('随机题目'))
    
    await generateBtn?.trigger('click')
    expect(Sudoku.generatePuzzle).toHaveBeenCalled()
  })

  it('控制面板应该存在', () => {
    const wrapper = mount(SudokuView)
    const controlPanel = wrapper.find('.controls-section')
    expect(controlPanel.exists()).toBe(true)
  })
})
