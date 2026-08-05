<p align="center">
  <img src="assets/readme/hero.svg" alt="MemoryHub - Agent 记忆统一管理中心" width="100%">
</p>

<p align="center">
  <strong>在一个轻量桌面应用中浏览、搜索、编辑、同步所有 AI Agent 的记忆</strong>
</p>

<p align="center">
  <a href="#安装与运行">安装</a> ·
  <a href="#支持的-agent">支持的 Agent</a> ·
  <a href="#功能特性">功能</a> ·
  <a href="#技术栈">技术栈</a>
</p>

---

## 这是什么

MemoryHub 是一个轻量级 macOS 桌面工具，解决一个简单的问题：**你的 AI Agent 太多了，记忆散落在各处**。

Hermes 用 `§` 分隔的记忆、Codex 用 Task 分组、Memmy 存在 SQLite 数据库、WorkBuddy 用 `##` 标题、Claude Code 的 CLAUDE.md……每个 Agent 有自己的格式和位置。MemoryHub 把它们全部扫描进来，在一个统一的三栏界面里管理。

> 核心原则：MemoryHub 是一个**索引器 + 编辑器**。它不改变原始文件结构，内容始终在 Agent 原处。删除 MemoryHub 不影响任何 Agent。

## 支持的 Agent

内置 16 个常见 Agent，开箱即用：

| Agent | 格式 | 关键路径 |
|-------|------|---------|
| **Hermes** | `§` 分隔的 Markdown | `~/.hermes/memories/MEMORY.md` |
| **Codex** | Task 分组 + rules/prompts 目录 | `~/.codex/` |
| **Claude Code** | CLAUDE.md + projects/*/memory/ | `~/.claude/` |
| **Claude Memory** | SQLite 数据库 | `~/.claude-mem/claude-mem.db` |
| **Memmy** | SQLite（FTS + 向量嵌入） | `~/.memmy/memory-service/memory.sqlite` |
| **WorkBuddy** | `##` 标题切分 | `~/.workbuddy/` |
| **OpenClaw** | 身份文件套件 | `~/.openclaw/workspace/` |
| **CoPaw** | 多 workspace（通配符） | `~/.copaw/workspaces/*/` |
| **ZCode** | skills 目录 | `~/.zcode/skills/` |
| **Cursor** | skills 目录 | `~/.cursor/skills/` |
| **千问办公** | awareness 套件（§ 分隔） | `~/.qwenworkcn/awareness/main/` |
| **QoderWork** | awareness 套件（§ 分隔） | `~/.qoderworkcn/awareness/main/` |
| **Trae** | 用户画像 + 规则 + 会话记忆 | `~/.trae-cn/memory/` |
| **Qoder** | skills 目录 | `~/.qoder/skills/` |
| **Opencode** | skills 目录 | `~/.opencode/skills/` |
| **pi / Orca** | skills 目录 | `~/.pi/agent/skills/` |

> 不在列表里？往下看「自定义 Agent」，添加任意 Agent。也支持添加项目级记忆（如 `~/git-projects/my-project/CLAUDE.md`）。

<p align="center">
  <img src="assets/readme/architecture.svg" alt="MemoryHub 架构" width="100%">
</p>

## 功能特性

### 浏览与搜索
- **三栏可拖拽布局** — 左侧 Agent/项目/类型导航，中间记忆列表，右侧详情编辑
- **全局搜索** — 跨所有 Agent 搜索标题、内容、标签
- **多维筛选** — 按 Agent、项目、类型组合筛选，点击类型条数即可快速筛选
- **三种排序** — 按时间、按类型、按标题

### 编辑与类型管理
- **编辑写回原文件** — 编辑后精确写回，不破坏原文件其他内容（`⌘S` 保存 / `Esc` 取消）
- **Markdown 渲染** — 详情面板用 react-markdown 渲染，正确处理 frontmatter
- **类型可修改** — Profile 条目类型和单条记忆类型都可在设置中覆盖
- **外部编辑器** — 一键用 Typora / Zed / VS Code / Cursor 打开，或在访达中显示

### 自定义 Agent
- **完整增删改查** — 在设置中添加任意 Agent，能力与内置 Agent 完全对等
- **扫描条目编辑器** — 每个条目可配置：记忆类型、相对路径、文件格式（`md-full` / `md-heading` / `md-section` / `dir-md` / `sqlite` 等）、是否可编辑
- **格式专属参数** — `md-section` 配置分隔符、`dir-md` 配置 glob/排除规则、复杂格式提供 JSON 高级选项
- **自动生效** — 保存后自动重新扫描，自定义 Agent 立即出现在侧边栏

### 个性化
- **暗色模式** — 跟随系统，一键切换，记忆偏好
- **字体大小** — `⌘+` / `⌘-` / `⌘0` 调整
- **自定义图标颜色** — 为每个 Agent 和项目选择 lucide 图标和主题色
- **侧边栏折叠** — Agent 和类型分组可展开/收起

### 备份与恢复
- **一键备份** — 打包设置 + 所有记忆文件为 zip
- **版本管理** — 默认保留最近 10 个备份
- **导出/导入** — 导出到任意位置，从 zip 恢复

## 安装与运行

### 前置要求
- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/)（含 cargo）
- Xcode Command Line Tools（macOS）

### 开发模式

```bash
# 安装依赖
pnpm install

