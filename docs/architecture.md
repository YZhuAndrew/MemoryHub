# MemoryHub 架构设计

## 概述

MemoryHub 是一个轻量级桌面工具，用于**统一管理散落在不同 Agent 中的记忆、规则和身份文件**。

### 核心定位
- **索引器 + 编辑器**：不改变原始文件结构，只做扫描 → 索引 → 统一视图 → 编辑写回
- **菜单栏常驻**：类似 CC-Switch，系统托盘快速访问
- **Profile 驱动**：支持新 Agent 只需加一条配置，不改代码

---

## 技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| 桌面框架 | Tauri 2 | 轻量(~10MB)，原生菜单栏支持 |
| 前端 | React 19 + TypeScript | 主窗口 UI |
| 构建 | Vite 7 + pnpm | 快速 HMR |
| 后端 | Rust (最小化) | 仅文件系统操作、SQLite、Tray |
| 数据库 | SQLite (索引) | 本地索引存储 |
| 样式 | TailwindCSS (待加) | UI 样式 |

---

## 项目结构

```
memoryhub/
├── src/                          # 前端 (TypeScript/React)
│   ├── types/
│   │   └── index.ts              # ★ 核心类型定义
│   ├── core/
│   │   ├── profiles/
│   │   │   └── builtin-profiles.ts   # ★ Agent 注册表
│   │   ├── scanner/
│   │   │   └── scanner.ts        # ★ 扫描引擎
│   │   ├── parser/
│   │   │   ├── markdown-parser.ts # ★ Markdown 多格式解析
│   │   │   └── index.ts          # ★ SQLite 解析
│   │   ├── indexer/              # 索引管理 (待实现)
│   │   └── syncer/               # 跨 Agent 同步 (待实现)
│   ├── components/               # React 组件 (待实现)
│   ├── store/                    # 状态管理 (待实现)
│   ├── App.tsx
│   └── main.tsx
├── src-tauri/                    # Rust 后端
│   ├── src/
│   │   ├── lib.rs                # Tauri 入口
│   │   └── commands.rs           # 文件系统命令 (待实现)
│   ├── Cargo.toml
│   └── tauri.conf.json
├── scripts/
│   └── scan-cli.mjs              # ★ CLI 验证脚本 (Node.js)
├── docs/
│   └── architecture.md           # 本文档
└── package.json
```

---

## 核心数据流

```
Agent Profile 注册表                原始文件 (不变)
        │                                │
        ▼                                ▼
   Scanner ──────读取──────► 文件系统 (~/.hermes/, ~/.codex/ ...)
        │
        ▼
   Parser (按 format 分发)
   ├── md-full    → 整文件一条
   ├── md-section → § 分隔切分
   ├── md-heading → ## 标题切分
   ├── md-task    → Task 分组
   ├── dir-md     → 目录下每个 .md
   └── sqlite     → SQL 查询
        │
        ▼
   MemoryItem[] (统一模型)
        │
        ├──► Indexer → SQLite 索引 (快速搜索)
        ├──► UI 渲染 → 主窗口展示
        └──► Editor → 编辑后写回原文件
```

---

## 统一数据模型：MemoryItem

无论来源是 Markdown 还是 SQLite，解析后都变成 `MemoryItem`：

```typescript
interface MemoryItem {
  id: string;              // 唯一ID
  source: {                // 来源追踪
    agentId, agentName, agentIcon,
    filePath,              // 原始文件路径 (写回用)
    itemType,              // memory/identity/user/rules/...
    scope,                 // global / project
  };
  title: string;           // 标题
  content: string;         // 正文
  format: SourceFormat;    // 原始格式
  location?: ItemLocation; // 在原文件中的定位 (精确写回)
  tags: string[];          // 提取的标签
  updatedAt: number;       // 修改时间
}
```

---

## Agent Profile 注册表

每个 Agent 定义一条 Profile，描述"文件在哪、什么格式"：

```typescript
{
  id: "hermes",
  name: "Hermes",
  root: "~/.hermes",
  items: [
    { type: "memory", path: "memories/MEMORY.md", format: "md-section",
      formatOptions: { delimiter: "§" } },
    { type: "identity", path: "SOUL.md", format: "md-full" },
  ]
}
```

### 已支持的 Agent (基于真实环境调研)

| Agent | 格式特点 | 关键路径 |
|-------|---------|---------|
| Hermes | § 分隔的 MEMORY.md | ~/.hermes/memories/ |
| Codex | Task 分组 + rules/prompts 目录 | ~/.codex/ |
| Claude Code | CLAUDE.md + agents/ 目录 | ~/.claude/ |
| Memmy | SQLite 数据库 (30+ 表，只读 memories) | ~/.memmy/memory-service/ |
| WorkBuddy | MEMORY.md + 身份文件套件 | ~/.workbuddy/ |
| OpenClaw | workspace/ 身份文件 | ~/.openclaw/workspace/ |
| CoPaw | 多 workspace (通配符) | ~/.copaw/workspaces/*/ |
| ZCode | skills 目录 | ~/.zcode/skills/ |
| Cursor | skills 目录 | ~/.cursor/skills/ |

---

## 开发路线

### 阶段 0-1：核心逻辑 (当前)
- [x] 类型定义
- [x] Agent Profile 注册表
- [x] Markdown 解析器 (4 种格式)
- [x] SQLite 解析器
- [x] Scanner 扫描引擎
- [ ] **CLI 验证** ← 进行中

### 阶段 2：主窗口 UI
- [ ] 三栏布局 (Agent 树 / 列表 / 详情编辑器)
- [ ] 全局搜索
- [ ] 编辑 & 写回

### 阶段 3：菜单栏
- [ ] 系统 Tray 常驻
- [ ] 快速搜索弹出窗
- [ ] 文件监听 (自动刷新)

### 阶段 4：跨 Agent 同步
- [ ] 格式转换引擎
- [ ] 同步预览
- [ ] 批量同步

---

## 关键设计决策

### 1. 为什么是"索引器"而非"导入器"？
内容始终存在原始文件中，MemoryHub 只维护索引。好处：
- 不破坏 Agent 原有读取逻辑
- 删除 MemoryHub 不影响任何 Agent
- 索引可随时重建

### 2. 为什么用 FsAdapter 依赖注入？
Scanner 不直接调文件系统 API，而是通过接口。好处：
- Tauri 环境和 Node CLI 环境共用同一套 Scanner 逻辑
- 方便单元测试

### 3. 为什么 SQLite 只读？
Memmy 的数据库有复杂的 FTS/向量索引，直接写入可能破坏一致性。
先只读展示，写回功能后期通过 Memmy 自身 API 实现。
