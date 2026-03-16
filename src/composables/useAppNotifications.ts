/**
 * useAppNotifications.ts
 *
 * 轻量全局通知通道。
 * 这里故意不引入额外 store，保持依赖最小，
 * 只为当前项目提供统一的成功 / 失败 / 提示反馈出口。
 */
import { readonly, ref } from 'vue'

export type AppNotificationKind = 'success' | 'error' | 'info'

export interface AppNotification {
  id: number
  kind: AppNotificationKind
  message: string
}

const notifications = ref<AppNotification[]>([])
let nextNotificationId = 1

const removeNotification = (id: number) => {
  notifications.value = notifications.value.filter((notification) => notification.id !== id)
}

export const clearNotifications = () => {
  notifications.value = []
}

export const pushNotification = (
  kind: AppNotificationKind,
  message: string,
  duration = 2400,
) => {
  const id = nextNotificationId++
  notifications.value = [...notifications.value, { id, kind, message }]

  if (duration > 0 && typeof window !== 'undefined') {
    window.setTimeout(() => removeNotification(id), duration)
  }

  return id
}

export const useAppNotifications = () => ({
  notifications: readonly(notifications),
  pushNotification,
  removeNotification,
  clearNotifications,
})
