/**
 * utils/__tests__/sudoku.spec.ts
 * 
 * 数独核心算法单元测试。
 * 验证合法性检查、求解准确性及题目生成逻辑。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { Sudoku, type SudokuGrid } from '../sudoku'

describe('Sudoku 核心算法测试', () => {
  let emptyGrid: SudokuGrid

  beforeEach(() => {
    // 每个用例都从全新空棋盘开始，避免求解逻辑的原地写入污染后续断言。
    emptyGrid = Sudoku.createEmptyGrid()
  })

  it('应该能创建一个 9x9 的空网格', () => {
    expect(emptyGrid.length).toBe(9)
    expect(emptyGrid[0]?.length).toBe(9)
    expect(emptyGrid[0]?.[0]).toBe(0)
  })

  describe('isValid 合法性检查', () => {
    it('在空网格中任何位置填入 1-9 都是合法的', () => {
      expect(Sudoku.isValid(emptyGrid, 0, 0, 5)).toBe(true)
      expect(Sudoku.isValid(emptyGrid, 4, 4, 9)).toBe(true)
    })

    it('同一行不能有重复数字', () => {
      if (emptyGrid[0]) emptyGrid[0][0] = 5
      expect(Sudoku.isValid(emptyGrid, 0, 5, 5)).toBe(false)
      expect(Sudoku.isValid(emptyGrid, 0, 5, 6)).toBe(true)
    })

    it('同一列不能有重复数字', () => {
      if (emptyGrid[0]) emptyGrid[0][0] = 5
      expect(Sudoku.isValid(emptyGrid, 5, 0, 5)).toBe(false)
      expect(Sudoku.isValid(emptyGrid, 5, 0, 6)).toBe(true)
    })

    it('同一 3x3 宫格内不能有重复数字', () => {
      if (emptyGrid[0]) emptyGrid[0][0] = 5
      expect(Sudoku.isValid(emptyGrid, 1, 1, 5)).toBe(false)
      expect(Sudoku.isValid(emptyGrid, 2, 2, 5)).toBe(false)
      expect(Sudoku.isValid(emptyGrid, 2, 2, 6)).toBe(true)
    })
  })

  describe('solve 求解逻辑', () => {
    it('应该能解出一个简单的数独题目', () => {
      const partialGrid = [
        [0, 2, 3, 4, 5, 6, 7, 8, 9],
        [4, 5, 6, 7, 8, 9, 1, 2, 3],
        [7, 8, 9, 1, 2, 3, 4, 5, 6],
        [2, 3, 4, 5, 6, 7, 8, 9, 1],
        [5, 6, 7, 8, 9, 1, 2, 3, 4],
        [8, 9, 1, 2, 3, 4, 5, 6, 7],
        [3, 4, 5, 6, 7, 8, 9, 1, 2],
        [6, 7, 8, 9, 1, 2, 3, 4, 5],
        [9, 1, 2, 3, 4, 5, 6, 7, 8]
      ]
      const solved = Sudoku.solve(partialGrid)
      expect(solved).toBe(true)
      expect(partialGrid[0]?.[0]).toBe(1)
    })

    it('应该能解出一个复杂的数独题目 (芬兰数学家设计的“世界最难数独”)', () => {
      const difficultGrid = [
        [8, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 3, 6, 0, 0, 0, 0, 0],
        [0, 7, 0, 0, 9, 0, 2, 0, 0],
        [0, 5, 0, 0, 0, 7, 0, 0, 0],
        [0, 0, 0, 0, 4, 5, 7, 0, 0],
        [0, 0, 0, 1, 0, 0, 0, 3, 0],
        [0, 0, 1, 0, 0, 0, 0, 6, 8],
        [0, 0, 8, 5, 0, 0, 0, 1, 0],
        [0, 9, 0, 0, 0, 0, 4, 0, 0]
      ]
      const solved = Sudoku.solve(difficultGrid)
      expect(solved).toBe(true)
      expect(Sudoku.validateFullGrid(difficultGrid)).toBe(true)
    })
  })

  describe('generatePuzzle 题目生成', () => {
    it('生成的题目应包含指定数量的空位', () => {
      const holes = 45
      const { puzzle } = Sudoku.generatePuzzle(holes)
      let count = 0
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (puzzle[r]?.[c] === 0) count++
        }
      }
      expect(count).toBe(holes)
    })

    it('生成的题目应该是有解的且解是唯一的', () => {
      const { puzzle } = Sudoku.generatePuzzle(35)
      expect(Sudoku.countSolutions(puzzle)).toBe(1)
    })

    it('countSolutions 应该能正确识别多解情况', () => {
      // 创建一个全空网格（具有极多解）
      const empty = Sudoku.createEmptyGrid()
      expect(Sudoku.countSolutions(empty)).toBe(2) // limit 默认为 2
    })

    it('countSolutions 应该能正确识别唯一解情况', () => {
      // 构造一个接近完成的唯一解数独
      const nearComplete = [
        [1, 2, 3, 4, 5, 6, 7, 8, 9],
        [4, 5, 6, 7, 8, 9, 1, 2, 3],
        [7, 8, 9, 1, 2, 3, 4, 5, 6],
        [2, 3, 4, 5, 6, 7, 8, 9, 1],
        [5, 6, 7, 8, 9, 1, 2, 3, 4],
        [8, 9, 1, 2, 3, 4, 5, 6, 7],
        [3, 4, 5, 6, 7, 8, 9, 1, 2],
        [6, 7, 8, 9, 1, 2, 3, 4, 5],
        [9, 1, 2, 0, 4, 5, 6, 7, 8] // 挖掉一个
      ]
      expect(Sudoku.countSolutions(nearComplete)).toBe(1)
    })

    it('冲突初盘不应被识别为合法唯一解', () => {
      const invalidFilledGrid = [
        [1, 1, 3, 4, 5, 6, 7, 8, 9],
        [4, 5, 6, 7, 8, 9, 1, 2, 3],
        [7, 8, 9, 1, 2, 3, 4, 5, 6],
        [2, 3, 4, 5, 6, 7, 8, 9, 1],
        [5, 6, 7, 8, 9, 1, 2, 3, 4],
        [8, 9, 1, 2, 3, 4, 5, 6, 7],
        [3, 4, 5, 6, 7, 8, 9, 1, 2],
        [6, 7, 8, 9, 1, 2, 3, 4, 5],
        [9, 2, 2, 3, 4, 5, 6, 7, 8]
      ]

      expect(Sudoku.validateInitialGrid(invalidFilledGrid)).toBe(false)
      expect(Sudoku.countSolutions(invalidFilledGrid)).toBe(0)
      expect(Sudoku.solve(invalidFilledGrid)).toBe(false)
    })
  })
})
