/**
 * models/Ecosystem.ts
 * 
 * 生态系统物理实体模型。
 * 职责：
 * 1. 封装物理运动模型（速度、加速度、受力）。
 * 2. 实现 Boids 群集算法（分离、队列、凝聚、避障）。
 * 3. 提供空间索引优化 (Spatial Hash)，提升碰撞检测性能。
 */

/**
 * 空间哈希类 (Spatial Hash)
 * 背景：在处理数以百计的粒子交互时，$O(n^2)$ 的暴力距离检查会导致性能骤降。
 * 逻辑：将二维空间划分为网格，通过实体的坐标计算其所属网格键值，实现常数时间内的网格插入与检索。
 * 计算复杂度：邻域搜索从 $O(n^2)$ 降低至 $O(n)$。
 */
export class SpatialHash {
  cells: Map<string, any[]> = new Map();
  cellSize: number;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }

  // 清空哈希表，通常每一帧重新构建一次
  clear() { this.cells.clear(); }

  /**
   * 根据坐标获取对应的网格键名
   */
  private getKey(x: number, y: number) {
    const col = Math.floor(x / this.cellSize);
    const row = Math.floor(y / this.cellSize);
    return `${col},${row}`;
  }

  /**
   * 将实体插入对应网格
   */
  insert(obj: any) {
    const key = this.getKey(obj.x, obj.y);
    if (!this.cells.has(key)) this.cells.set(key, []);
    this.cells.get(key)!.push(obj);
  }

  /**
   * 获取目标点周围 3x3 范围内的所有实体
   * 这覆盖了感知半径内所有可能的交互对象
   */
  getNearby(x: number, y: number): any[] {
    const col = Math.floor(x / this.cellSize);
    const row = Math.floor(y / this.cellSize);
    const nearby: any[] = [];
    
    // 遍历自身网格及相邻的 8 个网格
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const key = `${col + i},${row + j}`;
        const cell = this.cells.get(key);
        if (cell) nearby.push(...cell);
      }
    }
    return nearby;
  }
}

/**
 * 全局物理引擎配置
 */
export const CONFIG = {
  FRAME_TIME_MS: 1000 / 60, // 以 60 FPS 作为基准时间步
  MAX_SPEED: 3.0,          // 猎物最大航速
  PREDATOR_SPEED: 4.0,     // 捕食者最大航速
  MAX_FORCE: 0.12,         // 最大转向力约束，模拟惯性
  PERCEPTION_RADIUS: 90,   // 行为感知半径
  EVASION_RADIUS: 130,     // 躲避捕食者的感知距离
  MOUSE_WEIGHT: 1.2,       // 鼠标交互影响力
  HARD_CAP: 400,           // 种群硬上限，防止资源耗尽
  BOID: { 
    separation: 3.0,       // 分离权重：避免过近冲突
    alignment: 1.0,        // 队列权重：尝试与同伴保持方向一致
    cohesion: 1.0,         // 凝聚权重：尝试向同伴中心靠拢
    evasion: 5.0           // 避障权重：面对捕食者的逃跑优先级
  }
}

/**
 * 猎物粒子类 (Particle)
 * 采用典型的转向行为模型 (Steering Behavior)。
 */
export class Particle {
  x: number; y: number;    // 位置
  vx: number; vy: number;  // 速度
  ax: number; ay: number;  // 加速度
  radius: number = 4;      // 物理半径
  color: string;           // 随机花色
  lastReproductionTime: number; // 上次繁衍时间记录

  constructor(w: number, h: number, x?: number, y?: number) {
    // 若未指定位置，则在画布内随机分布
    this.x = x ?? Math.random() * w;
    this.y = y ?? Math.random() * h;
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * CONFIG.MAX_SPEED;
    this.vy = Math.sin(angle) * CONFIG.MAX_SPEED;
    this.ax = 0; this.ay = 0;
    // 为每个粒子分配独特的 HSL 颜色，实现流光溢彩的视觉效果
    const hue = Math.random() * 360;
    this.color = `hsla(${hue}, 80%, 65%, 0.9)`;
    // 随机化初始繁衍偏移，避免所有粒子同时繁衍造成瞬间卡顿
    this.lastReproductionTime = Date.now() + Math.random() * 3000;
  }

  /**
   * 施加转向力
   */
  applyForce(fx: number, fy: number, timeScale = 1) { this.ax += fx * timeScale; this.ay += fy * timeScale; }

