# Fret 框架 - 多模块前端算法可视化系统 (v0.2.7)

Fret 是一个基于 Vue 3、Vite、Pinia 和 Vitest 的前端应用，当前包含三个核心演示模块：

- 生态系统仿真：使用空间哈希、Boids 行为和捕食者机制进行动态演化。
- 数独解算：使用位掩码、约束传播与回溯完成题目生成、求解与动画展示。
- 点阵网格：使用可复现 seed 生成 150 x 150 点阵连接网络，并通过滑窗检查补偿局部近点远路。

## 项目结构

- `src/views`：页面级视图
- `src/components`：界面组件
- `src/components/shared/BaseCard.vue`：无样式卡片承载模板，新增卡片式 UI 时优先复用并通过 class 继承局部样式
- `src/composables`：业务控制逻辑
- `src/models`：生态系统物理模型
- `src/utils`：数独算法、点阵网络生成器与通用工具
- `src/stores`：Pinia 状态

## 生命周期约定

- 所有 view 均通过 `KeepAlive` 保持会话级连续性。
- 生态系统在后台继续推进仿真，但仅在前台激活时执行 Canvas 渲染。
- 数独在切换视图后保持题面、解题进度与自动解算状态连续。
- 点阵网格在视图内保持 seed、缩放、平移与动画进度，控制面板复用统一浮层交互。
- 默认首页为瀑布式项目介绍页，用于汇总模块能力、运行机制与开发约定。

## 开发约定

- 业务逻辑优先收敛到 `composables`、`models`、`utils`，尽量避免在视图模板中分散状态分支。
- 所有源代码与测试文件均应包含职责说明或断言意图注释，便于后续审计与维护。
- 数独的答案副本仅用于用户输入反馈，自动解算严禁依赖该副本。
- 生态系统模块需要维持“后台持续仿真、前台按需渲染”的运行模型。
- Sudoku 默认难度为 `55`，自动解算完成与验证通过使用独立提示音。
- 当前保留 `Vue beta` 依赖选择，不在本版内调整框架版本。
- 页面反馈优先走非阻塞通知，不再直接依赖 `alert`。
- 除文本输入控件外，页面默认不显示输入光标；按钮、滑块和 Canvas 保留各自交互指针。
- 过大的视图文件应拆分为组件、composable 或 utils，视图层只保留装配与事件编排。

## 环境要求

- Node.js: `^20.19.0` 或 `>=22.12.0`

## 常用命令

```bash
npm install
npm run dev
npm run test:unit -- --run
npm run test:coverage
npm run type-check
npm run build
```

建议在提交前至少执行：

```bash
npm run test:unit -- --run
npm run test:coverage
npm run type-check
npm run build
```

## 技术说明

- 当前依赖中包含 `vue` 的 `beta` 版本与对应 override，属于实验性栈选择。
- 标准构建包含 `type-check`，因此 `npm run build` 可直接作为交付门禁。
- 仓库未实现本地持久化；状态连续性依赖运行时内存与 `KeepAlive`。
- 已安装 Vitest V8 coverage provider，并通过 `npm run test:coverage` 输出覆盖率报告与基础阈值门禁。

## 本版说明

- 粒子演化与数独模块功能冻结本版。
- 本次版本以控制器瘦身、浮层复用、反馈机制整理、可访问性补强与文档同步为主，不继续扩展两大核心模块的新功能面。

## 测试现状

- 单元/集成测试文件：17
- 测试用例：81
- 覆盖范围包括：
  - 数独算法正确性、非法初盘判定与题目生成
  - 数独与生态系统 composable 的生命周期行为与通知分支
  - 点阵网络 seed 规范化、确定性生成与滑窗补偿
  - 核心视图、侧边栏、浮层卡片与数独 UI 交互
  - Grid Canvas 绘制层、网络连通性与生成耗时预算

## 本次更新摘要

- 抽离 `useSudoku` 中的音频逻辑到独立 composable，降低单文件职责密度。
- 新增全局通知层，替代阻塞式 `alert`，让反馈与动画流程更平滑。
- 生态系统与 Sudoku 的悬浮面板改为共享浮层壳组件，减少重复交互与样式定义。
- Dashboard 首页恢复竖向滚动能力，同时继续隐藏滚动条视觉。
- 导航、浮层触发器与数独格子补入更语义化的按钮交互与基础 ARIA 信息。
- GridView 控制面板已对齐共享浮层交互，网络生成算法拆出到 `src/utils/gridNetwork.ts`。

## 说明

- README 以当前实现为准，不再声明未启用或未落地的运行模式。
