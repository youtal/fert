/**
 * composables/useEcosystem.ts
 *
 * 生态系统核心控制器。
 * 仿真推进与前台渲染分离：
 * 1. 仿真始终在后台持续推进。
 * 2. 仅在视图激活时执行 Canvas 绘制。
 *
 * 当前实现把运行时提升为模块级单例，显式表达“全应用只允许一个生态系统纪元”。
 * 这样可以避免未来重复挂载或错误复用时创建多套后台时钟。
 */
import { ref, onMounted, onUnmounted, onActivated, onDeactivated, type Ref } from 'vue'
import { Particle, Predator, CONFIG, SpatialHash } from '@/models/Ecosystem'
import { useEcosystemStore } from '@/stores/ecosystem'

type EcosystemRuntime = ReturnType<typeof createEcosystemRuntime>

let sharedRuntime: EcosystemRuntime | null = null
let runtimeConsumers = 0

/**
 * useEcosystem 把生态系统分为两个时钟：
 * 1. `setInterval` 驱动的后台仿真时钟，保证切走页面后仍持续推进。
 * 2. `requestAnimationFrame` 驱动的前台绘制时钟，仅在视图激活时运行。
 */
export function useEcosystem() {
  const store = useEcosystemStore()
  const runtime = sharedRuntime ?? createEcosystemRuntime(store)
  sharedRuntime = runtime
  runtimeConsumers++

  const canvasRef = ref<HTMLCanvasElement | null>(null)
  const containerRef = ref<HTMLDivElement | null>(null)

  /**
   * 接收渲染层暴露出的 DOM ref，并完成首次初始化。
   * 这里统一绑定 ResizeObserver，避免视图组件自己感知尺寸细节。
   */
  const setRefs = (canvas: Ref<HTMLCanvasElement | null>, container: Ref<HTMLDivElement | null>) => {
    canvasRef.value = canvas.value
    containerRef.value = container.value
    runtime.bindRefs(canvasRef.value, containerRef.value)
  }

  onMounted(() => {
    // 组件首次挂载时尝试恢复绘制；真正的仿真启动仍依赖 setRefs 提供真实 DOM。
    runtime.activateRendering()
  })

  onActivated(() => {
    runtime.handleResize()
    runtime.activateRendering()
  })

  onDeactivated(() => {
    runtime.deactivateRendering()
  })

  onUnmounted(() => {
    runtimeConsumers--
    if (runtimeConsumers <= 0) {
      runtime.dispose()
      sharedRuntime = null
      runtimeConsumers = 0
    }
  })

  return { mouse: runtime.mouse, setRefs }
}

