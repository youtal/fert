import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SudokuBoard from '../sudoku/SudokuBoard.vue'

describe('SudokuBoard', () => {
  // 验证“同数字高亮”不会破坏现有选中态与相关区域背景高亮。
  it('选中非空单元格时应高亮其他相同数字', async () => {
    const grid = Array.from({ length: 9 }, () => Array(9).fill(0))
    grid[0]![0] = 5
    grid[0]![4] = 5
    grid[4]![0] = 5

    const wrapper = mount(SudokuBoard, {
      props: {
        grid,
        solveType: Array.from({ length: 9 }, () => Array(9).fill(0)),
        lockMask: Array.from({ length: 9 }, () => Array(9).fill(false)),
        selectedCell: { row: 0, col: 0 },
        validationStep: -1,
        isValidating: false,
        isSuccess: true,
        isSolving: false,
      },
    })

    const cells = wrapper.findAll('.board-cell')
    expect(cells[0]?.classes()).toContain('is-selected')
    expect(cells[4]?.classes()).toContain('is-same-number')
    expect(cells[36]?.classes()).toContain('is-same-number')
  })

  it('选中空单元格时不应触发同数字高亮', () => {
    const wrapper = mount(SudokuBoard, {
      props: {
        grid: Array.from({ length: 9 }, () => Array(9).fill(0)),
        solveType: Array.from({ length: 9 }, () => Array(9).fill(0)),
        lockMask: Array.from({ length: 9 }, () => Array(9).fill(false)),
        selectedCell: { row: 0, col: 0 },
        validationStep: -1,
        isValidating: false,
        isSuccess: true,
        isSolving: false,
      },
    })

    wrapper.findAll('.board-cell').forEach((cell) => {
      expect(cell.classes()).not.toContain('is-same-number')
    })
  })

  it('应根据 solveType 渲染用户正确与错误的字体反馈', () => {
    const solveType = Array.from({ length: 9 }, () => Array(9).fill(0))
    solveType[0]![0] = 3
    solveType[0]![1] = 4

    const wrapper = mount(SudokuBoard, {
      props: {
        grid: Array.from({ length: 9 }, () => Array(9).fill(0)),
        solveType,
        lockMask: Array.from({ length: 9 }, () => Array(9).fill(false)),
        selectedCell: { row: -1, col: -1 },
        validationStep: -1,
        isValidating: false,
        isSuccess: true,
        isSolving: false,
      },
    })

    const cells = wrapper.findAll('.board-cell')
    expect(cells[0]?.classes()).toContain('is-user-correct')
    expect(cells[1]?.classes()).toContain('is-user-error')
  })
})
