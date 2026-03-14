/**
 * models/__tests__/Ecosystem.spec.ts
 * 
 * 生态系统模型单元测试。
 * 验证空间哈希优化算法、猎物粒子行为及捕食者追踪逻辑的正确性。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SpatialHash, Particle, Predator, CONFIG } from '../Ecosystem'

describe('SpatialHash (空间哈希) 测试', () => {
  let hash: SpatialHash<{ x: number; y: number }>
  const cellSize = 100

  beforeEach(() => {
    // 每个用例都重建哈希，避免上一个用例的插入结果残留在 cells 中。
    hash = new SpatialHash(cellSize)
  })

  it('应该能插入并检索同一网格内的对象', () => {
    const obj = { x: 50, y: 50 }
    hash.insert(obj)
    const nearby = hash.getNearby(50, 50)
    expect(nearby).toContain(obj)
  })

  it('应该能检索相邻网格内的对象', () => {
    const obj = { x: 150, y: 50 } // 位于网格 (1, 0)
    hash.insert(obj)
    const nearby = hash.getNearby(50, 50) // 搜索网格 (0, 0) 及其邻居
    expect(nearby).toContain(obj)
  })

  it('不应该检索到远距离网格的对象', () => {
    const obj = { x: 250, y: 50 } // 位于网格 (2, 0)
    hash.insert(obj)
    const nearby = hash.getNearby(50, 50) // 搜索范围仅涵盖 (1, 1) 以内的网格
    expect(nearby).not.toContain(obj)
  })

  it('能够正确清空网格', () => {
    hash.insert({ x: 50, y: 50 })
    hash.clear()
    expect(hash.getNearby(50, 50)).toEqual([])
  })
})

describe('Particle (猎物粒子) 测试', () => {
  it('初始化时应在画布边界内的随机位置', () => {
    const w = 800, h = 600
    const p = new Particle(w, h)
    expect(p.x).toBeGreaterThanOrEqual(0)
    expect(p.x).toBeLessThanOrEqual(w)
    expect(p.y).toBeGreaterThanOrEqual(0)
    expect(p.y).toBeLessThanOrEqual(h)
  })

  it('更新位置时应遵守边界约束（反弹逻辑）', () => {
    const w = 100, h = 100
    const p = new Particle(w, h, 99, 50)
    p.vx = 5 // 向右移动
    p.update(w, h)
    // 应反弹回边界内
    expect(p.x).toBeLessThanOrEqual(w - p.radius)
    expect(p.vx).toBeLessThan(0) 
  })

  it('施加力应改变速度', () => {
    const w = 800, h = 600
    const p = new Particle(w, h, 400, 300)
    p.vx = 0; p.vy = 0;
    p.applyForce(1, 0)
    p.update(w, h)
    expect(p.vx).toBeGreaterThan(0)
  })

  it('速度应被限制在最大速度 CONFIG.MAX_SPEED 之内', () => {
    const w = 800, h = 600
    const p = new Particle(w, h, 400, 300)
    p.vx = CONFIG.MAX_SPEED; p.vy = 0
    p.applyForce(10, 0) // 施加巨大推力
    p.update(w, h)
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
    expect(speed).toBeCloseTo(CONFIG.MAX_SPEED)
  })

  it('时间步缩短时位移应按比例缩放', () => {
    const w = 800, h = 600
    const p = new Particle(w, h, 100, 100)
    p.vx = CONFIG.MAX_SPEED
    p.vy = 0
    p.ax = 0
    p.ay = 0

    p.update(w, h, 0.5)

    expect(p.x).toBeCloseTo(100 + CONFIG.MAX_SPEED * 0.5)
  })
})

describe('Predator (捕食者) 测试', () => {
  it('应该追踪最近的粒子目标', () => {
    const w = 800, h = 600
    const pred = new Predator(400, 300)
    const p1 = new Particle(w, h, 410, 300) // 距离 10 单位
    const p2 = new Particle(w, h, 500, 300) // 距离 100 单位
    
    const initialVx = pred.vx
    pred.update([p1, p2], w, h)
    // 应朝向 p1 移动（x 轴正向加速）
    expect(pred.vx).toBeGreaterThan(initialVx)
  })

  it('死亡状态下应增加死亡动画进度', () => {
    const pred = new Predator(100, 100)
    pred.isDying = true
    const initialProgress = pred.deathProgress
    pred.update([], 800, 600)
    expect(pred.deathProgress).toBeGreaterThan(initialProgress)
  })

  it('死亡动画进度应随时间步缩放', () => {
    const pred = new Predator(100, 100)
    pred.isDying = true

    pred.update([], 800, 600, 0.5)

    expect(pred.deathProgress).toBeCloseTo(0.0125)
  })
})
