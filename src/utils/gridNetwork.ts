/**
 * gridNetwork.ts
 *
 * GridView 的点阵网络生成器。
 * 这里集中保存与 Canvas 无关的纯算法：
 * 1. 用带方向偏置的随机游走覆盖 150 x 150 点阵。
 * 2. 添加少量局部环路，让网络不只是单棵树。
 * 3. 使用滑窗检查近邻点对，发现“几何距离近但图路径很长”的区域时补偿短路径。
 *
 * 视图层只消费生成结果，不关心路径如何产生，从而避免 GridView 继续膨胀成上帝组件。
 */

export const GRID_SIZE = 150
export const POINT_COUNT = GRID_SIZE * GRID_SIZE
export const SEED_DIGITS = 16
export const WINDOW_SIZE = 18

const LOOP_EDGE_RATIO = 0.08
const WINDOW_STEP = 9
const WINDOW_PAIR_PROBES = 96
const WINDOW_NEAR_DISTANCE = 12
const WINDOW_MIN_DISTANCE = 3
const WINDOW_STRETCH_LIMIT = 1.65
const WINDOW_DISTANCE_TOLERANCE = 5
const MAX_COMPENSATION_PATHS_PER_WINDOW = 3
const COMPENSATION_EDGE_LIMIT = 5200

type GridDirection = {
  row: number
  col: number
}

export type GridWindow = {
  top: number
  left: number
}

export type GridSegment = {
  from: number
  to: number
  color: string
}

export type CompensationStep = {
  window: GridWindow
  segments: GridSegment[]
}

export type NetworkPlan = {
  baseSegments: GridSegment[]
  compensationSteps: CompensationStep[]
}

type SeededRandom = () => number

type WindowProbePair = {
  from: number
  to: number
  distance: number
  score: number
}

type NetworkDistanceScratch = {
  distances: Int16Array
  seen: Uint16Array
  queue: Int32Array
  token: number
}

