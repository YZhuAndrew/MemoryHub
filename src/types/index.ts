/**
 * MemoryHub 核心类型定义
 *
 * 这是整个项目的"通用语言"——无论数据来自 Markdown、SQLite 还是 JSON，
 * 最终都会被抽象成这里定义的统一类型。
 */

// ============================================================================
// 第一部分：数据来源相关类型
// ============================================================================

/**
 * 记忆项的类型分类。
 * 不同 Agent 用不同的文件名来表达类似的概念，这里做统一归类。
 */
export type MemoryType =
  | "memory" // 记忆（最常见，如 MEMORY.md 的内容）
  | "identity" // 身份设定（SOUL.md / IDENTITY.md）
  | "user" // 用户画像（USER.md）
  | "rules" // 规则（CLAUDE.md / AGENTS.md / rules/）
  | "heartbeat" // 心跳/状态（HEARTBEAT.md）
  | "bootstrap" // 启动配置（BOOTSTRAP.md）
  | "profile" // Agent 档案（PROFILE.md）
  | "tools" // 工具配置（TOOLS.md）
  | "prompt" // 提示词片段
  | "skill" // 技能定义（SKILL.md）
  | "unknown"; // 未分类

/**
 * 原始文件的格式范式。
 * Scanner 根据这个值选择对应的 Parser。
 */
export type SourceFormat =
  | "md-full" // 整个 Markdown 文件作为一条记忆
  | "md-section" // 用分隔符（如 §）切分的 Markdown，每段一条
  | "md-heading" // 用 ## 标题切分的 Markdown，每个标题下一块一条
  | "md-task" // Codex 风格：Task 分组 + 元信息
  | "dir-md" // 目录下每个 .md 文件一条
  | "sqlite" // SQLite 数据库（如 Memmy）
  | "json" // JSON 配置文件
  | "text"; // 纯文本

/**
 * 记忆项的作用域。
 * - global: Agent 的全局配置（~/.agent/ 下）
 * - project: 某个项目文件夹内的配置
 */
export type MemoryScope = "global" | "project";

// ============================================================================
// 第二部分：MemoryItem —— 统一数据模型（核心！）
// ============================================================================

/**
 * 一个 MemoryItem 代表一条可被浏览/搜索/编辑/同步的记忆单元。
 * 无论来源格式如何，解析后都变成这个结构。
 */
export interface MemoryItem {
  /** 唯一 ID（agentId + ':' + 相对路径 + '#' + 条目内序号） */
  id: string;

  /** 来源信息 */
  source: MemorySource;

  /** 标题（记忆条目的标题，或文件名） */
  title: string;

  /** 正文内容 */
  content: string;

  /** 原始格式（用于决定编辑后如何写回） */
  format: SourceFormat;

  /** 在原文件中的定位信息（用于精确写回，不破坏原文件结构） */
  location?: ItemLocation;

  /** 从内容中提取的标签 */
  tags: string[];

  /** 文件的最后修改时间（Unix 毫秒） */
  updatedAt: number;

  /** 内容字符数（用于列表显示） */
  contentLength: number;
}

/**
 * MemoryItem 的来源追踪信息。
 * 知道一条记忆"来自哪个 Agent 的哪个文件"，才能写回原处。
 */
export interface MemorySource {
  /** Agent 的 profile ID（如 "hermes"、"codex"） */
  agentId: string;
  /** Agent 显示名（如 "Hermes"） */
  agentName: string;
  /** Agent 图标/emoji */
  agentIcon: string;
  /** 原始文件的绝对路径 */
  filePath: string;
  /** 这条记忆的类型 */
  itemType: MemoryType;
  /** 作用域：全局还是项目级 */
  scope: MemoryScope;
  /** 如果是项目级，项目名/路径 */
  project?: string;
}

/**
 * 记忆条目在原文件中的定位。
 * 编辑时只替换这一段，不影响文件其他内容。
 */
export interface ItemLocation {
  /**
   * 对 Markdown 类格式：行号范围 [起始行, 结束行]
   * 对 SQLite：这是 null（通过 SQL UPDATE 定位）
   */
  lineRange?: [number, number];
  /** 对 md-section 格式：分隔符（如 "§"） */
  delimiter?: string;
  /** 对 SQLite：表中的主键 ID */
  sqliteRowId?: string;
  /** 对 SQLite：表名 */
  sqliteTable?: string;
}

// ============================================================================
// 第三部分：Agent Profile —— 扫描注册表
// ============================================================================

/**
 * 一个 Agent Profile 描述了某种 Agent "把文件存在哪里、什么格式"。
 * Scanner 根据 Profile 去文件系统找文件，再交给对应的 Parser 解析。
 *
 * 支持新 Agent 只需新增一条 Profile，不用改代码。
 */
export interface AgentProfile {
  /** 唯一 ID（小写英文，如 "hermes"） */
  id: string;
  /** 显示名（如 "Hermes"） */
  name: string;
  /** 图标 emoji */
  icon: string;
  /** 根目录（支持 ~ 开头，运行时展开） */
  root: string;
  /** 简短描述 */
  description?: string;
  /** 官网/文档链接 */
  homepage?: string;
  /** 这个 Profile 是否启用（用户可在设置里关闭不用的 Agent） */
  enabled: boolean;
  /** 要扫描的条目列表 */
  items: ProfileItem[];
}

/**
 * Profile 中的一个扫描条目。
 * 描述"一个文件或目录"的格式信息。
 */
export interface ProfileItem {
  /** 条目类型 */
  type: MemoryType;
  /** 相对于 root 的路径，支持通配符（如 workspaces 下匹配子目录） */
  path: string;
  /** 文件格式范式 */
  format: SourceFormat;
  /**
   * 格式专属参数。
   * - md-section: { delimiter: "§" }
   * - sqlite: { table: "memories", keyColumn: "memory_key", valueColumn: "memory_value" }
   * - dir-md: { glob: 递归匹配 md 文件, exclude: [".git"] }
   */
  formatOptions?: Record<string, unknown>;
  /** 是否可编辑（有些只读来源可以标记为不可编辑） */
  editable?: boolean;
}

// ============================================================================
// 第四部分：扫描结果 & 统计
// ============================================================================

/**
 * 一次完整扫描的结果。
 */
export interface ScanResult {
  /** 扫描开始时间 */
  startedAt: number;
  /** 扫描耗时（毫秒） */
  durationMs: number;
  /** 发现的所有记忆条目 */
  items: MemoryItem[];
  /** 按 Agent 分组的统计 */
  statsByAgent: AgentScanStats[];
  /** 扫描过程中的错误（如某个文件读取失败） */
  errors: ScanError[];
}

export interface AgentScanStats {
  agentId: string;
  agentName: string;
  agentIcon: string;
  /** 该 Agent 下发现的条目数 */
  itemCount: number;
  /** 按类型分组的数量 */
  countByType: Partial<Record<MemoryType, number>>;
  /** 该 Agent 的根目录是否存在 */
  rootExists: boolean;
}

export interface ScanError {
  agentId: string;
  filePath: string;
  message: string;
}
