/**
 * gridNetwork 工具测试。
 *
 * 这里直接验证 GridView 拆出的纯算法层：
 * 1. seed 规范化保持 16 位十进制语义。
 * 2. 同一 seed 生成稳定的基础路径和补偿路径。
 * 3. 滑窗补偿确实会给最终网络增加额外边。
 */
import { describe, expect, it } from 'vitest'
import {
  GRID_SIZE,
  POINT_COUNT,
  SEED_DIGITS,
  WINDOW_SIZE,
  formatSeed,
  generateNetworkPlan,
  getPointCol,
  getPointRow,
  normalizeSeed,
} from '@/utils/gridNetwork'

const getEdgeKey = (from: number, to: number) => from < to ? `${from}:${to}` : `${to}:${from}`

describe('gridNetwork 点阵网络生成工具', () => {
  it('应该规范化 16 位十进制种子', () => {
    expect(formatSeed('123')).toBe('0000000000000123')
    expect(normalizeSeed('abc9876543210123456789', '0000000000000001')).toHaveLength(SEED_DIGITS)
    expect(normalizeSeed('abc', '0000000000000001')).toBe('0000000000000001')
  })

  it('同一 seed 应该生成稳定的网络计划', () => {
    const firstPlan = generateNetworkPlan('0000000000000001')
    const secondPlan = generateNetworkPlan('0000000000000001')

    expect(secondPlan.baseSegments.length).toBe(firstPlan.baseSegments.length)
    expect(secondPlan.compensationSteps.length).toBe(firstPlan.compensationSteps.length)
    expect(secondPlan.baseSegments.slice(0, 10)).toEqual(firstPlan.baseSegments.slice(0, 10))
  }, 15000)

  it('滑窗补偿应该向基础随机游走之外追加路径', () => {
    const plan = generateNetworkPlan('0000000000000002')
    const compensationSegmentCount = plan.compensationSteps.reduce((sum, step) => sum + step.segments.length, 0)

    expect(plan.baseSegments.length).toBeGreaterThan(0)
    expect(compensationSegmentCount).toBeGreaterThan(0)
    expect(plan.detectionSteps.length).toBe(plan.compensationSteps.length)
  })

  it('滑窗区域应该覆盖全部节点', () => {
    const plan = generateNetworkPlan('0000000000000003')
    const covered = new Uint8Array(POINT_COUNT)

    for (const step of plan.detectionSteps) {
      for (let row = step.window.top; row < step.window.top + WINDOW_SIZE; row += 1) {
        for (let col = step.window.left; col < step.window.left + WINDOW_SIZE; col += 1) {
          covered[row * GRID_SIZE + col] = 1
        }
      }
    }

    expect(covered.reduce((sum, value) => sum + value, 0)).toBe(POINT_COUNT)
  })

  it('滑窗探测点对应全局去重并保留判定元数据', () => {
    const plan = generateNetworkPlan('0000000000000004')
    const checkedPairs = new Set<string>()
    let compensatedProbeCount = 0

    for (const step of plan.detectionSteps) {
      for (const probe of step.probes) {
        const pairKey = getEdgeKey(probe.from, probe.to)
        expect(checkedPairs.has(pairKey)).toBe(false)
        checkedPairs.add(pairKey)

        expect(probe.distance).toBeGreaterThanOrEqual(3)
        expect(probe.distance).toBeLessThanOrEqual(12)
        expect(probe.distanceLimit).toBeGreaterThanOrEqual(probe.distance)
        expect(Number.isFinite(probe.networkDistance) || probe.networkDistance === Number.POSITIVE_INFINITY).toBe(true)
        expect(probe.compensated).toBe(probe.networkDistance > probe.distanceLimit)

        const fromRow = getPointRow(probe.from)
        const fromCol = getPointCol(probe.from)
        const toRow = getPointRow(probe.to)
        const toCol = getPointCol(probe.to)
        expect(fromRow).toBeGreaterThanOrEqual(step.window.top)
        expect(fromRow).toBeLessThan(step.window.top + WINDOW_SIZE)
        expect(fromCol).toBeGreaterThanOrEqual(step.window.left)
        expect(fromCol).toBeLessThan(step.window.left + WINDOW_SIZE)
        expect(toRow).toBeGreaterThanOrEqual(step.window.top)
        expect(toRow).toBeLessThan(step.window.top + WINDOW_SIZE)
        expect(toCol).toBeGreaterThanOrEqual(step.window.left)
        expect(toCol).toBeLessThan(step.window.left + WINDOW_SIZE)

        if (probe.compensated) compensatedProbeCount += 1
      }
    }

    expect(checkedPairs.size).toBeGreaterThan(0)
    expect(compensatedProbeCount).toBeGreaterThan(0)
  })

  it('生成的网络应该覆盖为单个连通图', () => {
    const plan = generateNetworkPlan('0000000000000042')
    const adjacency = Array.from({ length: POINT_COUNT }, () => [] as number[])
    const allSegments = [
      ...plan.baseSegments,
      ...plan.compensationSteps.flatMap((step) => step.segments),
    ]

    for (const segment of allSegments) {
      adjacency[segment.from]?.push(segment.to)
      adjacency[segment.to]?.push(segment.from)
    }

    const seen = new Uint8Array(POINT_COUNT)
    const queue = [0]
    seen[0] = 1
    for (let head = 0; head < queue.length; head += 1) {
      const current = queue[head]
      if (current === undefined) continue
      for (const next of adjacency[current] ?? []) {
        if (seen[next]) continue
        seen[next] = 1
        queue.push(next)
      }
    }

    expect(seen.reduce((sum, value) => sum + value, 0)).toBe(POINT_COUNT)
  })

  it('生成耗时应保持在可接受预算内', () => {
    const startedAt = performance.now()
    const plan = generateNetworkPlan('0000000000000100')
    const duration = performance.now() - startedAt

    expect(plan.baseSegments.length).toBeGreaterThanOrEqual(POINT_COUNT - 1)
    expect(duration).toBeLessThan(2500)
  }, 10000)
})
