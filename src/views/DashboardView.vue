<script setup lang="ts">
/**
 * DashboardView.vue
 *
 * 默认主视图改为项目介绍页。
 * 页面采用瀑布式卡片布局，用于快速介绍模块能力、运行模型与开发约定。
 * 卡片数据集中定义在脚本区，便于后续扩展或替换为配置化来源。
 */
/**
 * 首页卡片数据源。
 * 当前保持静态定义，优先保证首页文案与发布信息在版本冻结时稳定可控。
 */
const introCards = [
  {
    title: 'Fret 项目概览',
    tone: 'hero',
    eyebrow: 'Project Intro',
    body: '一个围绕生态系统仿真与数独解算构建的前端实验场，重点展示持续运行视图、可视化反馈和前端算法表现。',
    points: ['Vue 3 + Vite + Pinia + Vitest', '会话级 KeepAlive 生命周期', '模块化视图、组件与 composable 分层'],
  },
  {
    title: '生态系统模块',
    tone: 'feature',
    eyebrow: 'Simulation',
    body: '粒子、捕食者与空间哈希共同驱动演化系统。现在采用后台仿真与前台渲染分离的运行模型。',
    points: ['切换页面后仿真继续推进', '仅在激活视图时渲染 Canvas', '参数面板、状态面板、历史面板协同工作'],
  },
  {
    title: 'Sudoku 模块',
    tone: 'feature',
    eyebrow: 'Puzzle',
    body: '位掩码、约束传播和回溯搜索组成求解核心，同时保留用户输入反馈和动画化展示。',
    points: ['随机题目与自定义题目都保留答案副本', '自动解算不依赖答案副本', '用户输入即时显示正确 / 错误反馈'],
  },
  {
    title: '运行时约定',
    tone: 'note',
    eyebrow: 'Lifecycle',
    body: '所有主 view 都在网页会话期间保持连续状态，这使得模块切换更接近桌面应用的工作流。',
    points: ['KeepAlive 保留组件实例', '后台任务不中断', '切回时保持之前的运行进度'],
  },
  {
    title: '工程质量',
    tone: 'metric',
    eyebrow: 'Quality Gate',
    body: '项目当前把类型检查、单测和构建都作为日常门禁，确保重构不会悄悄破坏行为。',
    metricLabel: 'Tests',
    metricValue: '60',
    metricFootnote: '全量测试用例',
  },
  {
    title: '代码组织',
    tone: 'note',
    eyebrow: 'Structure',
    body: '视图负责编排、组件负责展示、composable 负责控制流、utils / models 负责算法与规则。',
    points: ['UI 与业务状态分离', '测试覆盖组件与算法两侧', '注释围绕职责和边界补充'],
  },
  {
    title: '开发入口',
    tone: 'command',
    eyebrow: 'Commands',
    body: '常用命令集中在这里，适合快速启动或交接时复盘。',
    commands: ['npm run dev', 'npm run test:unit -- --run', 'npm run type-check', 'npm run build'],
  },
  {
    title: '下一步扩展方向',
    tone: 'feature',
    eyebrow: 'Roadmap',
    body: '当前基础已经适合继续演进，比如接入更真实的数据面板、更多可视化模块，或更强的保存 / 恢复机制。',
    points: ['运行时持久化', '更丰富的项目介绍内容', '更多算法演示模块'],
  },
]
</script>

<template>
  <section class="dashboard-view">
    <header class="hero">
      <p class="hero-kicker">Default Home</p>
      <h1>Fret 项目介绍</h1>
    </header>

    <div class="waterfall">
      <article
        v-for="card in introCards"
        :key="card.title"
        class="intro-card"
        :class="`tone-${card.tone}`"
      >
        <p class="eyebrow">{{ card.eyebrow }}</p>
        <h2>{{ card.title }}</h2>
        <p class="body">{{ card.body }}</p>

        <div v-if="card.metricValue" class="metric-block">
          <span class="metric-label">{{ card.metricLabel }}</span>
          <strong class="metric-value">{{ card.metricValue }}</strong>
          <span class="metric-footnote">{{ card.metricFootnote }}</span>
        </div>

        <ul v-if="card.points" class="point-list">
          <li v-for="point in card.points" :key="point">{{ point }}</li>
        </ul>

        <div v-if="card.commands" class="command-list">
          <code v-for="command in card.commands" :key="command">{{ command }}</code>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.dashboard-view {
  height: 100%;
  padding: 2.5rem;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  background:
    radial-gradient(circle at top left, rgba(56, 189, 248, 0.14), transparent 28%),
    radial-gradient(circle at 80% 20%, rgba(244, 114, 182, 0.12), transparent 24%),
    linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(2, 6, 23, 0.98));
}