  /**
   * 转向核心算法：Desired Velocity - Current Velocity
   * @param targetX 目标点 X
   * @param targetY 目标点 Y
   * @param weight 力量权重
   * @param flee 是否为逃跑模式
   */
  steer(targetX: number, targetY: number, weight: number, flee = false, timeScale = 1) {
    let dx = targetX - this.x; let dy = targetY - this.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > 0) {
      const multiplier = flee ? -1 : 1;
      // 计算期望速度
      dx = (dx / d) * CONFIG.MAX_SPEED * multiplier;
      dy = (dy / d) * CONFIG.MAX_SPEED * multiplier;
      // 计算转向力
      let sx = dx - this.vx; let sy = dy - this.vy;
      const sl = Math.sqrt(sx * sx + sy * sy);
      // 截断转向力以实现平滑转向
      if (sl > CONFIG.MAX_FORCE) { sx = (sx / sl) * CONFIG.MAX_FORCE; sy = (sy / sl) * CONFIG.MAX_FORCE; }
      this.applyForce(sx * weight, sy * weight, timeScale);
    }
  }

  /**
   * 群集行为逻辑 (Boids Algorithm)
   * 综合处理三种核心规则：分离、队列、凝聚，并额外增加捕食者避障。
   * @param nearbyOthers 仅包含邻近区域的粒子列表 (由空间哈希提供)
   */
  flock(nearbyOthers: Particle[], predators: Predator[], minSpacing: number, timeScale = 1) {
    let sepX = 0, sepY = 0, aliX = 0, aliY = 0, cohX = 0, cohY = 0, count = 0;
    
    for (const other of nearbyOthers) {
      if (other === this) continue;
      const d = Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2);
      if (d > 0 && d < CONFIG.PERCEPTION_RADIUS) {
        // 分离：若过近，产生反向推力
        if (d < minSpacing) { sepX += (this.x - other.x) / d; sepY += (this.y - other.y) / d; }
        // 队列：累加邻域平均速度
        aliX += other.vx; aliY += other.vy;
        // 凝聚：累加邻域中心位置
        cohX += other.x; cohY += other.y;
        count++;
      }
    }
    
    if (count > 0) {
      const sepLen = Math.sqrt(sepX * sepX + sepY * sepY);
      if (sepLen > 0) {
        // 应用分离力
        this.applyForce((sepX / sepLen * CONFIG.MAX_SPEED - this.vx) * CONFIG.BOID.separation, 
                        (sepY / sepLen * CONFIG.MAX_SPEED - this.vy) * CONFIG.BOID.separation,
                        timeScale);
      }
      // 应用队列力与凝聚力
      this.steer(this.x + aliX / count, this.y + aliY / count, CONFIG.BOID.alignment, false, timeScale);
      this.steer(cohX / count, cohY / count, CONFIG.BOID.cohesion, false, timeScale);
    }

    // 处理躲避捕食者：捕食者拥有更高的避障优先级
    for (const pred of predators) {
      if (pred.isDying) continue;
      const distToPred = Math.sqrt((this.x - pred.x)**2 + (this.y - pred.y)**2);
      if (distToPred < CONFIG.EVASION_RADIUS) this.steer(pred.x, pred.y, CONFIG.BOID.evasion, true, timeScale);
    }
  }

  /**
   * 位置更新与边界反弹处理
   */
  update(w: number, h: number, timeScale = 1) {
    this.vx += this.ax; this.vy += this.ay;
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    // 速度截断
    if (speed > CONFIG.MAX_SPEED) { this.vx = (this.vx / speed) * CONFIG.MAX_SPEED; this.vy = (this.vy / speed) * CONFIG.MAX_SPEED; }
    this.x += this.vx * timeScale; this.y += this.vy * timeScale;
    this.ax = 0; this.ay = 0; // 重置加速度
    
    // 弹性边界：触碰边界时反转对应维度的速度向量
    if (this.x < this.radius) { this.x = this.radius; this.vx *= -1; }
    if (this.x > w - this.radius) { this.x = w - this.radius; this.vx *= -1; }
    if (this.y < this.radius) { this.y = this.radius; this.vy *= -1; }
    if (this.y > h - this.radius) { this.y = h - this.radius; this.vy *= -1; }
  }

  /**
   * 绘制粒子及其发光光晕
   */
  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    // 使用 shadow 实现简单的发光效果
    ctx.shadowBlur = 6; ctx.shadowColor = this.color;
    ctx.fill(); ctx.shadowBlur = 0;
  }
}

