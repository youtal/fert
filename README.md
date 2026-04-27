# Fret 框架 - 多模块前端算法可视化系统 (v0.2.8)

Fret 是一个基于 Vue 3、Vite、Pinia 和 Vitest 的前端应用，当前包含三个核心演示模块：

- 生态系统仿真：使用空间哈希、Boids 行为和捕食者机制进行动态演化。
- 数独解算：使用位掩码、约束传播与回溯完成题目生成、求解与动画展示。
- 点阵网格：使用可复现 seed 生成 150 x 150 点阵连接网络，并通过覆盖全网格的滑窗抽样检查补偿局部近点远路。

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

### 结构分层

- `src/views` 只负责页面级装配、生命周期接线和组件编排；不要在 view 模板中分散复杂状态分支、算法细节或 Canvas 绘制细节。
- `src/components` 放展示组件和局部交互组件；组件通过 props / emits 与父级通信，不直接越界读写其它模块状态。
- `src/components/shared` 放跨模块复用的 UI 壳组件。新增卡片式 UI 时优先复用 `BaseCard.vue`，并通过调用方传入 class 继承局部样式；需要悬浮展开的面板优先复用 `FloatingPanelGroup.vue`。
- `src/composables` 放业务控制器、生命周期副作用、DOM 事件绑定和运行时状态编排。复杂 view 超过可读范围时，优先拆 composable。
- `src/composables/<module>` 放模块私有 composable，例如 Grid 的视口交互与增长动画；不要把模块私有状态提升到全局 store。
- `src/models` 放有状态领域模型，目前主要是生态系统实体、物理运动和空间哈希。
- `src/utils` 放纯算法、纯绘制函数和可复现工具。算法应尽量无 DOM 依赖，便于单测和复现。
- `src/stores` 只保存跨组件共享且可序列化的 Pinia 状态；实时实体数组、定时器、Canvas context、AudioContext 等副作用对象不得放入 store。
- `router/index.ts` 只声明导航映射，不承载业务逻辑、权限判断或数据预取。

### 状态与生命周期

- 所有主 view 均通过 `KeepAlive` 保持会话级连续性；切换页面不应重置用户正在观察或操作的模块状态。
- 生态系统必须维持“后台持续仿真、前台按需渲染”的运行模型：后台 `setInterval` 推进仿真，前台 `requestAnimationFrame` 只在视图激活时绘制。
- 生态系统运行时保持单例时钟，但允许新的 DOM / Canvas 引用接管渲染目标，避免 HMR 或异常重挂载后继续持有旧画布。
- 数独在切换视图后应保留题面、解题进度、自动解算状态和用户输入反馈。
- 点阵网格在视图内保持 seed、缩放、平移、动画进度和滑窗检测/补偿状态；重置、回放、冻结 seed 等用户意图由 GridView 编排。
- 绑定到 `window`、Canvas、ResizeObserver、requestAnimationFrame、setInterval、AudioContext 的副作用必须在对应生命周期中清理。
- 页面反馈统一走 `useAppNotifications` 的非阻塞通知，不使用 `alert` 作为用户反馈机制。

### 模块规则

- Sudoku 默认难度为 `55`；自动解算完成与验证通过使用独立提示音。
- 数独的 `solutionSnapshot` 只允许用于用户输入正确/错误反馈；自动解算严禁依赖答案副本，必须使用 `Sudoku` 算法入口。
- 数独初盘、用户输入和算法入口都只接受 `0` 或 `1..9` 整数；`0` 表示空格，非整数、`NaN` 和越界值必须被视为非法。
- 数独求解应复用共享的候选计算、MRV 选格、mask 写入/回滚和约束传播辅助逻辑，不要再复制一套同步或异步回溯内核。
- Grid 网络生成必须保持同一 seed 可复现；涉及随机序列的逻辑应使用 `gridNetwork.ts` 中的 seed 随机源，不要混入全局 `Math.random`。
- Grid 滑窗检测必须保证窗口区域覆盖全部 `150 x 150` 节点；窗口内采用锚点 + 固定 offset 的近邻点对抽样，不声明为全点对穷举检测。
- Grid 滑窗探测点对应全局去重，避免相邻重叠窗口重复执行同一 pair 的 BFS 判定。
- Grid 每个检测步骤需要保留 `probes` 元数据，包括几何距离、判定阈值、网络距离和是否补偿；动画必须消费同一份 `detectionSteps`，不要再用独立的演示数据模拟检测过程。
- Grid 的 Canvas 绘制逻辑放在 `gridCanvas.ts`，视口拖拽/缩放放在 `useGridViewport`，增长动画放在 `useGridGrowthAnimation`；不要让 GridView 回到上帝组件状态。
- 生态系统参数必须通过 store 的 sanitizing 入口兜底，仿真循环只消费清洗后的参数。