const directions: GridDirection[] = [
  { row: -1, col: 0 },
  { row: 0, col: 1 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
]

// 每个滑窗选取 3 x 3 锚点，再向周围投射固定偏移，保证检查覆盖局部结构而不退化成纯随机抽样。
const windowAnchorOffsets = [2, Math.floor(WINDOW_SIZE / 2), WINDOW_SIZE - 3]

const windowProbeOffsets: GridDirection[] = [
  { row: -12, col: 0 },
  { row: 12, col: 0 },
  { row: 0, col: -12 },
  { row: 0, col: 12 },
  { row: -8, col: -4 },
  { row: -8, col: 4 },
  { row: 8, col: -4 },
  { row: 8, col: 4 },
  { row: -4, col: -8 },
  { row: -4, col: 8 },
  { row: 4, col: -8 },
  { row: 4, col: 8 },
  { row: -7, col: -7 },
  { row: -7, col: 7 },
  { row: 7, col: -7 },
  { row: 7, col: 7 },
  { row: -7, col: 0 },
  { row: 7, col: 0 },
  { row: 0, col: -7 },
  { row: 0, col: 7 },
  { row: -5, col: -5 },
  { row: -5, col: 5 },
  { row: 5, col: -5 },
  { row: 5, col: 5 },
  { row: -4, col: 0 },
  { row: 4, col: 0 },
  { row: 0, col: -4 },
  { row: 0, col: 4 },
]

const pathColors = [
  '#22d3ee',
  '#a78bfa',
  '#34d399',
  '#fbbf24',
  '#fb7185',
  '#60a5fa',
  '#f472b6',
  '#2dd4bf',
]

const DEFAULT_PATH_COLOR = pathColors[0] ?? '#22d3ee'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export const createRandomSeed = () => Array.from({ length: SEED_DIGITS }, () => Math.floor(Math.random() * 10)).join('')

export const formatSeed = (seed: string) => seed.padStart(SEED_DIGITS, '0').slice(-SEED_DIGITS)

export const normalizeSeed = (value: string, fallbackSeed: string) => {
  const digits = value.replace(/\D/g, '')
  if (!digits) return fallbackSeed

  return formatSeed(digits.slice(0, SEED_DIGITS))
}

/**
 * 十进制 16 位 seed 经 BigInt 扩散后进入 Mulberry32。
 * 同一 seed 会得到完全一致的随机序列，因此渲染、测试和问题复现都可以靠 seed 定位。
 */
const createSeededRandom = (seed: string): SeededRandom => {
  const seedValue = BigInt(formatSeed(seed))
  let state = Number((seedValue ^ (seedValue >> 32n)) & 0xffffffffn) >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let mixed = state
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

export const getPointRow = (index: number) => Math.floor(index / GRID_SIZE)

export const getPointCol = (index: number) => index % GRID_SIZE

const getPointIndex = (row: number, col: number) => row * GRID_SIZE + col

const getEdgeKey = (from: number, to: number) => from < to ? `${from}:${to}` : `${to}:${from}`

const getRandomInt = (max: number, random: SeededRandom) => Math.floor(random() * max)

/**
 * 基础路径长度使用近似正态分布。
 * 大多数路径保持中等长度，少量短路径和长路径提供自然的随机游走纹理。
 */
const getNormalPathLength = (random: SeededRandom) => {
  const u = Math.max(random(), Number.EPSILON)
  const v = Math.max(random(), Number.EPSILON)
  const standardNormal = Math.sqrt(-2 * Math.log(u)) * Math.cos(Math.PI * 2 * v)

  return Math.round(clamp(72 + standardNormal * 28, 18, 160))
}

const getRandomUnvisitedPoint = (visited: Uint8Array, random: SeededRandom) => {
  for (let attempt = 0; attempt < 96; attempt += 1) {
    const candidate = getRandomInt(POINT_COUNT, random)
    if (!visited[candidate]) return candidate
  }

  for (let index = 0; index < POINT_COUNT; index += 1) {
    if (!visited[index]) return index
  }

  return -1
}

/**
 * 随机游走的方向选择同时考虑直行惯性和未覆盖点偏好。
 * 这样生成的主干既不会过度折返，也会尽量向尚未覆盖的区域推进。
 */
const getWeightedDirection = (
  current: number,
  previousDirection: GridDirection | null,
  covered: Uint8Array,
  random: SeededRandom,
) => {
  const row = getPointRow(current)
  const col = getPointCol(current)
  const candidates = directions
    .filter((direction) => {
      if (previousDirection && direction.row === -previousDirection.row && direction.col === -previousDirection.col) {
        return false
      }

      const nextRow = row + direction.row
      const nextCol = col + direction.col
      return nextRow >= 0 && nextRow < GRID_SIZE && nextCol >= 0 && nextCol < GRID_SIZE
    })
    .map((direction) => {
      const next = getPointIndex(row + direction.row, col + direction.col)
      const straightBias = previousDirection && direction.row === previousDirection.row && direction.col === previousDirection.col ? 2.2 : 1
      const unvisitedBias = covered[next] ? 0.75 : 1.4

      return {
        direction,
        next,
        weight: straightBias * unvisitedBias,
      }
  })

  const totalWeight = candidates.reduce((sum, candidate) => sum + candidate.weight, 0)
  let cursor = random() * totalWeight

  for (const candidate of candidates) {
    cursor -= candidate.weight
    if (cursor <= 0) return candidate
  }

  return candidates[candidates.length - 1] ?? null
}

const findNearbyConnectedPoint = (from: number, connectedPoints: number[], random: SeededRandom) => {
  let bestPoint = connectedPoints[getRandomInt(connectedPoints.length, random)] ?? 0
  let bestDistance = Number.POSITIVE_INFINITY
  const fromRow = getPointRow(from)
  const fromCol = getPointCol(from)
  const sampleCount = Math.min(80, connectedPoints.length)

  for (let index = 0; index < sampleCount; index += 1) {
    const candidate = connectedPoints[getRandomInt(connectedPoints.length, random)] ?? bestPoint
    const distance = Math.abs(fromRow - getPointRow(candidate)) + Math.abs(fromCol - getPointCol(candidate))
    if (distance < bestDistance) {
      bestPoint = candidate
      bestDistance = distance
    }
  }

  return bestPoint
}

const createConnectionPath = (from: number, to: number, random: SeededRandom) => {
  const path: number[] = []
  let row = getPointRow(from)
  let col = getPointCol(from)
  const targetRow = getPointRow(to)
  const targetCol = getPointCol(to)
  const firstAxis = random() < 0.5 ? 'row' : 'col'

  const walkRows = () => {
    while (row !== targetRow) {
      row += row < targetRow ? 1 : -1
      path.push(getPointIndex(row, col))
    }
  }

  const walkCols = () => {
    while (col !== targetCol) {
      col += col < targetCol ? 1 : -1
      path.push(getPointIndex(row, col))
    }
  }

  if (firstAxis === 'row') {
    walkRows()
    walkCols()
  } else {
    walkCols()
    walkRows()
  }

  return path
}

const createAdjacency = () => Array.from({ length: POINT_COUNT }, () => new Set<number>())

const createNetworkDistanceScratch = (): NetworkDistanceScratch => ({
  distances: new Int16Array(POINT_COUNT),
  seen: new Uint16Array(POINT_COUNT),
  queue: new Int32Array(POINT_COUNT),
  token: 0,
})

const getManhattanDistance = (from: number, to: number) => (
  Math.abs(getPointRow(from) - getPointRow(to)) + Math.abs(getPointCol(from) - getPointCol(to))
)

/**
 * 在已有网络上做带上限的 BFS。
 * 只关心是否能在 limit 步内到达目标，所以超过 limit 的分支会立即剪枝。
 */
const getLimitedNetworkDistance = (
  from: number,
  to: number,
  adjacency: Set<number>[],
  limit: number,
  scratch: NetworkDistanceScratch,
) => {
  if (from === to) return 0

  scratch.token += 1
  if (scratch.token >= 0xffff) {
    scratch.seen.fill(0)
    scratch.token = 1
  }

  const token = scratch.token
  let head = 0
  let tail = 0
  scratch.queue[tail] = from
  tail += 1
  scratch.seen[from] = token
  scratch.distances[from] = 0

  while (head < tail) {
    const current = scratch.queue[head]
    head += 1
    if (current === undefined) continue

    const nextDistance = (scratch.distances[current] ?? -1) + 1
    if (nextDistance > limit) continue

    for (const next of adjacency[current] ?? []) {
      if (scratch.seen[next] === token) continue
      if (next === to) return nextDistance

      scratch.seen[next] = token
      scratch.distances[next] = nextDistance
      scratch.queue[tail] = next
      tail += 1
    }
  }

  return Number.POSITIVE_INFINITY
}

const createWindowProbePairs = (window: GridWindow, random: SeededRandom) => {
  const pairs: WindowProbePair[] = []
  const pairKeys = new Set<string>()

  for (const rowOffset of windowAnchorOffsets) {
    for (const colOffset of windowAnchorOffsets) {
      const fromRow = window.top + rowOffset
      const fromCol = window.left + colOffset

      for (const offset of windowProbeOffsets) {
        const toRow = fromRow + offset.row
        const toCol = fromCol + offset.col
        if (toRow < window.top || toRow >= window.top + WINDOW_SIZE) continue
        if (toCol < window.left || toCol >= window.left + WINDOW_SIZE) continue

        const from = getPointIndex(fromRow, fromCol)
        const to = getPointIndex(toRow, toCol)
        const distance = getManhattanDistance(from, to)
        if (distance < WINDOW_MIN_DISTANCE || distance > WINDOW_NEAR_DISTANCE) continue

        const pairKey = getEdgeKey(from, to)
        if (pairKeys.has(pairKey)) continue

        pairKeys.add(pairKey)
        pairs.push({
          from,
          to,
          distance,
          score: distance + random() * 0.001,
        })
      }
    }
  }

  return pairs
    .sort((left, right) => right.score - left.score)
    .slice(0, WINDOW_PAIR_PROBES)
}

/**
 * 滑窗补偿负责修正局部“近点远路”。
 * 每个窗口最多补若干条短曼哈顿路径，既改善连通效率，也避免补偿线淹没随机游走纹理。
 */
const addSlidingWindowCompensation = (
  random: SeededRandom,
  adjacency: Set<number>[],
  addSegment: (from: number, to: number, color: string) => boolean,
) => {
  let compensationEdges = 0
  let compensationPathIndex = 0
  const steps: CompensationStep[] = []
  const scratch = createNetworkDistanceScratch()

  const addCompensationPath = (from: number, to: number) => {
    const color = pathColors[(compensationPathIndex + 3) % pathColors.length] ?? DEFAULT_PATH_COLOR
    let current = from
    const path = createConnectionPath(from, to, random)
    const windowSegments: GridSegment[] = []

    for (const next of path) {
      if (compensationEdges >= COMPENSATION_EDGE_LIMIT) break

      if (addSegment(current, next, color)) {
        windowSegments.push({ from: current, to: next, color })
        compensationEdges += 1
      }

      current = next
    }

    compensationPathIndex += 1
    return windowSegments
  }

  const getDistanceLimit = (distance: number) => {
    return Math.max(
      distance + WINDOW_DISTANCE_TOLERANCE,
      Math.ceil(distance * WINDOW_STRETCH_LIMIT),
    )
  }

  for (let top = 0; top <= GRID_SIZE - WINDOW_SIZE; top += WINDOW_STEP) {
    for (let left = 0; left <= GRID_SIZE - WINDOW_SIZE; left += WINDOW_STEP) {
      if (compensationEdges >= COMPENSATION_EDGE_LIMIT) return steps

      const window = { top, left }
      const step: CompensationStep = {
        window,
        segments: [],
      }

      let compensationPaths = 0
      const probePairs = createWindowProbePairs(window, random)

      for (const pair of probePairs) {
        if (compensationEdges >= COMPENSATION_EDGE_LIMIT) break
        if (compensationPaths >= MAX_COMPENSATION_PATHS_PER_WINDOW) break

        const distanceLimit = getDistanceLimit(pair.distance)
        const networkDistance = getLimitedNetworkDistance(pair.from, pair.to, adjacency, distanceLimit, scratch)

        if (networkDistance > distanceLimit) {
          const segments = addCompensationPath(pair.from, pair.to)
          if (segments.length > 0) {
            step.segments.push(...segments)
            compensationPaths += 1
          }
        }
      }

      steps.push(step)
    }
  }

  return steps
}

export const generateNetworkPlan = (seed: string): NetworkPlan => {
  const random = createSeededRandom(seed)
  const covered = new Uint8Array(POINT_COUNT)
  const connectedPoints: number[] = []
  const edgeKeys = new Set<string>()
  const segments: GridSegment[] = []
  const adjacency = createAdjacency()
  let connectedCount = 0
  let pathIndex = 0

  const markCovered = (point: number) => {
    if (covered[point]) return

    covered[point] = 1
    connectedPoints.push(point)
    connectedCount += 1
  }

  const addSegment = (from: number, to: number, color: string) => {
    if (from === to) return false

    const edgeKey = getEdgeKey(from, to)
    if (edgeKeys.has(edgeKey)) return false

    edgeKeys.add(edgeKey)
    adjacency[from]?.add(to)
    adjacency[to]?.add(from)
    segments.push({ from, to, color })
    return true
  }

  markCovered(getRandomInt(POINT_COUNT, random))

  while (connectedCount < POINT_COUNT) {
    const start = getRandomUnvisitedPoint(covered, random)
    if (start < 0) break

    const color = pathColors[pathIndex % pathColors.length] ?? DEFAULT_PATH_COLOR
    const maxLength = getNormalPathLength(random)
    let current = start
    let previousDirection: GridDirection | null = null
    let hasReachedNetwork = false
    const pathPoints = [current]
    const localPoints = new Set<number>(pathPoints)

    const pushLocalPoint = (point: number) => {
      if (localPoints.has(point)) return

      localPoints.add(point)
      pathPoints.push(point)
    }

    for (let step = 0; step < maxLength; step += 1) {
      const candidate = getWeightedDirection(current, previousDirection, covered, random)
      if (!candidate) break

      addSegment(current, candidate.next, color)
      current = candidate.next
      previousDirection = candidate.direction

      if (covered[current]) {
        hasReachedNetwork = true
        break
      }

      pushLocalPoint(current)
    }

    if (!hasReachedNetwork && connectedPoints.length > 1) {
      const target = findNearbyConnectedPoint(current, connectedPoints, random)
      const connectionPath = createConnectionPath(current, target, random)

      for (const next of connectionPath) {
        addSegment(current, next, color)
        current = next

        if (!covered[next]) {
          pushLocalPoint(next)
        }

        if (next === target) break
      }
    }

    for (const point of pathPoints) {
      markCovered(point)
    }

    pathIndex += 1
  }

  const loopTarget = Math.floor(POINT_COUNT * LOOP_EDGE_RATIO)
  let loopEdges = 0
  let attempts = 0

  while (loopEdges < loopTarget && attempts < loopTarget * 28) {
    attempts += 1

    const from = getRandomInt(POINT_COUNT, random)
    const row = getPointRow(from)
    const col = getPointCol(from)
    const validDirections = directions.filter((direction) => {
      const nextRow = row + direction.row
      const nextCol = col + direction.col
      return nextRow >= 0 && nextRow < GRID_SIZE && nextCol >= 0 && nextCol < GRID_SIZE
    })
    const direction = validDirections[getRandomInt(validDirections.length, random)]
    if (!direction) continue

    const to = getPointIndex(row + direction.row, col + direction.col)
    const color = pathColors[(pathIndex + loopEdges) % pathColors.length] ?? DEFAULT_PATH_COLOR

    if (addSegment(from, to, color)) {
      loopEdges += 1
    }
  }

  const baseSegments = [...segments]
  const compensationSteps = addSlidingWindowCompensation(random, adjacency, addSegment)

  return {
    baseSegments,
    compensationSteps,
  }
}
