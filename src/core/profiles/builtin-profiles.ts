/**
 * MemoryHub 内置 Agent Profile 注册表
 *
 * 这里定义了 MemoryHub "认识"的各种 Agent——它们的文件存在哪里、什么格式。
 * 新增 Agent 支持只需往 PROFILES 数组里加一条，不用改其他代码。
 *
 * 这些 Profile 基于对 @yzhu 真实环境的扫描调研编写。
 */

import type { AgentProfile, MemoryType, ProfileItem } from "../../types";

export const BUILTIN_PROFILES: AgentProfile[] = [
  // ==========================================================================
  // Hermes —— 用 § 分隔的 MEMORY.md，另有 SOUL/USER 身份文件
  // ==========================================================================
  {
    id: "hermes",
    name: "Hermes",
    icon: "🜂",
    root: "~/.hermes",
    description: "Hermes Agent，记忆用 § 分隔",
    enabled: true,
    items: [
      {
        type: "memory",
        path: "memories/MEMORY.md",
        format: "md-section",
        formatOptions: { delimiter: "§" },
        editable: true,
      },
      { type: "identity", path: "SOUL.md", format: "md-full", editable: true },
      { type: "user", path: "memories/USER.md", format: "md-full", editable: true },
    ],
  },

  // ==========================================================================
  // Codex —— Task 分组的 MEMORY.md + rules/prompts 目录
  // ==========================================================================
  {
    id: "codex",
    name: "Codex",
    icon: "◉",
    root: "~/.codex",
    description: "OpenAI Codex CLI，含 memories/rules/prompts",
    enabled: true,
    items: [
      {
        type: "memory",
        path: "memories/MEMORY.md",
        format: "md-task",
        editable: true,
      },
      {
        type: "memory",
        path: "memories/memory_summary.md",
        format: "md-full",
        editable: true,
      },
      {
        type: "memory",
        path: "memories/raw_memories.md",
        format: "md-full",
        editable: true,
      },
      {
        type: "rules",
        path: "rules/",
        format: "dir-md",
        formatOptions: { glob: "**/*.md", exclude: [".git"] },
        editable: true,
      },
      {
        type: "rules",
        path: "AGENTS.md",
        format: "md-full",
        editable: true,
      },
      {
        type: "prompt",
        path: "prompts/",
        format: "dir-md",
        formatOptions: { glob: "**/*.md", exclude: [".git"] },
        editable: true,
      },
    ],
  },

  // ==========================================================================
  // Claude Code —— CLAUDE.md 规则 + claude-mem 数据库 + agents/skills/plans
  // ==========================================================================
  {
    id: "claude",
    name: "Claude Code",
    icon: "🤖",
    root: "~/.claude",
    description: "Anthropic Claude Code CLI",
    enabled: true,
    items: [
      { type: "rules", path: "CLAUDE.md", format: "md-full", editable: true },
      {
        type: "rules",
        path: "agents/",
        format: "dir-md",
        formatOptions: { glob: "**/*.md", exclude: [".git", "backups", ".runtime"] },
        editable: true,
      },
      {
        type: "memory",
        path: "projects/",
        format: "dir-md",
        formatOptions: { glob: "**/memory/*.md", exclude: [".git"] },
        editable: true,
      },
      {
        type: "skill",
        path: "skills/",
        format: "dir-md",
        formatOptions: { glob: "**/SKILL.md", exclude: [".git", "cache", "memmy-memory"] },
        editable: false,
      },
      {
        type: "prompt",
        path: "plans/",
        format: "dir-md",
        formatOptions: { glob: "**/*.md", exclude: [".git"] },
        editable: true,
      },
    ],
  },

  // ==========================================================================
  // Claude Memory (claude-mem) —— SQLite 记忆数据库
  // ==========================================================================
  {
    id: "claude-mem",
    name: "Claude Memory",
    icon: "🧠",
    root: "~/.claude-mem",
    description: "Claude Code 记忆数据库 (claude-mem)",
    enabled: true,
    items: [
      {
        type: "memory",
        path: "claude-mem.db",
        format: "sqlite",
        formatOptions: {
          table: "observations",
          keyColumn: "title",
          valueColumn: "narrative",
          layerColumn: "type",
          tagsColumn: "facts",
          updatedColumn: "created_at_epoch",
        },
        editable: false,
      },
      {
        type: "memory",
        path: "claude-mem.db",
        format: "sqlite",
        formatOptions: {
          table: "session_summaries",
          keyColumn: "request",
          valueColumn: "learned",
          layerColumn: "project",
          tagsColumn: "notes",
          updatedColumn: "created_at_epoch",
        },
        editable: false,
      },
      {
        type: "memory",
        path: "claude-mem.db",
        format: "sqlite",
        formatOptions: {
          table: "user_prompts",
          keyColumn: "prompt_text",
          valueColumn: "prompt_text",
          layerColumn: "content_session_id",
          updatedColumn: "created_at_epoch",
        },
        editable: false,
      },
    ],
  },

  // ==========================================================================
  // Memmy —— SQLite 数据库（只读 memories 表）
  // ==========================================================================
  {
    id: "memmy",
    name: "Memmy",
    icon: "🧠",
    root: "~/.memmy",
    description: "Memmy 记忆服务，SQLite 数据库存储",
    enabled: true,
    items: [
      {
        type: "memory",
        path: "memory-service/memory.sqlite",
        format: "sqlite",
        formatOptions: {
          table: "memories",
          keyColumn: "memory_key",
          valueColumn: "memory_value",
          layerColumn: "memory_layer",
          tagsColumn: "tags_json",
          updatedColumn: "updated_at",
          statusFilter: "activated", // 只读取激活状态的记忆
        },
        editable: false, // SQLite 写回较复杂，先只读
      },
    ],
  },

  // ==========================================================================
  // WorkBuddy —— MEMORY.md + 身份文件套件 (SOUL/USER/IDENTITY/BOOTSTRAP)
  // ==========================================================================
  {
    id: "workbuddy",
    name: "WorkBuddy",
    icon: "👤",
    root: "~/.workbuddy",
    description: "WorkBuddy Agent",
    enabled: true,
    items: [
      { type: "memory", path: "MEMORY.md", format: "md-heading", editable: true },
      { type: "identity", path: "SOUL.md", format: "md-full", editable: true },
      { type: "user", path: "USER.md", format: "md-heading", editable: true },
      { type: "identity", path: "IDENTITY.md", format: "md-full", editable: true },
      { type: "bootstrap", path: "BOOTSTRAP.md", format: "md-full", editable: true },
    ],
  },

  // ==========================================================================
  // OpenClaw —— workspace/ 下的身份文件套件
  // ==========================================================================
  {
    id: "openclaw",
    name: "OpenClaw",
    icon: "🐾",
    root: "~/.openclaw/workspace",
    description: "OpenClaw Agent workspace",
    enabled: true,
    items: [
      { type: "identity", path: "IDENTITY.md", format: "md-full", editable: true },
      { type: "identity", path: "SOUL.md", format: "md-full", editable: true },
      { type: "user", path: "USER.md", format: "md-full", editable: true },
      { type: "rules", path: "AGENTS.md", format: "md-full", editable: true },
      { type: "tools", path: "TOOLS.md", format: "md-full", editable: true },
      { type: "heartbeat", path: "HEARTBEAT.md", format: "md-full", editable: true },
    ],
  },

  // ==========================================================================
  // CoPaw —— 多 workspace（每个 workspace 独立一套 md），用通配符扫描
  // ==========================================================================
  {
    id: "copaw",
    name: "CoPaw",
    icon: "🐕",
    root: "~/.copaw",
    description: "CoPaw Agent，多 workspace",
    enabled: true,
    items: [
      {
        type: "memory",
        path: "workspaces/*/MEMORY.md",
        format: "md-heading",
        editable: true,
      },
      {
        type: "identity",
        path: "workspaces/*/SOUL.md",
        format: "md-full",
        editable: true,
      },
      {
        type: "rules",
        path: "workspaces/*/AGENTS.md",
        format: "md-full",
        editable: true,
      },
      {
        type: "profile",
        path: "workspaces/*/PROFILE.md",
        format: "md-full",
        editable: true,
      },
    ],
  },

  // ==========================================================================
  // ZCode —— CLI 配置目录
  // ==========================================================================
  {
    id: "zcode",
    name: "ZCode",
    icon: "⚡",
    root: "~/.zcode",
    description: "ZCode CLI",
    enabled: true,
    items: [
      {
        type: "skill",
        path: "skills/",
        format: "dir-md",
        formatOptions: {
          glob: "**/SKILL.md",
          exclude: [".git", "cache"],
        },
        editable: false,
      },
    ],
  },

  // ==========================================================================
  // Cursor —— skills 目录
  // ==========================================================================
  {
    id: "cursor",
    name: "Cursor",
    icon: "🖱️",
    root: "~/.cursor",
    description: "Cursor IDE Agent 配置",
    enabled: true,
    items: [
      {
        type: "skill",
        path: "skills/",
        format: "dir-md",
        formatOptions: {
          glob: "**/SKILL.md",
          exclude: [".git", "extensions"],
        },
        editable: false,
      },
    ],
  },

  // ==========================================================================
  // 千问办公 (QwenWork CN) —— awareness/main 套件：MEMORY/USER(§分隔) + AGENTS
  // ==========================================================================
  {
    id: "qwenwork",
    name: "千问办公",
    icon: "🜂",
    root: "~/.qwenworkcn",
    description: "通义千问办公 Agent (QwenWork)，awareness 记忆套件",
    enabled: true,
    items: [
      {
        type: "memory",
        path: "awareness/main/MEMORY.md",
        format: "md-section",
        formatOptions: { delimiter: "§" },
        editable: true,
      },
      {
        type: "user",
        path: "awareness/main/USER.md",
        format: "md-section",
        formatOptions: { delimiter: "§" },
        editable: true,
      },
      { type: "rules", path: "awareness/main/AGENTS.md", format: "md-full", editable: true },
      {
        type: "memory",
        path: "awareness/main/memory/",
        format: "dir-md",
        formatOptions: { glob: "**/*.md", exclude: [".git"] },
        editable: true,
      },
      {
        type: "skill",
        path: "skills/",
        format: "dir-md",
        formatOptions: { glob: "**/SKILL.md", exclude: [".git", "cache"] },
        editable: false,
      },
    ],
  },

  // ==========================================================================
  // QoderWork CN —— 与千问办公同架构的 awareness 套件
  // ==========================================================================
  {
    id: "qoderwork",
    name: "QoderWork",
    icon: "⚡",
    root: "~/.qoderworkcn",
    description: "QoderWork Agent，awareness 记忆套件",
    enabled: true,
    items: [
      {
        type: "memory",
        path: "awareness/main/MEMORY.md",
        format: "md-section",
        formatOptions: { delimiter: "§" },
        editable: true,
      },
      {
        type: "user",
        path: "awareness/main/USER.md",
        format: "md-section",
        formatOptions: { delimiter: "§" },
        editable: true,
      },
      { type: "rules", path: "awareness/main/AGENTS.md", format: "md-full", editable: true },
      {
        type: "memory",
        path: "awareness/main/memory/",
        format: "dir-md",
        formatOptions: { glob: "**/*.md", exclude: [".git"] },
        editable: true,
      },
      {
        type: "skill",
        path: "skills/",
        format: "dir-md",
        formatOptions: { glob: "**/SKILL.md", exclude: [".git", "cache"] },
        editable: false,
      },
    ],
  },

  // ==========================================================================
  // Trae CN —— 用户画像 + 用户规则 + 会话记忆 + skills
  // ==========================================================================
  {
    id: "trae",
    name: "Trae",
    icon: "🚀",
    root: "~/.trae-cn",
    description: "字节跳动 Trae IDE (国内版) Agent",
    enabled: true,
    items: [
      {
        type: "user",
        path: "memory/user_profile.md",
        format: "md-heading",
        editable: true,
      },
      {
        type: "rules",
        path: "user_rules/",
        format: "dir-md",
        formatOptions: { glob: "**/*.md", exclude: [".git"] },
        editable: true,
      },
      {
        type: "memory",
        path: "memory/projects/",
        format: "dir-md",
        formatOptions: { glob: "**/topics.md", exclude: [".git"] },
        editable: false,
      },
      {
        type: "skill",
        path: "skills/",
        format: "dir-md",
        formatOptions: { glob: "**/SKILL.md", exclude: [".git", "cache"] },
        editable: false,
      },
    ],
  },

  // ==========================================================================
  // Qoder —— IDE，主要是 skills 目录
  // ==========================================================================
  {
    id: "qoder",
    name: "Qoder",
    icon: "🔌",
    root: "~/.qoder",
    description: "Qoder IDE Agent 配置",
    enabled: true,
    items: [
      {
        type: "skill",
        path: "skills/",
        format: "dir-md",
        formatOptions: { glob: "**/SKILL.md", exclude: [".git", "extensions"] },
        editable: false,
      },
    ],
  },

  // ==========================================================================
  // Opencode —— CLI，主要是 skills 目录
  // ==========================================================================
  {
    id: "opencode",
    name: "Opencode",
    icon: "⌨️",
    root: "~/.opencode",
    description: "Opencode CLI Agent 配置",
    enabled: true,
    items: [
      {
        type: "skill",
        path: "skills/",
        format: "dir-md",
        formatOptions: { glob: "**/SKILL.md", exclude: [".git", "node_modules"] },
        editable: false,
      },
    ],
  },

  // ==========================================================================
  // pi / Orca —— Orca 宿主下的 pi agent，skills + hooks
  // ==========================================================================
  {
    id: "pi",
    name: "pi / Orca",
    icon: "🐬",
    root: "~/.pi",
    description: "Orca 宿主下的 pi Agent",
    enabled: true,
    items: [
      {
        type: "skill",
        path: "agent/skills/",
        format: "dir-md",
        formatOptions: { glob: "**/SKILL.md", exclude: [".git", "cache"] },
        editable: false,
      },
    ],
  },
];