### UI 与 CSS

- 不得在重构中改变现有 UI 表现与交互行为，除非需求明确要求。抽象 UI 时保留原 class、DOM 语义和 scoped CSS 生效范围。
- 卡片结构统一从 `BaseCard.vue` 进入；`BaseCard` 本身不携带视觉样式，避免把 Dashboard 卡片、浮层 glass-card、控制卡片等不同视觉强行合并。
- 悬浮面板统一使用 `FloatingPanelGroup.vue`，保持默认折叠、悬浮预览、点击锁定、左右定位和触发按钮 ARIA 语义一致。
- CSS 优化优先删除已确认未使用的规则；只有在数值、阴影、padding、blur、边框半径和交互状态完全一致时，才抽象为共享样式。
- 避免把局部样式改成全局样式。共享样式必须有明确复用边界，防止影响其它 view。
- 除文本输入控件外，页面默认不显示输入光标；按钮、滑块和 Canvas 保留各自交互指针。
- 新增可点击元素应使用语义化 `button` 或补足 ARIA 属性；Canvas 仅作视觉承载时应设置合适的可访问性说明或隐藏策略。
- 移动端与桌面端都要保证文字不溢出、不遮挡、不因 hover/动态内容导致布局跳动。

### 代码规范

- 使用 TypeScript 和 Vue SFC `<script setup lang="ts">`；导入路径优先使用 `@/` alias。
- 新增源文件和测试文件顶部应包含简短职责说明；复杂算法块可以加少量意图注释，避免空泛注释。
- 优先使用结构化数据、数组、Set/Map、类型定义和现有工具函数，不用脆弱的字符串拼接处理核心数据。
- 不引入无必要的新抽象；只有当它能减少真实重复、隔离副作用或稳定模块边界时才抽象。
- 不使用 `any` 绕过类型检查；测试中需要 mock 复杂浏览器对象时可以局部 `unknown as`，但应保持断言目标清晰。
- 不提交无关格式化或大范围样式重排；格式化仅限本次修改涉及的文件。
- 当前保留 `Vue beta` 依赖和 overrides；除非需求明确指定，不在普通功能或重构任务中调整框架版本。
- 版本号使用 `package.json` / `package-lock.json` / README 标题同步更新。

### 测试与门禁

- 新增或修改算法必须补充 `utils` 或 `models` 层单测，覆盖合法输入、非法输入、边界条件和可复现性。
- 修改 composable 生命周期、副作用或 DOM 事件绑定时，必须补充或更新对应 composable / view 测试，验证清理行为和 KeepAlive 场景。
- 修改 Canvas 绘制时优先测试抽出的纯绘制函数，不在 jsdom 中绑定脆弱的像素级断言。
- Grid 网络相关改动至少保持 seed 确定性、连通性、滑窗全节点覆盖、探测 pair 去重、检测元数据、滑窗补偿和生成耗时预算测试通过。
- 修改 UI 结构但要求视觉不变时，应尽量保留既有 class，并通过现有组件/view 测试确认关键结构仍存在。
- 提交前至少执行：

```bash
npm run test:unit -- --run
npm run test:coverage
npm run type-check
npm run build
```

- `npm run build` 已包含 `type-check` 和生产构建，可作为最终交付门禁；`npm run test:coverage` 使用 V8 coverage provider 和基础阈值防回退。

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
- 测试用例：84
- 覆盖范围包括：
  - 数独算法正确性、非法初盘判定与题目生成
  - 数独与生态系统 composable 的生命周期行为与通知分支
  - 点阵网络 seed 规范化、确定性生成、滑窗全覆盖、探测去重与补偿
  - 核心视图、侧边栏、浮层卡片与数独 UI 交互
  - Grid Canvas 绘制层、网络连通性与生成耗时预算

## 本次更新摘要

- Grid 滑窗检测补齐边界窗口，确保滑窗区域覆盖完整 `150 x 150` 点阵。
- Grid 滑窗探测点对加入全局去重，避免重叠窗口重复执行同一 pair 的 BFS 判定。
- Grid 网络计划新增 `detectionSteps` 元数据，记录探测 pair、距离阈值、网络距离与补偿结果。
- Grid 动画改为消费真实检测步骤，同步展示当前滑窗、探测点对和补偿线段。
- Grid 相关测试补充滑窗全覆盖、探测去重、检测元数据和动画一致性断言。
- README 开发约定扩展为接手规范，集中说明结构分层、生命周期、模块规则、UI/CSS、代码规范与门禁要求。

## 说明

- README 以当前实现为准，不再声明未启用或未落地的运行模式。
