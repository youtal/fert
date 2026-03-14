/**
 * utils/sudoku.ts
 *
 * 数独核心算法。
 * 使用位掩码优化候选集计算，并在入口处校验初始盘面合法性。
 */

export type SudokuGrid = number[][]

type MaskState = {
  rows: Uint16Array
  cols: Uint16Array
  blocks: Uint16Array
}

const FULL_MASK = 0x1ff

const getBlockIndex = (row: number, col: number) => Math.floor(row / 3) * 3 + Math.floor(col / 3)

const getRow = (grid: SudokuGrid, row: number) => grid[row]

const cloneGrid = (grid: SudokuGrid): SudokuGrid => grid.map((row) => [...row])

const countBits = (value: number) => {
  let count = 0
  let current = value
  while (current > 0) {
    count++
    current &= current - 1
  }
  return count
}

const firstCandidateValue = (bitmask: number) => Math.log2(bitmask) + 1

const isSingleCandidate = (bitmask: number) => bitmask !== 0 && (bitmask & (bitmask - 1)) === 0

const clearMaskBit = (mask: Uint16Array, index: number, bit: number) => {
  mask[index] = (mask[index] ?? 0) & ~bit
}

const restoreMaskBit = (mask: Uint16Array, index: number, bit: number) => {
  mask[index] = (mask[index] ?? 0) | bit
}

export class Sudoku {
  static createEmptyGrid(): SudokuGrid {
    return Array.from({ length: 9 }, () => Array(9).fill(0))
  }

  static isValid(grid: SudokuGrid, row: number, col: number, num: number): boolean {
    const rowValues = getRow(grid, row)
    if (!rowValues) return false

    for (let index = 0; index < 9; index++) {
      if (rowValues[index] === num) return false
      const otherRow = getRow(grid, index)
      if (otherRow && otherRow[col] === num) return false
    }

    const startRow = Math.floor(row / 3) * 3
    const startCol = Math.floor(col / 3) * 3
    for (let rowOffset = 0; rowOffset < 3; rowOffset++) {
      const blockRow = getRow(grid, startRow + rowOffset)
      if (!blockRow) continue
      for (let colOffset = 0; colOffset < 3; colOffset++) {
        if (blockRow[startCol + colOffset] === num) return false
      }
    }

    return true
  }

  static validateInitialGrid(grid: SudokuGrid): boolean {
    const rowSets = Array.from({ length: 9 }, () => new Set<number>())
    const colSets = Array.from({ length: 9 }, () => new Set<number>())
    const blockSets = Array.from({ length: 9 }, () => new Set<number>())

    for (let row = 0; row < 9; row++) {
      const rowValues = getRow(grid, row)
      if (!rowValues || rowValues.length !== 9) return false

      for (let col = 0; col < 9; col++) {
        const value = rowValues[col]
        if (value === undefined) return false
        if (value === 0) continue
        if (value < 1 || value > 9) return false

        const block = getBlockIndex(row, col)
        if (rowSets[row]!.has(value) || colSets[col]!.has(value) || blockSets[block]!.has(value)) {
          return false
        }

        rowSets[row]!.add(value)
        colSets[col]!.add(value)
        blockSets[block]!.add(value)
      }
    }

    return true
  }

  static getLogicalMoves(grid: SudokuGrid): { r: number; c: number; v: number }[] {
    const moves: { r: number; c: number; v: number }[] = []
    const maskState = this.initializeMasks(grid)
    if (!maskState) return moves

    for (let row = 0; row < 9; row++) {
      const rowValues = getRow(grid, row)
      if (!rowValues) continue

      for (let col = 0; col < 9; col++) {
        if (rowValues[col] !== 0) continue
        const block = getBlockIndex(row, col)
        const candidates = maskState.rows[row]! & maskState.cols[col]! & maskState.blocks[block]!
        if (!isSingleCandidate(candidates)) continue
        moves.push({ r: row, c: col, v: firstCandidateValue(candidates) })
      }
    }

    return moves
  }

  static validateFullGrid(grid: SudokuGrid): boolean {
    if (!this.validateInitialGrid(grid)) return false

    for (let row = 0; row < 9; row++) {
      const rowValues = getRow(grid, row)
      if (!rowValues) return false
      for (let col = 0; col < 9; col++) {
        if (rowValues[col] === 0) return false
      }
    }

    return true
  }

