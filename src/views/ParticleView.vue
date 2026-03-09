<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
let animationFrame: number
let resizeObserver: ResizeObserver

// 演化控制参数
const params = reactive({
  n: 8,           
  m: 4,           
  k: 6,           
  minSpacing: 35, 
})

// 生态系统实时状态
const state = reactive({
  preys: 0,
  predators: 0,
  peak: 0,
  uptime: 0,
  status: '运行中' 
})

interface HistoryLog {
  id: number
  uptime: number
  peak: number
  n: number
  m: number
  k: number
}
const historyLogs = ref<HistoryLog[]>([])

const CONFIG = {
  MAX_SPEED: 3.0,
  PREDATOR_SPEED: 4.0, 
  MAX_FORCE: 0.12,
  PERCEPTION_RADIUS: 90,
  EVASION_RADIUS: 130,  
  MOUSE_ATTRACTION_WEIGHT: 1.2,
  HARD_CAP: 400,
  BOID_WEIGHTS: { separation: 3.0, alignment: 1.0, cohesion: 1.0, evasion: 5.0 }
}

class Particle {
  x: number; y: number; vx: number; vy: number; ax: number; ay: number;
  radius: number; color: string;
  lastReproductionTime: number;

  constructor(w: number, h: number, x?: number, y?: number) {
    this.x = x ?? Math.random() * w
    this.y = y ?? Math.random() * h
    const angle = Math.random() * Math.PI * 2
    this.vx = Math.cos(angle) * CONFIG.MAX_SPEED
    this.vy = Math.sin(angle) * CONFIG.MAX_SPEED
    this.ax = 0; this.ay = 0
    this.radius = 4
    const hue = Math.random() * 360
    this.color = `hsla(${hue}, 80%, 65%, 0.9)`
    this.lastReproductionTime = Date.now() + Math.random() * 3000
  }

  applyForce(fx: number, fy: number) { this.ax += fx; this.ay += fy }

  steer(targetX: number, targetY: number, weight: number, flee = false) {
    let dx = targetX - this.x; let dy = targetY - this.y
    const d = Math.sqrt(dx * dx + dy * dy)
    if (d > 0) {
      const multiplier = flee ? -1 : 1
      dx = (dx / d) * CONFIG.MAX_SPEED * multiplier
      dy = (dy / d) * CONFIG.MAX_SPEED * multiplier
      let steerX = dx - this.vx; let steerY = dy - this.vy
      const steerLen = Math.sqrt(steerX * steerX + steerY * steerY)
      if (steerLen > CONFIG.MAX_FORCE) {
        steerX = (steerX / steerLen) * CONFIG.MAX_FORCE
        steerY = (steerY / steerLen) * CONFIG.MAX_FORCE
      }
      this.applyForce(steerX * weight, steerY * weight)
    }
  }

  flock(others: Particle[], predators: Predator[]) {
    let sepX = 0, sepY = 0, aliX = 0, aliY = 0, cohX = 0, cohY = 0, count = 0

    for (const other of others) {
      if (other === this) continue
      const d = Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2)
      if (d > 0 && d < CONFIG.PERCEPTION_RADIUS) {
        if (d < params.minSpacing) { 
          sepX += (this.x - other.x) / d; 
          sepY += (this.y - other.y) / d 
        }
        aliX += other.vx; aliY += other.vy
        cohX += other.x; cohY += other.y
        count++
      }
    }
    if (count > 0) {
      const sepLen = Math.sqrt(sepX * sepX + sepY * sepY)
      if (sepLen > 0) {
        this.applyForce((sepX / sepLen * CONFIG.MAX_SPEED - this.vx) * CONFIG.BOID_WEIGHTS.separation, 
                        (sepY / sepLen * CONFIG.MAX_SPEED - this.vy) * CONFIG.BOID_WEIGHTS.separation)
      }
      this.steer(this.x + aliX / count, this.y + aliY / count, CONFIG.BOID_WEIGHTS.alignment)
      this.steer(cohX / count, cohY / count, CONFIG.BOID_WEIGHTS.cohesion)
    }

