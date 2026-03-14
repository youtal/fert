/**
 * stores/ecosystem.ts
 * 
 * 粒子演化全局状态库。
 * 职责：
 * 1. 存储演化环境的控制参数。
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

export interface EcosystemParams {
  n: number
  m: number
  k: number
  minSpacing: number
}

/**
 * 单一可信默认参数源。
 * UI 重置、运行时钳制和测试断言都应以这里为准，避免魔法数字分散。
 */
const DEFAULT_PARAMS: EcosystemParams = {
  n: 8,
  m: 4,
  k: 6,
  minSpacing: 35,
}

/**
 * 参数允许范围。
 * 与滑块范围保持一致，但 store 仍保留最终兜底，防止外部直接写入越界值。
 */
const PARAM_RANGES = {
  n: { min: 2, max: 15 },
  m: { min: 0, max: 20 },
  k: { min: 2, max: 15 },
  minSpacing: { min: 10, max: 100 },
} as const

/**
 * 将任意输入压缩为安全整数。
 * 仿真循环只消费经过此函数处理后的值，确保时间参数和间距参数始终可预测。
 */
const clampParam = (
  value: number,
  fallback: number,
  range: { min: number; max: number },
) => {
  if (!Number.isFinite(value)) return fallback
  return Math.min(range.max, Math.max(range.min, Math.round(value)))
}

export const useEcosystemStore = defineStore('ecosystem', () => {
  // 演化控制参数：支持在 UI 界面通过滑块实时调整
  const params = reactive({
    ...DEFAULT_PARAMS,
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

  /**
   * 对外部输入做最终兜底，避免被 DevTools 或脚本写入异常值后污染仿真循环。
   */
  const sanitizeParams = (): EcosystemParams => {
    params.n = clampParam(params.n, DEFAULT_PARAMS.n, PARAM_RANGES.n)
    params.m = clampParam(params.m, DEFAULT_PARAMS.m, PARAM_RANGES.m)
    params.k = clampParam(params.k, DEFAULT_PARAMS.k, PARAM_RANGES.k)
    params.minSpacing = clampParam(params.minSpacing, DEFAULT_PARAMS.minSpacing, PARAM_RANGES.minSpacing)

    return {
      n: params.n,
      m: params.m,
      k: params.k,
      minSpacing: params.minSpacing,
    }
  }

  return {
    params,
    state,
    historyLogs,
    addLog,
    sanitizeParams,
  }
})