  static initializeMasks(grid: SudokuGrid): MaskState | null {
    if (!this.validateInitialGrid(grid)) return null

    const rows = new Uint16Array(9).fill(FULL_MASK)
    const cols = new Uint16Array(9).fill(FULL_MASK)
    const blocks = new Uint16Array(9).fill(FULL_MASK)

    for (let row = 0; row < 9; row++) {
      const rowValues = getRow(grid, row)
      if (!rowValues) return null

      for (let col = 0; col < 9; col++) {
        const value = rowValues[col]
        if (!value) continue
        const bit = 1 << (value - 1)
        clearMaskBit(rows, row, bit)
        clearMaskBit(cols, col, bit)
        clearMaskBit(blocks, getBlockIndex(row, col), bit)
      }
    }

    return { rows, cols, blocks }
  }

  static async propagateConstraints(
    grid: SudokuGrid,
    rows: Uint16Array,
    cols: Uint16Array,
    blocks: Uint16Array,
    onStep?: (r: number, c: number, v: number, type: 'logic') => Promise<void>,
  ) {
    const queue: number[] = []
    const queued = new Uint8Array(81)

    for (let index = 0; index < 81; index++) {
      const row = Math.floor(index / 9)
      const col = index % 9
      const rowValues = getRow(grid, row)
      if (!rowValues || rowValues[col] === 0) {
        queue.push(index)
      }
      queued[index] = 1
    }

    let head = 0
    while (head < queue.length) {
      const index = queue[head++]
      if (index === undefined) break

      const row = Math.floor(index / 9)
      const col = index % 9
      const rowValues = getRow(grid, row)
      if (!rowValues) continue
      if (rowValues[col] !== 0) continue

      queued[index] = 0
      const block = getBlockIndex(row, col)
      const candidates = rows[row]! & cols[col]! & blocks[block]!
      if (!isSingleCandidate(candidates)) continue

      const value = firstCandidateValue(candidates)
      rowValues[col] = value
      if (onStep) await onStep(row, col, value, 'logic')

      const bit = 1 << (value - 1)
      clearMaskBit(rows, row, bit)
      clearMaskBit(cols, col, bit)
      clearMaskBit(blocks, block, bit)

      for (let offset = 0; offset < 9; offset++) {
        const rowIndex = row * 9 + offset
        if (!queued[rowIndex]) {
          queue.push(rowIndex)
          queued[rowIndex] = 1
        }

        const colIndex = offset * 9 + col
        if (!queued[colIndex]) {
          queue.push(colIndex)
          queued[colIndex] = 1
        }
      }

      const blockStartRow = Math.floor(row / 3) * 3
      const blockStartCol = Math.floor(col / 3) * 3
      for (let rowOffset = 0; rowOffset < 3; rowOffset++) {
        for (let colOffset = 0; colOffset < 3; colOffset++) {
          const blockIndex = (blockStartRow + rowOffset) * 9 + blockStartCol + colOffset
          if (!queued[blockIndex]) {
            queue.push(blockIndex)
            queued[blockIndex] = 1
          }
        }
      }
    }
  }

  static async backtrackWithMasks(
    grid: SudokuGrid,
    rows: Uint16Array,
    cols: Uint16Array,
    blocks: Uint16Array,
    onStep?: (r: number, c: number, v: number, type: 'backtrack') => Promise<void>,
  ): Promise<boolean> {
    let targetRow = -1
    let targetCol = -1
    let minCandidateCount = 10

    for (let row = 0; row < 9; row++) {
      const rowValues = getRow(grid, row)
      if (!rowValues) continue

      for (let col = 0; col < 9; col++) {
        if (rowValues[col] !== 0) continue
        const candidates = rows[row]! & cols[col]! & blocks[getBlockIndex(row, col)]!
        const candidateCount = countBits(candidates)
        if (candidateCount < minCandidateCount) {
          minCandidateCount = candidateCount
          targetRow = row
          targetCol = col
        }
        if (candidateCount === 1) break
      }

      if (minCandidateCount === 1) break
    }

    if (targetRow === -1 || targetCol === -1) return true
    if (minCandidateCount === 0) return false

    const rowValues = getRow(grid, targetRow)
    if (!rowValues) return false

    const block = getBlockIndex(targetRow, targetCol)
    let candidates = rows[targetRow]! & cols[targetCol]! & blocks[block]!

    while (candidates > 0) {
      const bit = candidates & -candidates
      const value = firstCandidateValue(bit)
      rowValues[targetCol] = value
      if (onStep) await onStep(targetRow, targetCol, value, 'backtrack')

      clearMaskBit(rows, targetRow, bit)
      clearMaskBit(cols, targetCol, bit)
      clearMaskBit(blocks, block, bit)

      if (await this.backtrackWithMasks(grid, rows, cols, blocks, onStep)) return true

      rowValues[targetCol] = 0
      if (onStep) await onStep(targetRow, targetCol, 0, 'backtrack')
      restoreMaskBit(rows, targetRow, bit)
      restoreMaskBit(cols, targetCol, bit)
      restoreMaskBit(blocks, block, bit)
      candidates ^= bit
    }

    return false
  }