/**
 * 捕食者类 (Predator)
 * 职责：追踪并消灭猎物。
 */
export class Predator {
  x: number; y: number; vx: number; vy: number; 
  radius = 8;
  color = '#ff3366'; // 鲜艳的粉红色，视觉上区分于猎物
  lastMealTime: number; // 记录上次进食时刻，用于饥饿阈值判定
  isDying = false;      // 是否进入死亡过程
  deathProgress = 0;    // 死亡动画百分比 (0-1)

  constructor(x: number, y: number) {
    this.x = x; this.y = y;
    this.vx = (Math.random() - 0.5) * 4;
    this.vy = (Math.random() - 0.5) * 4;
    this.lastMealTime = Date.now();
  }

  /**
   * 捕食者追踪逻辑
   * 目标：寻找当前场景中距离最近的猎物并全速追击。
   */
  update(targets: Particle[], w: number, h: number, timeScale = 1) {
    // 死亡过程中停止一切物理活动，仅处理动画逻辑
    if (this.isDying) {
      this.deathProgress += 0.025 * timeScale;
      return;
    }
    
    // 全局暴力搜索最近目标（由于捕食者数量极少且需全局搜寻，此处未用空间哈希）
    let closestDist = Infinity;
    let target = null;
    for (const p of targets) {
      const d = Math.sqrt((this.x - p.x)**2 + (this.y - p.y)**2);
      if (d < closestDist) { closestDist = d; target = p; }
    }
    
    if (target) {
      // 转向追击逻辑
      let dx = target.x - this.x; let dy = target.y - this.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 0) { this.vx += (dx / d) * 0.3 * timeScale; this.vy += (dy / d) * 0.3 * timeScale; }
    }
    
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > CONFIG.PREDATOR_SPEED) { this.vx = (this.vx / speed) * CONFIG.PREDATOR_SPEED; this.vy = (this.vy / speed) * CONFIG.PREDATOR_SPEED; }
    this.x += this.vx * timeScale; this.y += this.vy * timeScale;
    
    // 边界检测
    if (this.x < this.radius) { this.x = this.radius; this.vx *= -1; }
    if (this.x > w - this.radius) { this.x = w - this.radius; this.vx *= -1; }
    if (this.y < this.radius) { this.y = this.radius; this.vy *= -1; }
    if (this.y > h - this.radius) { this.y = h - this.radius; this.vy *= -1; }
  }

  /**
   * 绘制捕食者，包含饥饿死亡时的膨胀与闪烁动画
   */
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    let currentOpacity = 1;
    
    // 死亡特写动画：膨胀 -> 消失
    if (this.isDying) {
      const p = this.deathProgress;
      // 死亡前 30% 进度快速膨胀，后 70% 逐渐缩小消失
      let scale = p < 0.3 ? 1 + (p / 0.3) * 0.3 : 1.3 * (1 - (p - 0.3) / 0.7);
      ctx.translate(this.x, this.y);
      ctx.scale(scale, scale);
      ctx.translate(-this.x, -this.y);
      // 实现高频闪烁效果
      const flicker = (p < 0.3 && Math.sin(p * 60) > 0) ? 1 : 0.7;
      currentOpacity = (1 - p) * flicker;
    }
    
    ctx.globalAlpha = Math.max(0, currentOpacity);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    
    // 根据状态切换填充色：死亡瞬间变为白色强光
    if (this.isDying && this.deathProgress < 0.3) {
      ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 25;
    } else {
      ctx.fillStyle = this.color; ctx.shadowColor = '#ff3366'; ctx.shadowBlur = 15;
    }
    ctx.fill(); ctx.shadowBlur = 0;
    
    // 绘制捕食者的“眼睛”，指向其当前速度方向
    if (currentOpacity > 0.2) {
      ctx.fillStyle = 'white'; ctx.beginPath();
      const eyeX = this.x + (this.vx / CONFIG.PREDATOR_SPEED) * 3;
      const eyeY = this.y + (this.vy / CONFIG.PREDATOR_SPEED) * 3;
      ctx.arc(eyeX, eyeY, 2.5, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
}
