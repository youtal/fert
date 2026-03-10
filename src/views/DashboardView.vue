<script setup lang="ts">
/**
 * DashboardView.vue
 * 
 * 仪表盘主视图。
 * 职责：
 * 1. 展示系统核心运行指标。
 * 2. 介绍框架底层技术特性（如 Vapor Mode）。
 * 采用响应式网格布局，适配不同屏幕尺寸。
 */
</script>

<template>
  <div class="dashboard-container">
    <div class="dashboard-grid">
      <!-- 技术特性卡片：Vapor Mode -->
      <div class="card">
        <h3>系统性能</h3>
        <p>基于 Vue 3 Vapor Mode 渲染，实现零虚拟 DOM 开销，极大提升高频更新场景下的响应速度。</p>
      </div>
      
      <!-- 核心指标卡片：可用性 -->
      <div class="card">
        <h3>实时可用性</h3>
        <div class="stat-value">99.9%</div>
      </div>
      
      <!-- 技术特性卡片：内存管理 -->
      <div class="card">
        <h3>内存占用</h3>
        <p>针对粒子系统优化的响应式绑定，确保在 400+ 活跃实体环境下长时间运行不卡顿。</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-container {
  padding: 2.5rem;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.card {
  background: #1e293b; /* Slate 800 */
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: transform 0.2s, box-shadow 0.2s;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.1);
}

.card h3 {
  margin-bottom: 1rem;
  color: #f1f5f9;
  font-size: 1.25rem;
}

.card p {
  color: #94a3b8;
  line-height: 1.6;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 800;
  color: #818cf8; /* 更亮的紫色以适应深色背景 */
}
</style>