.dashboard-view::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.hero {
  max-width: 780px;
  margin-bottom: 2rem;
}

.hero-kicker {
  color: #38bdf8;
  font-size: 0.78rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin-bottom: 0.75rem;
}

.hero h1 {
  font-size: clamp(2.2rem, 4vw, 4.5rem);
  line-height: 0.95;
  color: #f8fafc;
  margin-bottom: 1rem;
}

.hero-copy {
  max-width: 680px;
  color: #cbd5e1;
  line-height: 1.75;
  font-size: 1rem;
}

.waterfall {
  column-count: 3;
  column-gap: 1.25rem;
}

.intro-card {
  break-inside: avoid;
  margin-bottom: 1.25rem;
  padding: 1.35rem;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.72);
  box-shadow: 0 20px 45px rgba(2, 6, 23, 0.35);
  backdrop-filter: blur(14px);
  position: relative;
  overflow: hidden;
  transition:
    transform 0.24s ease,
    box-shadow 0.24s ease,
    border-color 0.24s ease,
    background 0.24s ease;
}

.intro-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.16), transparent 42%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.06), transparent 55%);
  opacity: 0;
  transition: opacity 0.24s ease;
  pointer-events: none;
}

.intro-card::after {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  background: linear-gradient(135deg, rgba(125, 211, 252, 0.45), rgba(255, 255, 255, 0.04), rgba(251, 191, 36, 0.22));
  opacity: 0;
  transition: opacity 0.24s ease;
  pointer-events: none;
  mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  padding: 1px;
  mask-composite: exclude;
  -webkit-mask-composite: xor;
}

.intro-card:hover {
  transform: translateY(-8px) scale(1.01);
  border-color: rgba(125, 211, 252, 0.24);
  box-shadow:
    0 28px 60px rgba(2, 6, 23, 0.48),
    0 0 24px rgba(56, 189, 248, 0.12);
}

.intro-card:hover::before,
.intro-card:hover::after {
  opacity: 1;
}

.intro-card > * {
  position: relative;
  z-index: 1;
}

.tone-hero {
  background: linear-gradient(180deg, rgba(14, 165, 233, 0.18), rgba(15, 23, 42, 0.88));
}

.tone-feature {
  background: linear-gradient(180deg, rgba(99, 102, 241, 0.16), rgba(15, 23, 42, 0.8));
}

.tone-note {
  background: linear-gradient(180deg, rgba(51, 65, 85, 0.9), rgba(15, 23, 42, 0.82));
}

.tone-metric {
  background: linear-gradient(180deg, rgba(16, 185, 129, 0.18), rgba(15, 23, 42, 0.82));
}

.tone-command {
  background: linear-gradient(180deg, rgba(249, 115, 22, 0.16), rgba(15, 23, 42, 0.82));
}

.eyebrow {
  color: #7dd3fc;
  font-size: 0.76rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-bottom: 0.8rem;
}

.intro-card h2 {
  color: #f8fafc;
  font-size: 1.25rem;
  margin-bottom: 0.85rem;
}

.body {
  color: #cbd5e1;
  line-height: 1.7;
}

.point-list {
  margin-top: 1rem;
  padding-left: 1rem;
  color: #e2e8f0;
}

.point-list li + li {
  margin-top: 0.55rem;
}

.metric-block {
  display: flex;
  flex-direction: column;
  margin-top: 1.1rem;
  padding: 1rem;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.metric-label,
.metric-footnote {
  color: #a7f3d0;
}

.metric-value {
  font-size: 3rem;
  line-height: 1;
  color: #f0fdf4;
  margin: 0.35rem 0;
}

.command-list {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  margin-top: 1rem;
}

.command-list code {
  display: block;
  padding: 0.8rem 0.9rem;
  border-radius: 12px;
  background: rgba(2, 6, 23, 0.55);
  color: #fde68a;
  font-size: 0.92rem;
}

@media (max-width: 1100px) {
  .waterfall {
    column-count: 2;
  }
}

@media (max-width: 720px) {
  .dashboard-view {
    padding: 1.4rem;
  }

  .waterfall {
    column-count: 1;
  }
}
</style>