    for (const pred of predators) {
      const distToPredator = Math.sqrt((this.x - pred.x)**2 + (this.y - pred.y)**2)
      if (distToPredator < CONFIG.EVASION_RADIUS) {
        this.steer(pred.x, pred.y, CONFIG.BOID_WEIGHTS.evasion, true)
      }
    }
  }

  update(w: number, h: number) {
    this.vx += this.ax; this.vy += this.ay
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy)
    if (speed > CONFIG.MAX_SPEED) { this.vx = (this.vx / speed) * CONFIG.MAX_SPEED; this.vy = (this.vy / speed) * CONFIG.MAX_SPEED }
    this.x += this.vx; this.y += this.vy; this.ax = 0; this.ay = 0

    if (this.x < this.radius) { this.x = this.radius; this.vx *= -1; }
    if (this.x > w - this.radius) { this.x = w - this.radius; this.vx *= -1; }
    if (this.y < this.radius) { this.y = this.radius; this.vy *= -1; }
    if (this.y > h - this.radius) { this.y = h - this.radius; this.vy *= -1; }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.fillStyle = this.color
    ctx.shadowBlur = 6; ctx.shadowColor = this.color
    ctx.fill(); ctx.shadowBlur = 0
  }
}

class Predator {
  x: number; y: number; vx: number; vy: number; radius = 8;
  color = '#ff3366';
  lastMealTime: number;

  constructor(x: number, y: number) {
    this.x = x; this.y = y
    this.vx = (Math.random() - 0.5) * 4; this.vy = (Math.random() - 0.5) * 4
    this.lastMealTime = Date.now()
  }

  update(targets: Particle[], w: number, h: number) {
    let closestDist = Infinity; let target = null
    for (const p of targets) {
      const d = Math.sqrt((this.x - p.x)**2 + (this.y - p.y)**2)
      if (d < closestDist) { closestDist = d; target = p }
    }

    if (target) {
      let dx = target.x - this.x; let dy = target.y - this.y
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d > 0) { this.vx += (dx / d) * 0.3; this.vy += (dy / d) * 0.3 }
    }

    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy)
    if (speed > CONFIG.PREDATOR_SPEED) { this.vx = (this.vx / speed) * CONFIG.PREDATOR_SPEED; this.vy = (this.vy / speed) * CONFIG.PREDATOR_SPEED }

    this.x += this.vx; this.y += this.vy
    if (this.x < this.radius) { this.x = this.radius; this.vx *= -1; }
    if (this.x > w - this.radius) { this.x = w - this.radius; this.vx *= -1; }
    if (this.y < this.radius) { this.y = this.radius; this.vy *= -1; }
    if (this.y > h - this.radius) { this.y = h - this.radius; this.vy *= -1; }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.fillStyle = this.color
    ctx.shadowBlur = 15; ctx.shadowColor = '#ff3366'
    ctx.fill(); ctx.shadowBlur = 0
    
    ctx.fillStyle = 'white'; ctx.beginPath()
    const eyeX = this.x + (this.vx / CONFIG.PREDATOR_SPEED) * 3
    const eyeY = this.y + (this.vy / CONFIG.PREDATOR_SPEED) * 3
    ctx.arc(eyeX, eyeY, 2.5, 0, Math.PI*2); ctx.fill()
  }
}

const particles: Particle[] = []
const predators: Predator[] = []
const mouse = { x: 0, y: 0, active: false }

let ecosystemStartTime = 0
let lastFrameTime = 0

const startEcosystem = () => {
  if (!canvasRef.value) return
  particles.length = 0
  predators.length = 0
  state.peak = 0
  
  for (let i = 0; i < 80; i++) {
    particles.push(new Particle(canvasRef.value.width, canvasRef.value.height))
  }
  
  ecosystemStartTime = Date.now()
  lastFrameTime = performance.now()
  state.status = '运行中'
}