const createEcosystemRuntime = (store: ReturnType<typeof useEcosystemStore>) => {
  const particles: Particle[] = []
  const predators: Predator[] = []
  const mouse = { x: 0, y: 0, active: false }
  const spatialHash = new SpatialHash<Particle>(CONFIG.PERCEPTION_RADIUS)

  let canvas: HTMLCanvasElement | null = null
  let container: HTMLDivElement | null = null
  let renderFrame: number | undefined
  let simulationTimer: ReturnType<typeof setInterval> | undefined
  let resizeObserver: ResizeObserver | undefined
  let ecosystemStartTime = 0
  let lastSimulationTime = 0
  let restartStatusTimeout: ReturnType<typeof setTimeout> | undefined
  let restartSimulationTimeout: ReturnType<typeof setTimeout> | undefined
  let isRenderActive = false
  let hasBoundRefs = false

  /**
   * 让 canvas 分辨率与容器实际像素尺寸同步。
   * 若不在这里做同步，CSS 缩放后的画布会导致坐标和清晰度都出现偏差。
   */
  const handleResize = () => {
    if (!canvas || !container) return
    const width = container.clientWidth
    const height = container.clientHeight
    if (width > 0 && height > 0) {
      canvas.width = width
      canvas.height = height
    }
  }

  /**
   * 重新建立一个干净纪元。
   * 这个入口既用于首次启动，也用于崩溃后的自动重启，因此会显式重置运行统计与实体数组。
   */
  const startEcosystem = () => {
    if (!canvas) return

    if (restartStatusTimeout) clearTimeout(restartStatusTimeout)
    if (restartSimulationTimeout) clearTimeout(restartSimulationTimeout)

    particles.length = 0
    predators.length = 0
    store.state.peak = 0
    store.sanitizeParams()

    for (let i = 0; i < 80; i++) {
      particles.push(new Particle(canvas.width, canvas.height))
    }

    ecosystemStartTime = Date.now()
    lastSimulationTime = performance.now()
    store.state.status = '运行中'
    store.state.uptime = 0
    store.state.preys = particles.length
    store.state.predators = predators.length
  }

  /**
   * 记录纪元终结并安排延迟重启。
   * 这里故意拆成两段 timeout，让 UI 先展示“已崩溃”，再切到“重启中”。
   */
  const scheduleRestart = (currentTime: number, n: number, m: number, k: number) => {
    store.state.status = '已崩溃'
    store.addLog({
      id: currentTime,
      uptime: store.state.uptime,
      peak: store.state.peak,
      n,
      m,
      k,
    })

    restartStatusTimeout = setTimeout(() => {
      store.state.status = '重启中'
      restartSimulationTimeout = setTimeout(() => startEcosystem(), 1000)
    }, 2000)
  }

  /**
   * 单步推进仿真。
   * 顺序为：同步时间 -> 刷新空间索引 -> 更新全局状态 -> 更新捕食者 -> 更新猎物。
   */
  const stepSimulation = (timestamp: number) => {
    if (!canvas) return

    let deltaTime = timestamp - lastSimulationTime
    lastSimulationTime = timestamp
    if (deltaTime > 100) deltaTime = 16

    const currentTime = Date.now()
    const params = store.sanitizeParams()
    const timeScale = deltaTime / CONFIG.FRAME_TIME_MS

    spatialHash.clear()
    particles.forEach((particle) => spatialHash.insert(particle))

    if (store.state.status === '运行中') {
      store.state.uptime = Math.floor((currentTime - ecosystemStartTime) / 1000)
      store.state.preys = particles.length
      store.state.predators = predators.length
      const currentPopulation = particles.length + predators.length
      if (currentPopulation > store.state.peak) store.state.peak = currentPopulation

      if (particles.length === 0 && predators.length === 0) {
        scheduleRestart(currentTime, params.n, params.m, params.k)
      }
    }

    for (let predatorIndex = predators.length - 1; predatorIndex >= 0; predatorIndex--) {
      const predator = predators[predatorIndex]
      if (!predator) continue

      if (predator.isDying && predator.deathProgress >= 1) {
        predators.splice(predatorIndex, 1)
        continue
      }

      if (!predator.isDying && currentTime - predator.lastMealTime > params.k * 1000) {
        predator.isDying = true
      }

      predator.update(particles, canvas.width, canvas.height, timeScale)

      if (predator.isDying) continue

      for (let particleIndex = particles.length - 1; particleIndex >= 0; particleIndex--) {
        const particle = particles[particleIndex]
        if (!particle) continue
        const distanceSquared = (predator.x - particle.x) ** 2 + (predator.y - particle.y) ** 2
        if (distanceSquared < (predator.radius + particle.radius) ** 2) {
          particles.splice(particleIndex, 1)
          predator.lastMealTime = currentTime
        }
      }
    }

    for (let particleIndex = particles.length - 1; particleIndex >= 0; particleIndex--) {
      const particle = particles[particleIndex]
      if (!particle) continue

      const mutationChance = (params.m / 1000) * (deltaTime / 1000)
      if (Math.random() < mutationChance) {
        predators.push(new Predator(particle.x, particle.y))
        particles.splice(particleIndex, 1)
        continue
      }

      if (currentTime - particle.lastReproductionTime > params.n * 1000) {
        if (particles.length + predators.length < CONFIG.HARD_CAP) {
          particles.push(new Particle(canvas.width, canvas.height, particle.x, particle.y))
        }
        particle.lastReproductionTime = currentTime
      }

      particle.flock(spatialHash.getNearby(particle.x, particle.y), predators, params.minSpacing, timeScale)
      if (mouse.active) particle.steer(mouse.x, mouse.y, CONFIG.MOUSE_WEIGHT, false, timeScale)
      particle.update(canvas.width, canvas.height, timeScale)
    }
  }

  /**
   * 前台渲染入口。
   * 该函数只读取当前实体快照进行绘制，不负责改变实体状态。
   */
  const renderScene = () => {
    if (!isRenderActive || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.lineWidth = 0.5

    const particleOrder = new Map<Particle, number>(particles.map((particle, index) => [particle, index]))

    for (let particleIndex = particles.length - 1; particleIndex >= 0; particleIndex--) {
      const particle = particles[particleIndex]
      if (!particle) continue

      for (const other of spatialHash.getNearby(particle.x, particle.y)) {
        const otherIndex = particleOrder.get(other)
        if (particle === other || otherIndex === undefined || otherIndex <= particleIndex) continue
        const distanceSquared = (particle.x - other.x) ** 2 + (particle.y - other.y) ** 2
        if (distanceSquared < 8000) {
          ctx.beginPath()
          ctx.moveTo(particle.x, particle.y)
          ctx.lineTo(other.x, other.y)
          ctx.strokeStyle = `rgba(148, 163, 184, ${(1 - Math.sqrt(distanceSquared) / 90) * 0.4})`
          ctx.stroke()
        }
      }

      particle.draw(ctx)
    }

    predators.forEach((predator) => predator.draw(ctx))
    renderFrame = requestAnimationFrame(renderScene)
  }

  /**
   * 开启后台仿真时钟。
   * 重复调用应保持幂等，避免 KeepAlive 激活/初始化过程中创建多个 interval。
   */
  const startSimulation = () => {
    if (simulationTimer) return
    lastSimulationTime = performance.now()
    simulationTimer = setInterval(() => {
      stepSimulation(performance.now())
    }, CONFIG.FRAME_TIME_MS)
  }

  /**
   * 停止后台仿真时钟。
   * 仅在最终卸载时调用；KeepAlive deactivated 不应停止仿真。
   */
  const stopSimulation = () => {
    if (!simulationTimer) return
    clearInterval(simulationTimer)
    simulationTimer = undefined
  }

  /**
   * 开启前台渲染循环。
   * 与仿真循环分离后，这里只在页面可见时运行，降低切页后的绘制开销。
   */
  const activateRendering = () => {
    if (isRenderActive || !canvas) return
    isRenderActive = true
    renderFrame = requestAnimationFrame(renderScene)
  }

  /**
   * 停止前台渲染循环，但保留仿真。
   * 这是 KeepAlive 场景下“切走仍继续计算”的关键之一。
   */
  const deactivateRendering = () => {
    isRenderActive = false
    if (renderFrame !== undefined) {
      cancelAnimationFrame(renderFrame)
      renderFrame = undefined
    }
  }

  /**
   * 单例运行时只接受第一组有效 DOM 引用。
   * 之后若有第二个实例尝试接管画布，则直接拒绝并保留原运行时，避免出现多套后台循环。
   */
  const bindRefs = (nextCanvas: HTMLCanvasElement | null, nextContainer: HTMLDivElement | null) => {
    if (!nextCanvas || !nextContainer) return

    if (hasBoundRefs && (canvas !== nextCanvas || container !== nextContainer)) {
      console.warn('[useEcosystem] duplicate runtime binding ignored; ecosystem is a singleton view.')
      return
    }

    canvas = nextCanvas
    container = nextContainer
    hasBoundRefs = true

    if (resizeObserver) resizeObserver.disconnect()
    handleResize()
    resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(container)

    startEcosystem()
    startSimulation()
    activateRendering()
  }

  const dispose = () => {
    deactivateRendering()
    stopSimulation()
    hasBoundRefs = false
    canvas = null
    container = null
    particles.length = 0
    predators.length = 0
    mouse.active = false
    if (resizeObserver) resizeObserver.disconnect()
    resizeObserver = undefined
    if (restartStatusTimeout) clearTimeout(restartStatusTimeout)
    if (restartSimulationTimeout) clearTimeout(restartSimulationTimeout)
    restartStatusTimeout = undefined
    restartSimulationTimeout = undefined
  }

  return {
    mouse,
    bindRefs,
    handleResize,
    activateRendering,
    deactivateRendering,
    dispose,
  }
}