/**
 * 获取所有启用的 Profile。
 * 用户可以在设置里关闭不需要的 Agent。
 */
export function getEnabledProfiles(): AgentProfile[] {
  return BUILTIN_PROFILES.filter((p) => p.enabled);
}

/**
 * 按 ID 查找 Profile。
 */
export function getProfileById(id: string): AgentProfile | undefined {
  return BUILTIN_PROFILES.find((p) => p.id === id);
}

/**
 * 合并内置 Profile 和用户自定义设置。
 */
export function getEffectiveProfiles(settings?: {
  agents?: {
    id: string;
    root: string;
    enabled: boolean;
    typeOverrides?: { path: string; type: string }[];
  }[];
  projects?: {
    name: string;
    root: string;
    files: string[];
    enabled: boolean;
  }[];
  customAgents?: {
    id: string;
    name: string;
    root: string;
    enabled: boolean;
    description?: string;
    items: ProfileItem[];
  }[];
}): AgentProfile[] {
  if (!settings) {
    return getEnabledProfiles();
  }

  // 合并内置 Profile 和用户覆盖（含类型覆盖）
  const profiles = BUILTIN_PROFILES.map((profile) => {
    const override = settings.agents?.find((o) => o.id === profile.id);
    if (!override) return profile;

    // 应用 item 类型覆盖
    let items = profile.items;
    if (override.typeOverrides && override.typeOverrides.length > 0) {
      items = profile.items.map((item) => {
        const typeOverride = override.typeOverrides!.find((o) => o.path === item.path);
        if (typeOverride) {
          return { ...item, type: typeOverride.type as MemoryType };
        }
        return item;
      });
    }

    return {
      ...profile,
      root: override.root?.trim() ? override.root : profile.root,
      enabled: override.enabled,
      items,
    };
  });

  // 添加用户自定义 Agent Profile (与内置 Agent 对等，自定义 id 带 "custom:" 前缀)
  const customProfiles: AgentProfile[] = (settings.customAgents ?? [])
    .filter((c) => c.enabled && c.name.trim() && c.root.trim())
    .map((c) => ({
      id: c.id, // 已是 "custom:xxx"
      name: c.name,
      // icon 字段在此数据模型里是 emoji 占位;真实显示图标由 resolveAgentAppearance 解析
      icon: "🤖",
      root: c.root,
      description: c.description,
      enabled: true,
      items: c.items,
    }));

  // 添加项目级 Profile
  const projectProfiles: AgentProfile[] = (settings.projects ?? [])
    .filter((p) => p.enabled)
    .map((p) => ({
      id: `project:${p.name}`,
      name: p.name,
      icon: "📁",
      root: p.root,
      description: `项目记忆: ${p.name}`,
      enabled: true,
      items: p.files.map((file) => ({
        type: file.includes("rule") || file.includes("AGENT") || file.includes("CLAUDE")
          ? ("rules" as const)
          : ("memory" as const),
        path: file,
        format: "md-full" as const,
        editable: true,
      })),
    }));

  return [
    ...profiles.filter((p) => p.enabled),
    ...customProfiles,
    ...projectProfiles,
  ];
}