  static solve(grid: SudokuGrid): boolean {
    const maskState = this.initializeMasks(grid)
    if (!maskState) return false

    const { rows, cols, blocks } = maskState
    const propagationGrid = cloneGrid(grid)
    const propagationMasks = {
      rows: rows.slice(),
      cols: cols.slice(),
      blocks: blocks.slice(),
    }

    const queue: number[] = []
    const queued = new Uint8Array(81)

    for (let index = 0; index < 81; index++) {
      const row = Math.floor(index / 9)
      const col = index % 9
      const rowValues = getRow(propagationGrid, row)
      if (!rowValues || rowValues[col] === 0) {
        queue.push(index)
      }
      queued[index] = 1
    }

    let head = 0
    while (head < queue.length) {
      const index = queue[head++]
      if (index === undefined) break

      const row = Math.floor(index / 9)
      const col = index % 9
      const rowValues = getRow(propagationGrid, row)
      if (!rowValues) continue
      if (rowValues[col] !== 0) continue

      queued[index] = 0
      const block = getBlockIndex(row, col)
      const candidates = propagationMasks.rows[row]! & propagationMasks.cols[col]! & propagationMasks.blocks[block]!
      if (!isSingleCandidate(candidates)) continue

      const value = firstCandidateValue(candidates)
      rowValues[col] = value

      const bit = 1 << (value - 1)
      clearMaskBit(propagationMasks.rows, row, bit)
      clearMaskBit(propagationMasks.cols, col, bit)
      clearMaskBit(propagationMasks.blocks, block, bit)

      for (let offset = 0; offset < 9; offset++) {
        const rowIndex = row * 9 + offset
        if (!queued[rowIndex]) {
          queue.push(rowIndex)
          queued[rowIndex] = 1
        }

        const colIndex = offset * 9 + col
        if (!queued[colIndex]) {
          queue.push(colIndex)
          queued[colIndex] = 1
        }
      }

      const blockStartRow = Math.floor(row / 3) * 3
      const blockStartCol = Math.floor(col / 3) * 3
      for (let rowOffset = 0; rowOffset < 3; rowOffset++) {
        for (let colOffset = 0; colOffset < 3; colOffset++) {
          const blockIndex = (blockStartRow + rowOffset) * 9 + blockStartCol + colOffset
          if (!queued[blockIndex]) {
            queue.push(blockIndex)
            queued[blockIndex] = 1
          }
        }
      }
    }

    const backtrackSync = (candidateGrid: SudokuGrid, candidateRows: Uint16Array, candidateCols: Uint16Array, candidateBlocks: Uint16Array): boolean => {
      let targetRow = -1
      let targetCol = -1
      let minCandidateCount = 10

      for (let row = 0; row < 9; row++) {
        const rowValues = getRow(candidateGrid, row)
        if (!rowValues) continue
        for (let col = 0; col < 9; col++) {
          if (rowValues[col] !== 0) continue
          const candidates = candidateRows[row]! & candidateCols[col]! & candidateBlocks[getBlockIndex(row, col)]!
          const candidateCount = countBits(candidates)
          if (candidateCount < minCandidateCount) {
            minCandidateCount = candidateCount
            targetRow = row
            targetCol = col
          }
          if (candidateCount === 1) break
        }
        if (minCandidateCount === 1) break
      }

      if (targetRow === -1 || targetCol === -1) return true
      if (minCandidateCount === 0) return false

      const rowValues = getRow(candidateGrid, targetRow)
      if (!rowValues) return false

      const block = getBlockIndex(targetRow, targetCol)
      let candidates = candidateRows[targetRow]! & candidateCols[targetCol]! & candidateBlocks[block]!
      while (candidates > 0) {
        const bit = candidates & -candidates
        const value = firstCandidateValue(bit)
        rowValues[targetCol] = value
        clearMaskBit(candidateRows, targetRow, bit)
        clearMaskBit(candidateCols, targetCol, bit)
        clearMaskBit(candidateBlocks, block, bit)

        if (backtrackSync(candidateGrid, candidateRows, candidateCols, candidateBlocks)) return true

        rowValues[targetCol] = 0
        restoreMaskBit(candidateRows, targetRow, bit)
        restoreMaskBit(candidateCols, targetCol, bit)
        restoreMaskBit(candidateBlocks, block, bit)
        candidates ^= bit
      }

      return false
    }

    if (!backtrackSync(propagationGrid, propagationMasks.rows, propagationMasks.cols, propagationMasks.blocks)) {
      return false
    }

    for (let row = 0; row < 9; row++) {
      const sourceRow = getRow(propagationGrid, row)
      const targetRow = getRow(grid, row)
      if (!sourceRow || !targetRow) return false
      for (let col = 0; col < 9; col++) {
        targetRow[col] = sourceRow[col] ?? 0
      }
    }

    return this.validateFullGrid(grid)
  }

