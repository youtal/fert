/**
 * composables/useEcosystem.ts
 *
 * 生态系统核心控制器 (已完成重构)。
 */
import { ref, onMounted, onUnmounted, onActivated, type Ref } from 'vue'
import { Particle, Predator, CONFIG, SpatialHash } from '@/models/Ecosystem'
import { useEcosystemStore } from '@/stores/ecosystem'

export function useEcosystem() {
  const store = useEcosystemStore()
  const particles: Particle[] = []
  const predators: Predator[] = []
  const mouse = { x: 0, y: 0, active: false }
  const spatialHash = new SpatialHash(CONFIG.PERCEPTION_RADIUS)

  const canvasRef = ref<HTMLCanvasElement | null>(null)
  const containerRef = ref<HTMLDivElement | null>(null)

  let animationFrame: number
  let resizeObserver: ResizeObserver
  let ecosystemStartTime = 0
  let lastFrameTime = 0
  let restartStatusTimeout: ReturnType<typeof setTimeout> | undefined
  let restartSimulationTimeout: ReturnType<typeof setTimeout> | undefined

  const setRefs = (cRef: Ref<HTMLCanvasElement | null>, contRef: Ref<HTMLDivElement | null>) => {
    canvasRef.value = cRef.value
    containerRef.value = contRef.value
    
    // 初始化 ResizeObserver
    if (containerRef.value) {
      handleResize()
      resizeObserver = new ResizeObserver(handleResize)
      resizeObserver.observe(containerRef.value)
    }
    
    // 启动仿真
    startEcosystem()
    animationFrame = requestAnimationFrame(loop)
  }

  const startEcosystem = () => {
    if (!canvasRef.value) return
    if (restartStatusTimeout) clearTimeout(restartStatusTimeout)
    if (restartSimulationTimeout) clearTimeout(restartSimulationTimeout)

    particles.length = 0
    predators.length = 0
    store.state.peak = 0
    store.sanitizeParams()
    for (let i = 0; i < 80; i++) {
      particles.push(new Particle(canvasRef.value.width, canvasRef.value.height))
    }
    ecosystemStartTime = Date.now()
    lastFrameTime = performance.now()
    store.state.status = '运行中'
  }

  const loop = (timestamp: number) => {
    const canvas = canvasRef.value
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let deltaTime = timestamp - lastFrameTime
    lastFrameTime = timestamp
    if (deltaTime > 100) deltaTime = 16
    const currentTime = Date.now()

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const params = store.sanitizeParams()
    const timeScale = deltaTime / CONFIG.FRAME_TIME_MS
    
    spatialHash.clear()
    particles.forEach((p) => spatialHash.insert(p))

    // 物理仿真
    if (store.state.status === '运行中') {
      store.state.uptime = Math.floor((currentTime - ecosystemStartTime) / 1000)
      store.state.preys = particles.length
      store.state.predators = predators.length
      const currentPop = particles.length + predators.length
      if (currentPop > store.state.peak) store.state.peak = currentPop

      if (particles.length === 0 && predators.length === 0) {
        store.state.status = '已崩溃'
        store.addLog({ id: currentTime, uptime: store.state.uptime, peak: store.state.peak, n: params.n, m: params.m, k: params.k })
        restartStatusTimeout = setTimeout(() => {
          store.state.status = '重启中'
          restartSimulationTimeout = setTimeout(() => startEcosystem(), 1000)
        }, 2000)
      }
    }

    // 更新捕食者
    for (let i = predators.length - 1; i >= 0; i--) {
      const pred = predators[i]
      if (pred.isDying && pred.deathProgress >= 1) { predators.splice(i, 1); continue }
      if (!pred.isDying && currentTime - pred.lastMealTime > params.k * 1000) pred.isDying = true
      pred.update(particles, canvas.width, canvas.height, timeScale)
      if (!pred.isDying) {
        for (let j = particles.length - 1; j >= 0; j--) {
          const p = particles[j]
          const d2 = (pred.x - p.x) ** 2 + (pred.y - p.y) ** 2
          if (d2 < (pred.radius + p.radius) ** 2) {
            particles.splice(j, 1); pred.lastMealTime = currentTime
          }
        }
      }
      pred.draw(ctx)
    }

    // 更新猎物并绘制
    ctx.lineWidth = 0.5
    const particleOrder = new Map(particles.map((p, idx) => [p, idx]))
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      const mutationChance = (params.m / 1000) * (deltaTime / 1000)
      if (Math.random() < mutationChance) {
        predators.push(new Predator(p.x, p.y)); particles.splice(i, 1); continue
      }
      if (currentTime - p.lastReproductionTime > params.n * 1000) {
        if (particles.length + predators.length < CONFIG.HARD_CAP) {
          particles.push(new Particle(canvas.width, canvas.height, p.x, p.y))
        }
        p.lastReproductionTime = currentTime
      }
      p.flock(spatialHash.getNearby(p.x, p.y), predators, params.minSpacing, timeScale)
      if (mouse.active) p.steer(mouse.x, mouse.y, CONFIG.MOUSE_WEIGHT, false, timeScale)
      p.update(canvas.width, canvas.height, timeScale)
      
      spatialHash.getNearby(p.x, p.y).forEach((other) => {
        const oIdx = particleOrder.get(other)
        if (p === other || oIdx === undefined || oIdx <= i) return
        const d2 = (p.x - other.x) ** 2 + (p.y - other.y) ** 2
        if (d2 < 8000) {
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(other.x, other.y)
          ctx.strokeStyle = `rgba(148, 163, 184, ${(1 - Math.sqrt(d2) / 90) * 0.4})`
          ctx.stroke()
        }
      })
      p.draw(ctx)
    }

    animationFrame = requestAnimationFrame(loop)
  }

  const handleResize = () => {
    if (!canvasRef.value || !containerRef.value) return
    const w = containerRef.value.clientWidth
    const h = containerRef.value.clientHeight
    if (w > 0 && h > 0) {
      canvasRef.value.width = w
      canvasRef.value.height = h
    }
  }

  onActivated(() => {
    handleResize()
  })

  onUnmounted(() => {
    cancelAnimationFrame(animationFrame)
    if (resizeObserver) resizeObserver.disconnect()
    if (restartStatusTimeout) clearTimeout(restartStatusTimeout)
    if (restartSimulationTimeout) clearTimeout(restartSimulationTimeout)
  })

  return { mouse, setRefs }
}
