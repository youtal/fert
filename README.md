# Fret 框架 - 生态系统仿真与数独解算系统 (v0.2.1)

Fret 是一个基于 Vue 3、Vite 和 Vitest 的前端应用，当前包含两个核心模块：

- 生态系统仿真：使用空间哈希、Boids 行为和捕食者机制进行动态演化。
- 数独解算：使用位掩码、约束传播与回溯完成题目生成、求解与动画展示。

## 项目结构

- `src/views`：页面级视图
- `src/components`：界面组件
- `src/composables`：业务控制逻辑
- `src/models`：生态系统物理模型
- `src/utils`：数独算法与工具
- `src/stores`：Pinia 状态

## 生命周期约定

- 所有 view 均通过 `KeepAlive` 保持会话级连续性。
- 生态系统在后台继续推进仿真，但仅在前台激活时执行 Canvas 渲染。
- 数独在切换视图后保持题面、解题进度与自动解算状态连续。

## 开发约定

- 业务逻辑优先收敛到 `composables`、`models`、`utils`，尽量避免在视图模板中分散状态分支。
- 所有源代码与测试文件均应包含职责说明或断言意图注释，便于后续审计与维护。
- 数独的答案副本仅用于用户输入反馈，自动解算严禁依赖该副本。
- 生态系统模块需要维持“后台持续仿真、前台按需渲染”的运行模型。

## 环境要求

- Node.js: `^20.19.0` 或 `>=22.12.0`

## 常用命令

```bash
npm install
npm run dev
npm run test:unit -- --run
npm run type-check
npm run build
```

建议在提交前至少执行：

```bash
npm run test:unit -- --run
npm run type-check
npm run build
```

## 技术说明

- 当前依赖中包含 `vue` 的 `beta` 版本与对应 override，属于实验性栈选择。
- 标准构建包含 `type-check`，因此 `npm run build` 可直接作为交付门禁。
- 仓库未实现本地持久化；状态连续性依赖运行时内存与 `KeepAlive`。

## 测试现状

- 单元/集成测试文件：12
- 测试用例：54
- 覆盖范围包括：
  - 数独算法正确性、非法初盘判定与题目生成
  - 数独与生态系统 composable 的生命周期行为
  - 核心视图、侧边栏与数独 UI 交互

## 说明

- README 以当前实现为准，不再声明未启用或未落地的运行模式。
