<script setup lang="ts">
import MainLayout from './layouts/MainLayout.vue'
import { RouterView, useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <MainLayout>
    <!-- 仅在首页显示 Dashboard 内容，添加 dashboard-container 以处理内边距 -->
    <template v-if="route.path === '/'">
      <div class="dashboard-container">
        <div class="dashboard-grid">
          <div class="card">
            <h3>System Performance</h3>
            <p>Vapor Mode is currently active with zero Virtual DOM overhead.</p>
          </div>
          <div class="card">
            <h3>Quick Stats</h3>
            <div class="stat-value">99.9%</div>
          </div>
          <div class="card">
            <h3>Memory Usage</h3>
            <p>Optimized reactive bindings for high-frequency updates.</p>
          </div>
        </div>
      </div>
    </template>
    
    <!-- 其他视图（如 Particle）将直接填充 MainLayout 的 content-body -->
    <RouterView v-else />
  </MainLayout>
</template>

<style>
/* 全局重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  width: 100%;
  overflow: hidden; /* 防止全局滚动条 */
}

.dashboard-container {
  padding: 2.5rem;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.card {
  background: white;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  border: 1px solid #f1f5f9;
  transition: transform 0.2s, box-shadow 0.2s;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.card h3 {
  margin-bottom: 1rem;
  color: #334155;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 800;
  color: #6366f1;
}
</style>
