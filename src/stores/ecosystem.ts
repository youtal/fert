/**
 * stores/ecosystem.ts
 * 
 * 粒子演化全局状态库。
 * 职责：
 * 1. 存储并持久化演化环境的控制参数。
 * 2. 实时更新当前纪元的种群数据。
 * 3. 记录多纪元的灭绝历史。
 */
import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'

/**
 * 历史纪元日志记录接口
 */
export interface HistoryLog {
  id: number;      // 唯一 ID（通常为时间戳）
  uptime: number;  // 本纪元持续时间 (秒)
  peak: number;    // 本纪元达到的最高种群数量
  n: number;       // 对应的繁衍周期参数
  m: number;       // 对应的突变概率参数
  k: number;       // 对应的饥饿阈值参数
}

export const useEcosystemStore = defineStore('ecosystem', () => {
  // 演化控制参数：支持在 UI 界面通过滑块实时调整
  const params = reactive({
    n: 8,           // 繁衍周期 (秒)：猎物产生后代的时间间隔
    m: 4,           // 突变概率 (‰)：猎物每秒突变为捕食者的概率
    k: 6,           // 饥饿阈值 (秒)：捕食者未进食导致死亡的时间上限
    minSpacing: 35, // 粒子最小间隙 (像素)：影响 Boids 分离行为的紧密度
  })

  // 实时运行状态：由逻辑钩子 (useEcosystem) 动态写入
  const state = reactive({
    preys: 0,       // 当前猎物粒子总数
    predators: 0,   // 当前捕食者总数
    peak: 0,        // 本纪元内的历史最大人口峰值
    uptime: 0,      // 系统连续运行时间 (秒)
    status: '运行中' as '运行中' | '已崩溃' | '重启中'
  })

  // 历史纪元日志：存储最近 5 次系统灭绝的统计数据
  const historyLogs = ref<HistoryLog[]>([])

  /**
   * 记录灭绝历史数据
   * 逻辑：新记录插入头部，并保持数组长度不超过设定值（5条）
   */
  const addLog = (log: HistoryLog) => {
    historyLogs.value.unshift(log)
    if (historyLogs.value.length > 5) historyLogs.value.pop()
  }

  return {
    params,
    state,
    historyLogs,
    addLog
  }
})
