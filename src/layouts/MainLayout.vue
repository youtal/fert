<script setup lang="ts">
import { ref } from 'vue'
import Sidebar from '../components/Sidebar.vue'

const isCollapsed = ref(false)

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
}
</script>

<template>
  <div class="layout-container">
    <Sidebar :is-collapsed="isCollapsed" @toggle="toggleSidebar" />

    <main class="main-content">
      <header class="top-bar">
        <div class="breadcrumb">Home / Dashboard</div>
        <div class="user-profile">
          <div class="avatar">JD</div>
        </div>
      </header>
      
      <section class="content-body">
        <slot>
          <div class="default-content">
            <h1>Welcome to Fret</h1>
            <p>Modern interface with Vapor Mode performance.</p>
          </div>
        </slot>
      </section>
    </main>
  </div>
</template>

<style scoped>
.layout-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  background-color: #f8fafc;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  color: #1e293b;
  overflow: hidden;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.top-bar {
  height: 80px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  flex-shrink: 0;
}

.breadcrumb {
  color: #64748b;
  font-size: 0.9rem;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.8rem;
}

.content-body {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.default-content {
  padding: 2.5rem;
}

h1 {
  font-size: 2.2rem;
  font-weight: 800;
  margin-bottom: 0.75rem;
  color: #1e293b;
}
</style>