# 启动开发服务器（首次编译约 3-5 分钟）
pnpm tauri dev
```

### 构建发布

```bash
pnpm tauri build
```

构建产物在 `src-tauri/target/release/` 下。

### 国内用户 Rust 镜像

如果 cargo 下载慢，配置 `~/.cargo/config.toml`：

```toml
[source.crates-io]
replace-with = "rsproxy-sparse"

[source.rsproxy-sparse]
registry = "sparse+https://rsproxy.cn/index/"
```

## 技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| 桌面框架 | Tauri 2 | 轻量（~10MB），原生菜单栏支持 |
| 前端 | React 19 + TypeScript | 三栏 UI |
| 构建 | Vite 7 + pnpm | 快速 HMR |
| 后端 | Rust | 文件系统操作、SQLite、备份压缩 |
| 数据库 | SQLite / rusqlite | Memmy/claude-mem 记忆读取 |
| 样式 | TailwindCSS 4 | 响应式 + 暗色模式 |
| 状态 | Zustand | 轻量全局状态管理 |
| 图标 | lucide-react | 无色 SVG 线条图标 |
| Markdown | react-markdown + remark-gfm | GFM 表格/任务列表 + frontmatter |

## 项目结构

```
memoryhub/
├── src/                           # 前端 (TypeScript/React)
│   ├── types/                     # 核心类型定义
│   ├── constants/                 # 图标注册表、颜色调色板、类型映射
│   ├── core/
│   │   ├── profiles/              # Agent Profile 注册表（扫描规则）
│   │   ├── scanner/               # 扫描引擎 + Tauri/Node FsAdapter
│   │   ├── parser/                # Markdown/SQLite 解析器
│   │   ├── editor/                # 编辑写回引擎
│   │   ├── actions.ts             # 外部操作（打开/复制/访达）
│   │   └── backup.ts              # 备份/恢复封装
│   ├── components/                # UI 组件（三栏/弹窗/选择器）
│   ├── hooks/                     # 主题、字体大小
│   └── store/                     # Zustand 状态管理
├── src-tauri/                     # Rust 后端
│   ├── src/lib.rs                 # Tauri 命令（fs/sqlite/backup/...）
│   ├── Cargo.toml
│   └── tauri.conf.json
└── scripts/                       # CLI 验证脚本
```

## 如何工作

MemoryHub 通过 **Agent Profile 注册表** 知道每种 Agent 把文件存在哪里、什么格式。扫描时：

1. 遍历所有启用的 Profile
2. 根据 Profile 配置找到对应的文件/目录
3. 交给对应的 Parser 解析（Markdown 多格式 / SQLite 查询）
4. 统一抽象为 `MemoryItem` 数据模型
5. 在三栏界面中展示

新增内置 Agent 只需在 `builtin-profiles.ts` 中加一条 Profile 配置，不用改其他代码。**普通用户无需改代码**——在设置界面用「自定义 Agent」即可可视化添加任意 Agent。

## 开发路线

- [x] **v0.1.0** — 核心功能：扫描/浏览/搜索/编辑/设置/备份/自定义 Agent
- [ ] 菜单栏 Tray 常驻
- [ ] 跨 Agent 同步（格式转换 + 预览）
- [ ] 更多 Agent 适配（Gemini CLI、Aider 等）

## License

MIT
