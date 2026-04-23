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
  SEED_DIGITS,
  formatSeed,
  generateNetworkPlan,
  normalizeSeed,
} from '@/utils/gridNetwork'

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
  })

  it('滑窗补偿应该向基础随机游走之外追加路径', () => {
    const plan = generateNetworkPlan('0000000000000002')
    const compensationSegmentCount = plan.compensationSteps.reduce((sum, step) => sum + step.segments.length, 0)

    expect(plan.baseSegments.length).toBeGreaterThan(0)
    expect(compensationSegmentCount).toBeGreaterThan(0)
  })
})