const init = () => {
  const canvas = canvasRef.value!
  const ctx = canvas.getContext('2d')!
  const container = containerRef.value!

  const resize = () => {
    canvas.width = container.clientWidth
    canvas.height = container.clientHeight
  }
  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(container)
  resize()

  startEcosystem()

  const loop = (timestamp: number) => {
    let deltaTime = timestamp - lastFrameTime
    lastFrameTime = timestamp
    if (deltaTime > 100) deltaTime = 16
    const currentTime = Date.now()

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (state.status === '运行中') {
      state.uptime = Math.floor((currentTime - ecosystemStartTime) / 1000)
      state.preys = particles.length
      state.predators = predators.length
      if (particles.length + predators.length > state.peak) {
        state.peak = particles.length + predators.length
      }

      if (particles.length === 0 && predators.length === 0) {
        state.status = '已崩溃'
        historyLogs.value.unshift({
          id: currentTime, uptime: state.uptime, peak: state.peak,
          n: params.n, m: params.m, k: params.k
        })
        if (historyLogs.value.length > 5) historyLogs.value.pop()
        
        setTimeout(() => {
          state.status = '重启中'
          setTimeout(() => startEcosystem(), 1000)
        }, 2000)
      }
    }
    
    for (let i = predators.length - 1; i >= 0; i--) {
      const pred = predators[i]
      if (currentTime - pred.lastMealTime > params.k * 1000) {
        predators.splice(i, 1)
        continue
      }
      pred.update(particles, canvas.width, canvas.height)
      pred.draw(ctx)

      for (let j = particles.length - 1; j >= 0; j--) {
        const p = particles[j]
        const d = Math.sqrt((pred.x - p.x)**2 + (pred.y - p.y)**2)
        if (d < pred.radius + p.radius) {
          particles.splice(j, 1)
          pred.lastMealTime = currentTime
        }
      }
    }

    ctx.lineWidth = 0.5
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const d2 = (particles[i].x - particles[j].x)**2 + (particles[i].y - particles[j].y)**2
        if (d2 < 8000) {
          ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y)
          ctx.strokeStyle = `rgba(148, 163, 184, ${(1 - Math.sqrt(d2)/90) * 0.4})`
          ctx.stroke()
        }
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      
      const mutationChance = (params.m / 1000) * (deltaTime / 1000)
      if (Math.random() < mutationChance) {
        predators.push(new Predator(p.x, p.y))
        particles.splice(i, 1)
        continue
      }

      if (currentTime - p.lastReproductionTime > params.n * 1000) {
        if (particles.length < CONFIG.HARD_CAP) {
          particles.push(new Particle(canvas.width, canvas.height, p.x, p.y))
        }
        p.lastReproductionTime = currentTime
      }

      p.flock(particles, predators)
      if (mouse.active) p.steer(mouse.x, mouse.y, CONFIG.MOUSE_ATTRACTION_WEIGHT)
      p.update(canvas.width, canvas.height)
      p.draw(ctx)
    }

    animationFrame = requestAnimationFrame(loop)
  }
  animationFrame = requestAnimationFrame(loop)
}

onMounted(init)
onUnmounted(() => { cancelAnimationFrame(animationFrame); resizeObserver.disconnect() })

const onMouseMove = (e: MouseEvent) => {
  const rect = canvasRef.value!.getBoundingClientRect()
  mouse.x = e.clientX - rect.left; mouse.y = e.clientY - rect.top; mouse.active = true
}
</script>

<template>
  <div class="particle-view" ref="containerRef">
    
    <!-- 左侧：生态统计与日志 (悬停展开) -->
    <div class="side-panel left collapsible-area">
      <div class="glass-card status-card">
        <div class="card-header">
          <span class="icon">📊</span>
          <h2>演化状态</h2>
        </div>
        <div class="card-body">
          <div class="status-badge" :class="state.status === '运行中' ? 'running' : 'collapsed'">{{ state.status }}</div>
          <div class="stat-grid">
            <div class="stat-item"><span class="label">猎物数量</span><span class="value">{{ state.preys }}</span></div>
            <div class="stat-item"><span class="label">捕食者</span><span class="value pred-color">{{ state.predators }}</span></div>
            <div class="stat-item"><span class="label">存活时间</span><span class="value">{{ state.uptime }}s</span></div>
            <div class="stat-item"><span class="label">种群峰值</span><span class="value">{{ state.peak }}</span></div>
          </div>
        </div>
      </div>

      <div class="glass-card log-card" v-if="historyLogs.length > 0">
        <div class="card-header">
          <span class="icon">📜</span>
          <h3>灭绝历史</h3>
        </div>
        <div class="card-body">
          <div class="log-list">
            <div class="log-item" v-for="(log, idx) in historyLogs" :key="log.id">
              <div class="log-header">纪元 -{{ idx + 1 }} <span>{{ log.uptime }}秒</span></div>
              <div class="log-meta">峰值: {{ log.peak }} | 突变:{{ log.m }}‰ | 繁衍:{{ log.n }}s</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧：控制面板 (透明度 30%) -->
    <div class="side-panel right">
      <div class="glass-card control-card">
        <div class="card-header">
          <span class="icon">⚙️</span>
          <h3>参数控制</h3>
        </div>
        
        <div class="slider-group">
          <div class="slider-info">
            <span>繁衍周期 (n)</span>
            <span class="slider-val">{{ params.n }} 秒</span>
          </div>
          <input type="range" v-model.number="params.n" min="2" max="15" step="1" class="neon-slider blue" />
        </div>

        <div class="slider-group">
          <div class="slider-info">
            <span>突变概率 (m)</span>
            <span class="slider-val pred-color">{{ params.m }} ‰</span>
          </div>
          <input type="range" v-model.number="params.m" min="0" max="20" step="1" class="neon-slider red" />
        </div>

        <div class="slider-group">
          <div class="slider-info">
            <span>饥饿阈值 (k)</span>
            <span class="slider-val">{{ params.k }} 秒</span>
          </div>
          <input type="range" v-model.number="params.k" min="2" max="15" step="1" class="neon-slider purple" />
        </div>

        <div class="slider-group">
          <div class="slider-info">
            <span>粒子间隙</span>
            <span class="slider-val green-val">{{ params.minSpacing }}px</span>
          </div>
          <input type="range" v-model.number="params.minSpacing" min="10" max="100" step="1" class="neon-slider green" />
        </div>
      </div>
    </div>

    <canvas 
      ref="canvasRef" 
      @mousemove="onMouseMove" 
      @mouseleave="mouse.active = false"
    ></canvas>
  </div>