  static countSolutions(grid: SudokuGrid, limit = 2): number {
    const candidateGrid = cloneGrid(grid)
    const maskState = this.initializeMasks(candidateGrid)
    if (!maskState) return 0

    const { rows, cols, blocks } = maskState
    let count = 0

    const backtrackCount = (activeGrid: SudokuGrid, activeRows: Uint16Array, activeCols: Uint16Array, activeBlocks: Uint16Array) => {
      if (count >= limit) return

      let targetRow = -1
      let targetCol = -1
      let minCandidateCount = 10

      for (let row = 0; row < 9; row++) {
        const rowValues = getRow(activeGrid, row)
        if (!rowValues) continue
        for (let col = 0; col < 9; col++) {
          if (rowValues[col] !== 0) continue
          const candidates = activeRows[row]! & activeCols[col]! & activeBlocks[getBlockIndex(row, col)]!
          const candidateCount = countBits(candidates)
          if (candidateCount < minCandidateCount) {
            minCandidateCount = candidateCount
            targetRow = row
            targetCol = col
          }
          if (candidateCount === 1) break
        }
        if (minCandidateCount === 1) break
      }

      if (targetRow === -1 || targetCol === -1) {
        if (this.validateFullGrid(activeGrid)) count++
        return
      }
      if (minCandidateCount === 0) return

      const rowValues = getRow(activeGrid, targetRow)
      if (!rowValues) return

      const block = getBlockIndex(targetRow, targetCol)
      let candidates = activeRows[targetRow]! & activeCols[targetCol]! & activeBlocks[block]!

      while (candidates > 0) {
        const bit = candidates & -candidates
        const value = firstCandidateValue(bit)
        rowValues[targetCol] = value
        clearMaskBit(activeRows, targetRow, bit)
        clearMaskBit(activeCols, targetCol, bit)
        clearMaskBit(activeBlocks, block, bit)

        backtrackCount(activeGrid, activeRows, activeCols, activeBlocks)
        if (count >= limit) return

        rowValues[targetCol] = 0
        restoreMaskBit(activeRows, targetRow, bit)
        restoreMaskBit(activeCols, targetCol, bit)
        restoreMaskBit(activeBlocks, block, bit)
        candidates ^= bit
      }
    }

    backtrackCount(candidateGrid, rows, cols, blocks)
    return count
  }

  static fillGridRandomly(grid: SudokuGrid): boolean {
    for (let row = 0; row < 9; row++) {
      const rowValues = getRow(grid, row)
      if (!rowValues) continue
      for (let col = 0; col < 9; col++) {
        if (rowValues[col] !== 0) continue

        const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5)
        for (const number of numbers) {
          if (!this.isValid(grid, row, col, number)) continue
          rowValues[col] = number
          if (this.fillGridRandomly(grid)) return true
          rowValues[col] = 0
        }
        return false
      }
    }
    return true
  }

  static generatePuzzle(targetHoles = 40): { puzzle: SudokuGrid; solution: SudokuGrid } {
    const solution = this.createEmptyGrid()
    this.fillGridRandomly(solution)

    const puzzle = cloneGrid(solution)
    const cells = Array.from({ length: 81 }, (_, index) => ({
      r: Math.floor(index / 9),
      c: index % 9,
    }))
    cells.sort(() => Math.random() - 0.5)

    let holesFound = 0
    for (const cell of cells) {
      if (holesFound >= targetHoles) break
      const rowValues = getRow(puzzle, cell.r)
      if (!rowValues) continue
      const backup = rowValues[cell.c]
      if (backup === undefined) continue

      rowValues[cell.c] = 0
      if (this.countSolutions(puzzle) !== 1) {
        rowValues[cell.c] = backup
      } else {
        holesFound++
      }
    }

    return { puzzle, solution }
  }
}
