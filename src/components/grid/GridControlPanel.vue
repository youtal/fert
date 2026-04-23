<script setup lang="ts">
/**
 * components/grid/GridControlPanel.vue
 *
 * 点阵网络控制面板。
 * 该组件只负责呈现输入项与发出用户意图：
 * 1. 种子输入框允许真实文本输入，因此保留输入光标。
 * 2. 冻结、速度和重置事件全部交回 GridView 处理，避免面板持有网络生成逻辑。
 * 3. 外层复用 FloatingPanelGroup，与生态系统和 Sudoku 的卡片展开 / 折叠行为保持一致。
 */
import FloatingPanelGroup from '@/components/shared/FloatingPanelGroup.vue'

defineProps<{
  seed: string
  seedDigits: number
  isSeedFrozen: boolean
  animationSpeed: number
}>()

const emit = defineEmits<{
  (event: 'update:seed', value: string): void
  (event: 'update:animationSpeed', value: number): void
  (event: 'toggle-freeze'): void
  (event: 'apply-seed'): void
  (event: 'replay'): void
  (event: 'reset'): void
}>()

// 将 range 控件传出的字符串值收敛成数字，保持父组件中的动画速度状态类型稳定。
const updateAnimationSpeed = (event: Event) => {
  const input = event.target as HTMLInputElement
  emit('update:animationSpeed', Number(input.value))
}
</script>

<template>
  <!-- 与其他模块浮层一致：图标常驻，卡片在悬浮或点击锁定后展开。 -->
  <div class="interactive-sidebar right" @pointerdown.stop @wheel.stop>
    <FloatingPanelGroup icon="◇" label="折线生长控制" side="right" panel-width="260px">
      <div class="control-header">
        <div>
          <p class="control-kicker">Seed Control</p>
          <h1>折线生长</h1>
        </div>
        <button
          type="button"
          class="icon-button"
          :class="{ active: isSeedFrozen }"
          :aria-label="isSeedFrozen ? '解除种子冻结' : '冻结种子'"
          :title="isSeedFrozen ? '解除种子冻结' : '冻结种子'"
          @click="emit('toggle-freeze')"
        >
          {{ isSeedFrozen ? '◆' : '◇' }}
        </button>
      </div>

      <label class="control-field">
        <span>种子</span>
        <input
          :value="seed"
          type="text"
          :maxlength="seedDigits"
          inputmode="numeric"
          @input="emit('update:seed', ($event.target as HTMLInputElement).value)"
          @change="emit('replay')"
          @blur="emit('apply-seed')"
        />
      </label>

      <label class="control-field">
        <span>速度</span>
        <input
          :value="animationSpeed"
          type="range"
          min="40"
          max="420"
          step="20"
          @input="updateAnimationSpeed"
        />
      </label>

      <button type="button" class="reset-button" @click="emit('reset')">
        重置
      </button>
    </FloatingPanelGroup>
  </div>
</template>

<style scoped>
/* Grid 控制入口沿用其他 view 的绝对定位，保证所有右侧浮层的展开轨迹一致。 */
.interactive-sidebar {
  position: absolute;
  top: 1.5rem;
  z-index: 200;
}

.interactive-sidebar.right {
  right: 1.5rem;
  align-items: flex-end;
}

/* 面板头部保留 Grid 原有层级：小标题说明控制域，大标题说明当前网络动画。 */
.control-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.control-kicker {
  color: #2dd4bf;
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-bottom: 0.45rem;
}

.control-header h1 {
  color: #f8fafc;
  font-size: 1.25rem;
  line-height: 1;
}

/* 冻结按钮是面板内的二级动作，视觉上弱于外层浮层触发按钮。 */
.icon-button {
  width: 34px;
  height: 34px;
  border: 1px solid rgba(125, 211, 252, 0.18);
  border-radius: 10px;
  background: rgba(2, 6, 23, 0.38);
  color: #94a3b8;
  cursor: pointer;
  transition:
    border-color 0.2s,
    color 0.2s,
    background 0.2s;
}

.icon-button.active {
  border-color: rgba(45, 212, 191, 0.55);
  background: rgba(20, 184, 166, 0.14);
  color: #5eead4;
}

/* label 使用 grid 排布，让说明文字、输入框与滑块在窄面板里保持稳定间距。 */
.control-field {
  display: grid;
  gap: 0.45rem;
  margin-bottom: 0.95rem;
}

.control-field span {
  color: #94a3b8;
  font-size: 0.78rem;
}

/* 种子是 GridView 唯一文本输入点，明确恢复 caret-color 以允许用户编辑。 */
.control-field input[type='text'] {
  width: 100%;
  height: 38px;
  padding: 0 0.75rem;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 10px;
  background: rgba(2, 6, 23, 0.42);
  color: #e0f2fe;
  font: inherit;
  caret-color: auto;
}

.control-field input[type='range'] {
  width: 100%;
  accent-color: #2dd4bf;
}

/* 重置是整张面板的主命令，保持原有填充按钮样式不变。 */
.reset-button {
  width: 100%;
  height: 40px;
  border: 1px solid rgba(125, 211, 252, 0.22);
  border-radius: 10px;
  background: rgba(14, 165, 233, 0.14);
  color: #e0f2fe;
  font-weight: 700;
  cursor: pointer;
}

.reset-button:hover {
  border-color: rgba(125, 211, 252, 0.45);
  background: rgba(14, 165, 233, 0.22);
}

@media (max-width: 760px) {
  /* 移动端保持与其他浮层相同的边距策略，避免图标贴边。 */
  .interactive-sidebar {
    top: 1rem;
  }

  .interactive-sidebar.right {
    right: 1rem;
  }
}
</style>
