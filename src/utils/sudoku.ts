/**
 * utils/sudoku.ts
 * 
 * 稳健版数独核心算法。
 * 采用了位掩码 (Bitmask) 优化的回溯算法和约束传播 (Constraint Propagation)。
 */

export type SudokuGrid = number[][];

/**
 * 数独核心逻辑类
 */
export class Sudoku {
  /**
   * 创建一个 9x9 的全零网格
   * @returns 空数独网格
   */
  static createEmptyGrid(): SudokuGrid {
    return Array.from({ length: 9 }, () => Array(9).fill(0));
  }

  /**
   * 检查在特定位置填入数字是否符合数独规则
   * @param grid 当前盘面
   * @param row 行索引 (0-8)
   * @param col 列索引 (0-8)
   * @param num 待填入的数字 (1-9)
   * @returns 是否合法
   */
  static isValid(grid: SudokuGrid, row: number, col: number, num: number): boolean {
    const r = grid[row];
    if (!r) return false;
    for (let x = 0; x < 9; x++) {
      if (r[x] === num) return false;
      const c = grid[x];
      if (c && c[col] === num) return false;
    }
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
      const r_i = grid[i + startRow];
      if (!r_i) continue;
      for (let j = 0; j < 3; j++) {
        if (r_i[j + startCol] === num) return false;
      }
    }
    return true;
  }

  /**
   * 逻辑推理辅助：寻找当前盘面所有“唯一余数”单元格。
   * 唯一余数指该空格在行、列、宫的限制下，仅剩唯一可能的候选数字。
   */
  static getLogicalMoves(grid: SudokuGrid): {r: number, c: number, v: number}[] {
    const moves: {r: number, c: number, v: number}[] = [];
    const { rows, cols, blocks } = this.initializeMasks(grid);
    const getBlockIdx = (r: number, c: number) => Math.floor(r / 3) * 3 + Math.floor(c / 3);

    for (let r = 0; r < 9; r++) {
      const rowArr = grid[r];
      if (!rowArr) continue;
      for (let c = 0; c < 9; c++) {
        if (rowArr[c] === 0) {
          const b = getBlockIdx(r, c);
          const candidates = (rows[r] ?? 0) & (cols[c] ?? 0) & (blocks[b] ?? 0);
          // 使用 x & (x-1) == 0 判断是否只有一个比特位为 1
          if (candidates !== 0 && (candidates & (candidates - 1)) === 0) {
            const val = Math.log2(candidates) + 1;
            moves.push({ r, c, v: val });
          }
        }
      }
    }
    return moves;
  }

  /**
   * 验证整个盘面是否已正确填满且无冲突
   */
  static validateFullGrid(grid: SudokuGrid): boolean {
    for (let i = 0; i < 9; i++) {
      const rowSet = new Set<number>();
      const colSet = new Set<number>();
      const r_i = grid[i];
      if (!r_i) return false;
      for (let j = 0; j < 9; j++) {
        const rowVal = r_i[j];
        const c_j = grid[j];
        if (!c_j) return false;
        const colVal = c_j[i];
        if (rowVal === undefined || colVal === undefined || rowVal === 0) return false;
        if (rowVal < 1 || rowVal > 9 || rowSet.has(rowVal)) return false;
        rowSet.add(rowVal);
        if (colVal < 1 || colVal > 9 || colSet.has(colVal)) return false;
        colSet.add(colVal);
      }
    }
    for (let b = 0; b < 9; b++) {
      const blockSet = new Set<number>();
      const startR = Math.floor(b / 3) * 3;
      const startC = (b % 3) * 3;
      for (let i = 0; i < 3; i++) {
        const r_i = grid[startR + i];
        if (!r_i) continue;
        for (let j = 0; j < 3; j++) {
          const val = r_i[startC + j];
          if (val === undefined || val === 0 || blockSet.has(val)) return false;
          blockSet.add(val);
        }
      }
    }
    return true;
  }

  /**
   * 初始化位掩码，加速后续的解算。
   * 每个掩码的 9 个比特位对应数字 1-9 的可用状态。
   */
  static initializeMasks(grid: SudokuGrid) {
    const rows = new Uint16Array(9).fill(0x1ff);
    const cols = new Uint16Array(9).fill(0x1ff);
    const blocks = new Uint16Array(9).fill(0x1ff);
    const getBlockIdx = (r: number, c: number) => Math.floor(r / 3) * 3 + Math.floor(c / 3);

    for (let r = 0; r < 9; r++) {
      const rowArr = grid[r];
      if (!rowArr) continue;
      for (let c = 0; c < 9; c++) {
        const val = rowArr[c];
        if (val !== undefined && val !== 0) {
          const bit = 1 << (val - 1);
          rows[r] = (rows[r] as number) & ~bit;
          cols[c] = (cols[c] as number) & ~bit;
          blocks[getBlockIdx(r, c)] = (blocks[getBlockIdx(r, c)] as number) & ~bit;
        }
      }
    }
    return { rows, cols, blocks };
  }

  /**
   * 逻辑传播解算过程 (支持异步钩子用于动画)
   * 采用广度优先策略传播约束，自动填充所有可确定的唯一余数。
   */
  static async propagateConstraints(
    grid: SudokuGrid, 
    rows: Uint16Array, 
    cols: Uint16Array, 
    blocks: Uint16Array,
    onStep?: (r: number, c: number, v: number, type: 'logic') => Promise<void>
  ) {
    const getBlockIdx = (r: number, c: number) => Math.floor(r / 3) * 3 + Math.floor(c / 3);
    const S: number[] = [];
    const R = new Uint8Array(81);

    for (let i = 0; i < 81; i++) {
      const r = Math.floor(i / 9);
      const c = i % 9;
      const rowArr = grid[r];
      if (rowArr && rowArr[c] !== 0) R[i] = 1;
      else { S.push(i); R[i] = 1; }
    }

    let head = 0;
    while (head < S.length) {
      const idx = S[head++];
      if (idx === undefined) break;
      const r = Math.floor(idx / 9);
      const c = idx % 9;
      const rowArr = grid[r];
      if (rowArr && rowArr[c] !== 0) { R[idx] = 1; continue; }

      R[idx] = 0;
      const b = getBlockIdx(r, c);
      const candidates = (rows[r] ?? 0) & (cols[c] ?? 0) & (blocks[b] ?? 0);

      if (candidates !== 0 && (candidates & (candidates - 1)) === 0) {
        const val = Math.log2(candidates) + 1;
        if (rowArr) rowArr[c] = val;
        R[idx] = 1;
        
        if (onStep) await onStep(r, c, val, 'logic');

        const bit = 1 << (val - 1);
        rows[r] = (rows[r] as number) & ~bit;
        cols[c] = (cols[c] as number) & ~bit;
        blocks[b] = (blocks[b] as number) & ~bit;

        for (let i = 0; i < 9; i++) {
          const rIdx = r * 9 + i; if (!R[rIdx]) { S.push(rIdx); R[rIdx] = 1; }
          const cIdx = i * 9 + c; if (!R[cIdx]) { S.push(cIdx); R[cIdx] = 1; }
        }
        const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            const bIdx = (br + i) * 9 + (bc + j);
            if (!R[bIdx]) { S.push(bIdx); R[bIdx] = 1; }
          }
        }
      }
    }
  }

  /**
   * 暴力回溯解算过程 (支持异步钩子用于动画)
   * 结合了启发式搜索 (MRV - Minimum Remaining Values)，优先尝试候选数最少的格子。
   */
  static async backtrackWithMasks(
    grid: SudokuGrid,
    rows: Uint16Array,
    cols: Uint16Array,
    blocks: Uint16Array,
    onStep?: (r: number, c: number, v: number, type: 'backtrack') => Promise<void>
  ): Promise<boolean> {
    let r = -1, c = -1;
    let minCandidates = 10;
    
    for (let i = 0; i < 9; i++) {
      const rowArr = grid[i];
      if (!rowArr) continue;
      for (let j = 0; j < 9; j++) {
        if (rowArr[j] === 0) {
          const b = Math.floor(i / 3) * 3 + Math.floor(j / 3);
          const candidates = (rows[i] ?? 0) & (cols[j] ?? 0) & (blocks[b] ?? 0);
          let count = 0, temp = candidates;
          while (temp > 0) { count++; temp &= temp - 1; }
          if (count < minCandidates) { minCandidates = count; r = i; c = j; }
          if (count === 1) break;
        }
      }
      if (minCandidates === 1) break;
    }

    if (r === -1) return true;
    if (minCandidates === 0) return false;

    const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
    let candidates = (rows[r] ?? 0) & (cols[c] ?? 0) & (blocks[b] ?? 0);
    const rowArr = grid[r];
    if (!rowArr) return false;

    while (candidates > 0) {
      const bit = candidates & -candidates;
      const val = Math.log2(bit) + 1;

      rowArr[c] = val;
      if (onStep) await onStep(r, c, val, 'backtrack');
      
      rows[r] = (rows[r] as number) & ~bit;
      cols[c] = (cols[c] as number) & ~bit;
      blocks[b] = (blocks[b] as number) & ~bit;

      if (await this.backtrackWithMasks(grid, rows, cols, blocks, onStep)) return true;

      rowArr[c] = 0;
      if (onStep) await onStep(r, c, 0, 'backtrack');
      
      rows[r] = (rows[r] as number) | bit;
      cols[c] = (cols[c] as number) | bit;
      blocks[b] = (blocks[b] as number) | bit;
      candidates ^= bit;
    }
    return false;
  }

  /**
   * 同步求解数独盘面（无动画）
   */
  static solve(grid: SudokuGrid): boolean {
    const { rows, cols, blocks } = this.initializeMasks(grid);

    // 约束传播
    const getBlockIdx = (r: number, c: number) => Math.floor(r / 3) * 3 + Math.floor(c / 3);
    const S: number[] = [];
    const R = new Uint8Array(81);
    for (let i = 0; i < 81; i++) {
      const r = Math.floor(i / 9);
      const c = i % 9;
      const rowArr = grid[r];
      if (rowArr && rowArr[c] !== 0) R[i] = 1;
      else { S.push(i); R[i] = 1; }
    }
    let head = 0;
    while (head < S.length) {
      const idx = S[head++];
      if (idx === undefined) break;
      const r = Math.floor(idx / 9), c = idx % 9;
      const rowArr = grid[r];
      if (rowArr && rowArr[c] !== 0) { R[idx] = 1; continue; }
      R[idx] = 0;
      const b = getBlockIdx(r, c);
      const candidates = (rows[r] ?? 0) & (cols[c] ?? 0) & (blocks[b] ?? 0);
      if (candidates !== 0 && (candidates & (candidates - 1)) === 0) {
        const val = Math.log2(candidates) + 1;
        if (rowArr) rowArr[c] = val;
        R[idx] = 1;
        const bit = 1 << (val - 1);
        rows[r] &= ~bit; cols[c] &= ~bit; blocks[b] &= ~bit;
        for (let i = 0; i < 9; i++) {
          const rIdx = r * 9 + i; if (!R[rIdx]) { S.push(rIdx); R[rIdx] = 1; }
          const cIdx = i * 9 + c; if (!R[cIdx]) { S.push(cIdx); R[cIdx] = 1; }
        }
        const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            const bIdx = (br + i) * 9 + (bc + j);
            if (!R[bIdx]) { S.push(bIdx); R[bIdx] = 1; }
          }
        }
      }
    }

    // 回溯
    const backtrackSync = (g: SudokuGrid, rM: Uint16Array, cM: Uint16Array, bM: Uint16Array): boolean => {
      let r = -1, c = -1, minC = 10;
      for (let i = 0; i < 9; i++) {
        const rowArr = g[i]; if (!rowArr) continue;
        for (let j = 0; j < 9; j++) {
          if (rowArr[j] === 0) {
            const b = Math.floor(i / 3) * 3 + Math.floor(j / 3);
            const candidates = (rM[i] ?? 0) & (cM[j] ?? 0) & (bM[b] ?? 0);
            let count = 0, temp = candidates;
            while (temp > 0) { count++; temp &= temp - 1; }
            if (count < minC) { minC = count; r = i; c = j; }
            if (count === 1) break;
          }
        }
        if (minC === 1) break;
      }
      if (r === -1) return true;
      if (minC === 0) return false;
      const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
      let candidates = (rM[r] ?? 0) & (cM[c] ?? 0) & (bM[b] ?? 0);
      const rowArr = g[r]; if (!rowArr) return false;
      while (candidates > 0) {
        const bit = candidates & -candidates;
        const val = Math.log2(bit) + 1;
        rowArr[c] = val;
        rM[r] &= ~bit; cM[c] &= ~bit; bM[b] &= ~bit;
        if (backtrackSync(g, rM, cM, bM)) return true;
        rowArr[c] = 0;
        rM[r] |= bit; cM[c] |= bit; bM[b] |= bit;
        candidates ^= bit;
      }
      return false;
    };

    return backtrackSync(grid, rows, cols, blocks);
  }

  /**
   * 统计盘面的解数量（最多统计到 limit，用于快速唯一性判定）
   */
  static countSolutions(grid: SudokuGrid, limit: number = 2): number {
    const gridCopy = grid.map(row => [...row]);
    const { rows, cols, blocks } = this.initializeMasks(gridCopy);
    let count = 0;

    const backtrackCount = (g: SudokuGrid, rM: Uint16Array, cM: Uint16Array, bM: Uint16Array) => {
      if (count >= limit) return;
      let r = -1, c = -1, minC = 10;
      for (let i = 0; i < 9; i++) {
        const rowArr = g[i]; if (!rowArr) continue;
        for (let j = 0; j < 9; j++) {
          if (rowArr[j] === 0) {
            const b = Math.floor(i / 3) * 3 + Math.floor(j / 3);
            const candidates = (rM[i] ?? 0) & (cM[j] ?? 0) & (bM[b] ?? 0);
            let cCount = 0, temp = candidates;
            while (temp > 0) { cCount++; temp &= temp - 1; }
            if (cCount < minC) { minC = cCount; r = i; c = j; }
            if (cCount === 1) break;
          }
        }
        if (minC === 1) break;
      }
      if (r === -1) { count++; return; }
      if (minC === 0) return;
      const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
      let candidates = (rM[r] ?? 0) & (cM[c] ?? 0) & (bM[b] ?? 0);
      const rowArr = g[r]; if (!rowArr) return;
      while (candidates > 0) {
        const bit = candidates & -candidates;
        const val = Math.log2(bit) + 1;
        rowArr[c] = val;
        rM[r] &= ~bit; cM[c] &= ~bit; bM[b] &= ~bit;
        backtrackCount(g, rM, cM, bM);
        if (count >= limit) return;
        rowArr[c] = 0;
        rM[r] |= bit; cM[c] |= bit; bM[b] |= bit;
        candidates ^= bit;
      }
    };

    backtrackCount(gridCopy, rows, cols, blocks);
    return count;
  }

  /**
   * 随机填满整个网格（用于生成题目）
   */
  static fillGridRandomly(grid: SudokuGrid): boolean {
    for (let row = 0; row < 9; row++) {
      const rowArr = grid[row];
      if (!rowArr) continue;
      for (let col = 0; col < 9; col++) {
        if (rowArr[col] === 0) {
          const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
          for (const num of nums) {
            if (this.isValid(grid, row, col, num)) {
              rowArr[col] = num;
              if (this.fillGridRandomly(grid)) return true;
              rowArr[col] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  /**
   * 生成数独题目（确保唯一解）
   * 策略：从满盘开始随机尝试挖空，每次挖空后校验解的数量。
   * @param targetHoles 期望的挖空数量 (难度调节)
   * @returns 题目网格与对应的答案网格
   */
  static generatePuzzle(targetHoles: number = 40): { puzzle: SudokuGrid; solution: SudokuGrid } {
    const solution = this.createEmptyGrid();
    this.fillGridRandomly(solution);
    
    const puzzle = solution.map(row => [...row]);
    const cells = Array.from({ length: 81 }, (_, i) => ({ r: Math.floor(i / 9), c: i % 9 }));
    cells.sort(() => Math.random() - 0.5);

    let holesFound = 0;
    for (const cell of cells) {
      if (holesFound >= targetHoles) break;
      const { r, c } = cell;
      const backup = puzzle[r][c];
      puzzle[r][c] = 0;
      if (this.countSolutions(puzzle) !== 1) {
        puzzle[r][c] = backup;
      } else {
        holesFound++;
      }
    }
    return { puzzle, solution };
  }
}
