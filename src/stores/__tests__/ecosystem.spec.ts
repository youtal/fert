/**
 * stores/__tests__/ecosystem.spec.ts
 * 
 * 生态系统状态库单元测试。
 * 验证 Pinia store 的初始状态、参数更新及历史日志管理逻辑。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEcosystemStore } from '../ecosystem'

describe('Ecosystem Store (状态管理) 测试', () => {
  beforeEach(() => {
    // 每次测试前初始化干净的 Pinia 实例
    setActivePinia(createPinia())
  })

  it('应该使用正确的默认值初始化', () => {
    const store = useEcosystemStore()
    expect(store.params.n).toBe(8)
    expect(store.params.m).toBe(4)
    expect(store.params.k).toBe(6)
    expect(store.state.status).toBe('运行中')
    expect(store.historyLogs).toHaveLength(0)
  })

  it('应该能响应式更新控制参数', () => {
    const store = useEcosystemStore()
    store.params.n = 10
    expect(store.params.n).toBe(10)
  })

  it('应该将非法参数钳制回安全范围', () => {
    const store = useEcosystemStore()
    store.params.n = Number.POSITIVE_INFINITY
    store.params.m = -5
    store.params.k = 999
    store.params.minSpacing = Number.NaN

    const sanitized = store.sanitizeParams()

    expect(sanitized.n).toBe(8)
    expect(sanitized.m).toBe(0)
    expect(sanitized.k).toBe(15)
    expect(sanitized.minSpacing).toBe(35)
  })

  it('添加日志时应保持最多 5 条记录的上限', () => {
    const store = useEcosystemStore()
    // 用工厂函数表达日志结构，避免测试被无关字段噪音淹没。
    const createLog = (id: number) => ({
      id,
      uptime: id * 10,
      peak: 100,
      n: 8, m: 4, k: 6
    })

    // 连续添加 6 条记录
    for (let i = 1; i <= 6; i++) {
      store.addLog(createLog(i))
    }

    // 验证长度限制
    expect(store.historyLogs).toHaveLength(5)
    // 验证顺序（最新记录排在最前）
    expect(store.historyLogs[0]?.id).toBe(6) 
    // 验证旧记录被剔除（id 为 1 的记录应已消失）
    expect(store.historyLogs[4]?.id).toBe(2) 
  })
})