</template>

<style scoped>
.particle-view {
  width: 100%; height: 100%;
  background: radial-gradient(circle at top right, #1e293b 0%, #09090b 100%);
  position: absolute; top: 0; left: 0; overflow: hidden;
}

canvas { display: block; width: 100%; height: 100%; cursor: crosshair; }

.side-panel {
  position: absolute; top: 1.5rem; bottom: 1.5rem;
  width: 280px; display: flex; flex-direction: column; gap: 1rem;
  pointer-events: none; z-index: 20;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.side-panel.left { left: 1.5rem; }
.side-panel.right { right: 1.5rem; }

/* 调整面板基础透明度为 30% */
.glass-card {
  background: rgba(15, 23, 42, 0.3);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px; padding: 1rem;
  box-shadow: 0 8px 32px -8px rgba(0, 0, 0, 0.3);
  pointer-events: auto;
  overflow: hidden;
  transition: all 0.3s;
}

.glass-card:hover {
  background: rgba(15, 23, 42, 0.6);
  border-color: rgba(255, 255, 255, 0.15);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.icon { font-size: 1.2rem; }

h2, h3 { color: #f8fafc; margin: 0; font-weight: 700; font-size: 0.95rem; }

/* 左侧概览区域：默认折叠逻辑 */
.collapsible-area {
  width: 50px;
  opacity: 0.6;
}

.collapsible-area .card-body {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition: all 0.4s ease;
  margin-top: 0;
}

.collapsible-area:hover {
  width: 280px;
  opacity: 1;
}

.collapsible-area:hover .card-body {
  max-height: 500px;
  opacity: 1;
  margin-top: 1rem;
}

/* 内部样式微调 */
.status-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 0.7rem; font-weight: 700; margin-bottom: 0.75rem; text-transform: uppercase; }
.status-badge.running { background: rgba(16, 185, 129, 0.2); color: #10b981; }
.status-badge.collapsed { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

.stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.stat-item .label { font-size: 0.7rem; color: #94a3b8; display: block; }
.stat-item .value { font-size: 1.25rem; font-weight: 800; color: #e2e8f0; font-family: monospace; }
.pred-color { color: #ff3366 !important; }
.green-val { color: #10b981 !important; }

.log-list { display: flex; flex-direction: column; gap: 0.5rem; }
.log-item { background: rgba(255,255,255,0.03); border-radius: 8px; padding: 0.6rem; border-left: 2px solid #6366f1; }
.log-header { display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 600; color: #f1f5f9; }
.log-meta { font-size: 0.65rem; color: #64748b; font-family: monospace; }

.slider-group { margin-bottom: 1rem; }
.slider-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; font-size: 0.8rem; color: #cbd5e1; }
.slider-val { background: rgba(255,255,255,0.1); padding: 1px 6px; border-radius: 4px; font-family: monospace; color: #38bdf8; font-size: 0.75rem; }

input[type=range] { -webkit-appearance: none; width: 100%; background: transparent; height: 16px; outline: none; }
input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 4px; border-radius: 2px; }
input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none; height: 14px; width: 14px; border-radius: 50%; margin-top: -5px;
  cursor: pointer; border: 2px solid #fff;
}

.neon-slider.blue::-webkit-slider-runnable-track { background: #3b82f6; }
.neon-slider.red::-webkit-slider-runnable-track { background: #ef4444; }
.neon-slider.purple::-webkit-slider-runnable-track { background: #8b5cf6; }
.neon-slider.green::-webkit-slider-runnable-track { background: #10b981; }
</style>
