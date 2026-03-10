/**
 * composables/useEcosystem.ts
 *
 * 生态系统核心控制器。
 * 核心逻辑：
 * 1. 管理 Canvas 渲染循环 (requestAnimationFrame)。
 * 2. 驱动物理仿真逻辑，包括 Boids 群集行为、捕食者猎杀及进化博弈。
 * 3. 应用空间哈希 (Spatial Hashing) 算法，将碰撞检测与行为计算从 $O(n^2)$ 优化至 $O(n)$。
 * 4. 同步实时统计数据至全局状态库 (Pinia)。
 */
import { onMounted, onUnmounted, type Ref } from 'vue'
import { Particle, Predator, CONFIG, SpatialHash } from '@/models/Ecosystem'
import { useEcosystemStore } from '@/stores/ecosystem'

export function useEcosystem(
  canvasRef: Ref<HTMLCanvasElement | null>,
  containerRef: Ref<HTMLDivElement | null>,
) {
  const store = useEcosystemStore()
  const particles: Particle[] = [] // 猎物粒子群
  const predators: Predator[] = [] // 捕食者群
  const mouse = { x: 0, y: 0, active: false } // 鼠标交互位置

  // 初始化空间哈希表，网格大小设为实体的感知半径以平衡计算量
  const spatialHash = new SpatialHash(CONFIG.PERCEPTION_RADIUS)

  let animationFrame: number
  let resizeObserver: ResizeObserver
  let ecosystemStartTime = 0
  let lastFrameTime = 0

  /**
   * 重置/初始化生态系统
   * 负责重置实体数组、清空统计数据并注入初始种群
   */
  const startEcosystem = () => {
    if (!canvasRef.value) return
    particles.length = 0
    predators.length = 0
    store.state.peak = 0
    // 注入初始 80 个猎物粒子
    for (let i = 0; i < 80; i++) {
      particles.push(new Particle(canvasRef.value.width, canvasRef.value.height))
    }
    ecosystemStartTime = Date.now()
    lastFrameTime = performance.now()
    store.state.status = '运行中'
  }

  /**
   * 物理与行为逻辑处理核心
   * 按帧执行：空间划分 -> 捕食者逻辑 -> 猎物逻辑
   * @param deltaTime 帧时间增量 (ms)
   * @param currentTime 当前物理时间戳
   * @param canvas 画布 DOM，提供边界信息
   */
  const updatePhysics = (deltaTime: number, currentTime: number, canvas: HTMLCanvasElement) => {
    // 1. 构建本帧的空间哈希表，实现 $O(n)$ 的邻域查找
    spatialHash.clear()
    particles.forEach((p) => spatialHash.insert(p))

    // 2. 更新捕食者行为逻辑
    for (let i = predators.length - 1; i >= 0; i--) {
      const pred = predators[i]
      if (!pred) continue
      
      // 死亡状态判定：若处于死亡过程且动画完成，则从数组移除
      if (pred.isDying && pred.deathProgress >= 1) {
        predators.splice(i, 1)
        continue
      }
      
      // 饥饿逻辑判定：若长时间未进食 (k 秒)，进入死亡状态
      if (!pred.isDying && currentTime - pred.lastMealTime > store.params.k * 1000) {
        pred.isDying = true
      }
      
      pred.update(particles, canvas.width, canvas.height)

      // 猎杀冲突判定：检查捕食者与猎物的碰撞
      if (!pred.isDying) {
        for (let j = particles.length - 1; j >= 0; j--) {
          const p = particles[j]
          if (!p) continue
          const d2 = (pred.x - p.x) ** 2 + (pred.y - p.y) ** 2
          if (d2 < (pred.radius + p.radius) ** 2) {
            particles.splice(j, 1) // 猎物被捕获移除
            pred.lastMealTime = currentTime // 重置进食时间
          }
        }
      }
    }

    // 3. 更新猎物粒子行为逻辑
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      if (!p) continue
      
      // 突变判定：猎物有一定概率突变为捕食者
      const mutationChance = (store.params.m / 1000) * (deltaTime / 1000)
      if (Math.random() < mutationChance) {
        predators.push(new Predator(p.x, p.y))
        particles.splice(i, 1)
        continue
      }

      // 繁衍判定：满足繁衍周期 (n 秒) 且未达到种群上限时产生后代
      if (currentTime - p.lastReproductionTime > store.params.n * 1000) {
        if (particles.length < CONFIG.HARD_CAP) {
          particles.push(new Particle(canvas.width, canvas.height, p.x, p.y))
        }
        p.lastReproductionTime = currentTime
      }

      // 核心优化应用：仅从空间哈希表的邻近网格内获取粒子，极大减少 Boids 计算量
      const nearby = spatialHash.getNearby(p.x, p.y)
      p.flock(nearby, predators, store.params.minSpacing)

      // 处理鼠标交互：驱散或吸引
      if (mouse.active) p.steer(mouse.x, mouse.y, CONFIG.MOUSE_WEIGHT)
      
      p.update(canvas.width, canvas.height)
    }
  }

  /**
   * 视觉渲染处理
   * 负责 Canvas 绘图，包括实体绘制与粒子间的动态连线
   */
  const drawEntities = (ctx: CanvasRenderingContext2D) => {
    // 绘制捕食者实体
    predators.forEach((pred) => pred.draw(ctx))

    // 绘制粒子连线：基于空间哈希优化，仅在邻近粒子间建立连线
    ctx.lineWidth = 0.5
    particles.forEach((p) => {
      const nearby = spatialHash.getNearby(p.x, p.y)
      nearby.forEach((other) => {
        if (p === other) return
        const d2 = (p.x - other.x) ** 2 + (p.y - other.y) ** 2
        // 距离阈值判定，确保连线平滑
        if (d2 < 8000) {
          ctx.beginPath()
          ctx.moveTo(p.x, p.y)
          ctx.lineTo(other.x, other.y)
          // 根据距离计算透明度，实现渐隐效果
          ctx.strokeStyle = `rgba(148, 163, 184, ${(1 - Math.sqrt(d2) / 90) * 0.4})`
          ctx.stroke()
        }
      })
      p.draw(ctx) // 绘制粒子本体
    })
  }

  /**
   * 主循环入口 (Game Loop)
   * 负责状态更新、时间校准以及驱动物理与渲染步骤
   */
  const loop = (timestamp: number) => {
    const canvas = canvasRef.value
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 计算帧率无关的时间增量
    let deltaTime = timestamp - lastFrameTime
    lastFrameTime = timestamp
    if (deltaTime > 100) deltaTime = 16 // 防止后台切换后的跳帧现象
    const currentTime = Date.now()

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 更新全局实时统计数据
    if (store.state.status === '运行中') {
      store.state.uptime = Math.floor((currentTime - ecosystemStartTime) / 1000)
      store.state.preys = particles.length
      store.state.predators = predators.length
      const currentPop = particles.length + predators.length
      // 更新历史最高种群峰值
      if (currentPop > store.state.peak) store.state.peak = currentPop

      // 灭绝判定：当所有实体均消失时
      if (particles.length === 0 && predators.length === 0) {
        store.state.status = '已崩溃'
        // 记录本纪元的数据日志
        store.addLog({
          id: currentTime,
          uptime: store.state.uptime,
          peak: store.state.peak,
          n: store.params.n,
          m: store.params.m,
          k: store.params.k,
        })
        // 自动触发重启逻辑
        setTimeout(() => {
          store.state.status = '重启中'
          setTimeout(() => startEcosystem(), 1000)
        }, 2000)
      }
    }

    // 执行物理步进与视觉渲染
    updatePhysics(deltaTime, currentTime, canvas)
    drawEntities(ctx)

    // 请求下一帧
    animationFrame = requestAnimationFrame(loop)
  }

  /**
   * 处理画布尺寸自适应
   */
  const handleResize = () => {
    if (!canvasRef.value || !containerRef.value) return
    canvasRef.value.width = containerRef.value.clientWidth
    canvasRef.value.height = containerRef.value.clientHeight
  }

  onMounted(() => {
    if (!canvasRef.value || !containerRef.value) return
    handleResize()
    // 监听容器尺寸变化
    resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(containerRef.value)
    
    startEcosystem()
    animationFrame = requestAnimationFrame(loop)
  })

  onUnmounted(() => {
    // 组件销毁时务必停止循环并取消 DOM 监听，防止内存泄漏
    cancelAnimationFrame(animationFrame)
    if (resizeObserver) resizeObserver.disconnect()
  })

  return { mouse }
}
