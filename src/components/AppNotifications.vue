<script setup lang="ts">
/**
 * AppNotifications.vue
 *
 * 全局通知容器。
 * 用于承接来自 composable 的非阻塞反馈，避免 `alert`
 * 打断动画、测试流程或 KeepAlive 场景下的交互连续性。
 */
import { useAppNotifications } from '@/composables/useAppNotifications'

const { notifications, removeNotification } = useAppNotifications()
</script>

<template>
  <div class="notification-stack" aria-live="polite" aria-atomic="true">
    <TransitionGroup name="toast">
      <button
        v-for="notification in notifications"
        :key="notification.id"
        type="button"
        class="toast"
        :class="`kind-${notification.kind}`"
        @click="removeNotification(notification.id)"
      >
        {{ notification.message }}
      </button>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.notification-stack {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 1200;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  pointer-events: none;
}

.toast {
  width: min(320px, calc(100vw - 2rem));
  padding: 0.9rem 1rem;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(15, 23, 42, 0.92);
  color: #f8fafc;
  text-align: left;
  box-shadow: 0 18px 36px rgba(2, 6, 23, 0.36);
  backdrop-filter: blur(14px);
  pointer-events: auto;
  cursor: pointer;
}

.kind-success {
  border-color: rgba(52, 211, 153, 0.35);
}

.kind-error {
  border-color: rgba(248, 113, 113, 0.35);
}

.kind-info {
  border-color: rgba(125, 211, 252, 0.35);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.22s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
