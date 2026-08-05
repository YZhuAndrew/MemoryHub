/**
 * 用户设置数据结构
 *
 * 存储在 ~/.memoryhub/settings.json
 */

import type { ProfileItem } from "./index";

/** 单个 Profile item 的类型覆盖 */
export interface ItemTypeOverride {
  /** Profile item 的 path (如 "CLAUDE.md", "memories/MEMORY.md") */
  path: string;
  /** 覆盖的类型 */
  type: string;
}

/** Agent 的显示配置 (路径 + 图标 + 颜色 + 启用 + 类型覆盖) */
export interface AgentDisplayConfig {
  /** 对应内置 profile 的 id */
  id: string;
  /** 覆盖的根目录路径 (空=用默认) */
  root: string;
  /** 图标 name (见 icon-registry) */
  icon: string;
  /** 颜色 name (见 COLOR_PALETTE) */
  color: string;
  /** 是否启用 */
  enabled: boolean;
  /** Profile items 的类型覆盖 (path → type) */
  typeOverrides?: ItemTypeOverride[];
}

/** 项目级扫描范围 */
export interface ProjectScope {
  /** 项目名称 */
  name: string;
  /** 项目根目录 */
  root: string;
  /** 要扫描的文件名列表 (相对项目根) */
  files: string[];
  /** 图标 name */
  icon: string;
  /** 颜色 name */
  color: string;
  /** 是否启用 */
  enabled: boolean;
}

/**
 * 用户自定义 Agent —— 能力与内置 AgentProfile 对等。
 * 自带 items 数组(扫描条目),可完整增删改查。
 * id 用 "custom:<slug>" 前缀,在扫描器中得到 scope:"global"。
 */
export interface CustomAgent {
  /** 唯一 ID,格式 "custom:<slug>",由 store 生成 */
  id: string;
  /** 显示名 */
  name: string;
  /** 根目录 (支持 ~ 开头,运行时展开) */
  root: string;
  /** 图标 name (见 icon-registry) */
  icon: string;
  /** 颜色 name (见 COLOR_PALETTE) */
  color: string;
  /** 是否启用 */
  enabled: boolean;
  /** 简短描述 (可选) */
  description?: string;
  /** 扫描条目列表,同内置 AgentProfile.items */
  items: ProfileItem[];
}

export interface AppSettings {
  /** Agent 显示配置 */
  agents: AgentDisplayConfig[];
  /** 项目级扫描范围 */
  projects: ProjectScope[];
  /** 用户自定义 Agent */
  customAgents: CustomAgent[];
  /** 单条记忆的类型覆盖 (itemId → type) */
  itemTypes?: Record<string, string>;
}

/** 各 Agent 的默认图标和颜色 */
export const DEFAULT_AGENT_APPEARANCE: Record<string, { icon: string; color: string }> = {
  hermes: { icon: "wand", color: "purple" },
  codex: { icon: "terminal", color: "green" },
  claude: { icon: "bot", color: "orange" },
  "claude-mem": { icon: "database", color: "amber" },
  memmy: { icon: "database", color: "blue" },
  workbuddy: { icon: "package", color: "teal" },
  openclaw: { icon: "cat", color: "pink" },
  copaw: { icon: "heart", color: "red" },
  zcode: { icon: "code", color: "indigo" },
  cursor: { icon: "mouse", color: "cyan" },
  qwenwork: { icon: "sparkles", color: "purple" },
  qoderwork: { icon: "zap", color: "blue" },
  trae: { icon: "rocket", color: "indigo" },
  qoder: { icon: "wrench", color: "emerald" },
  opencode: { icon: "terminal", color: "teal" },
  pi: { icon: "heart", color: "cyan" },
};

/** 项目的默认图标和颜色 */
export const DEFAULT_PROJECT_APPEARANCE = { icon: "git", color: "amber" };

export const DEFAULT_SETTINGS: AppSettings = {
  agents: [],
  projects: [],
  customAgents: [],
};
