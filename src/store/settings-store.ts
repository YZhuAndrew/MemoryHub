/**
 * 设置管理 store
 */

import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import {
  DEFAULT_SETTINGS,
  DEFAULT_AGENT_APPEARANCE,
  type AppSettings,
  type AgentDisplayConfig,
  type ProjectScope,
  type CustomAgent,
} from "../types/settings";
import type { ProfileItem } from "../types";

interface SettingsState {
  settings: AppSettings;
  loaded: boolean;

  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;

  // 确保 Agent 配置存在 (不存在则用默认值创建)
  ensureAgentConfig: (id: string) => AgentDisplayConfig;

  // Agent 操作
  updateAgent: (id: string, updates: Partial<AgentDisplayConfig>) => void;
  toggleAgentEnabled: (id: string) => void;

  // Profile item 类型覆盖
  setItemTypeOverride: (agentId: string, itemPath: string, type: string) => void;

  // 单条记忆类型覆盖
  setItemCustomType: (itemId: string, type: string | null) => void;
  getItemCustomType: (itemId: string) => string | null;

  // 项目操作
  addProject: (project: ProjectScope) => void;
  removeProject: (name: string) => void;
  toggleProjectEnabled: (name: string) => void;
  updateProject: (name: string, updates: Partial<ProjectScope>) => void;

  // 自定义 Agent 操作 (完整增删改查)
  addCustomAgent: (partial?: Partial<CustomAgent>) => CustomAgent;
  updateCustomAgent: (id: string, updates: Partial<CustomAgent>) => void;
  removeCustomAgent: (id: string) => void;
  toggleCustomAgentEnabled: (id: string) => void;

  // 通用设置 (布尔开关: stayInTray / autoRefresh)
  setBoolSetting: (key: "stayInTray" | "autoRefresh", value: boolean) => void;

  // 文件夹选择
  pickFolder: () => Promise<string | null>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,

  loadSettings: async () => {
    try {
      const saved = await invoke<Record<string, unknown>>("read_settings");
      const settings: AppSettings = {
        agents: Array.isArray(saved.agents)
          ? (saved.agents as AgentDisplayConfig[])
          : Array.isArray(saved.customProfiles)
            ? (saved.customProfiles as AgentDisplayConfig[])
            : [],
        projects: Array.isArray(saved.projects)
          ? (saved.projects as ProjectScope[])
          : Array.isArray(saved.projectScopes)
            ? (saved.projectScopes as ProjectScope[])
            : [],
        customAgents: Array.isArray(saved.customAgents)
          ? (saved.customAgents as CustomAgent[])
          : [],
        stayInTray:
          typeof saved.stayInTray === "boolean" ? saved.stayInTray : true,
        autoRefresh:
          typeof saved.autoRefresh === "boolean" ? saved.autoRefresh : true,
      };
      set({ settings, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  saveSettings: async () => {
    const { settings } = get();
    try {
      await invoke("write_settings", { settings });
    } catch (e) {
      console.error("保存设置失败:", e);
    }
  },

  ensureAgentConfig: (id) => {
    const state = get();
    const existing = state.settings.agents.find((a) => a.id === id);
    if (existing) return existing;

    const defaults = DEFAULT_AGENT_APPEARANCE[id] ?? { icon: "bot", color: "neutral" };
    const newConfig: AgentDisplayConfig = {
      id,
      root: "",
      icon: defaults.icon,
      color: defaults.color,
      enabled: true,
    };

    set((s) => ({
      settings: { ...s.settings, agents: [...s.settings.agents, newConfig] },
    }));

    return newConfig;
  },

  updateAgent: (id, updates) => {
    set((state) => {
      const existing = state.settings.agents.find((a) => a.id === id);
      let agents: AgentDisplayConfig[];
      if (existing) {
        agents = state.settings.agents.map((a) =>
          a.id === id ? { ...a, ...updates } : a,
        );
      } else {
        const defaults = DEFAULT_AGENT_APPEARANCE[id] ?? { icon: "bot", color: "neutral" };
        agents = [...state.settings.agents, { id, root: "", icon: defaults.icon, color: defaults.color, enabled: true, ...updates }];
      }
      return { settings: { ...state.settings, agents } };
    });
    get().saveSettings();
  },

  toggleAgentEnabled: (id) => {
    get().updateAgent(id, {});
    set((state) => {
      const agents = state.settings.agents.map((a) =>
        a.id === id ? { ...a, enabled: !a.enabled } : a,
      );
      return { settings: { ...state.settings, agents } };
    });
    get().saveSettings();
  },

  setItemTypeOverride: (agentId, itemPath, type) => {
    set((state) => {
      const agents = state.settings.agents.map((a) => {
        if (a.id !== agentId) return a;
        const overrides = a.typeOverrides ?? [];
        const existing = overrides.find((o) => o.path === itemPath);
        let newOverrides;
        if (existing) {
          newOverrides = overrides.map((o) => (o.path === itemPath ? { ...o, type } : o));
        } else {
          newOverrides = [...overrides, { path: itemPath, type }];
        }
        return { ...a, typeOverrides: newOverrides };
      });
      return { settings: { ...state.settings, agents } };
    });
    get().saveSettings();
  },

  setItemCustomType: (itemId, type) => {
    set((state) => {
      const itemTypes = { ...(state.settings.itemTypes ?? {}) };
      if (type === null) {
        delete itemTypes[itemId];
      } else {
        itemTypes[itemId] = type;
      }
      return { settings: { ...state.settings, itemTypes } };
    });
    get().saveSettings();
  },

  getItemCustomType: (itemId) => {
    return get().settings.itemTypes?.[itemId] ?? null;
  },

  addProject: (project) => {
    set((state) => ({
      settings: {
        ...state.settings,
        projects: [...state.settings.projects, project],
      },
    }));
    get().saveSettings();
  },

  removeProject: (name) => {
    set((state) => ({
      settings: {
        ...state.settings,
        projects: state.settings.projects.filter((p) => p.name !== name),
      },
    }));
    get().saveSettings();
  },

  toggleProjectEnabled: (name) => {
    set((state) => ({
      settings: {
        ...state.settings,
        projects: state.settings.projects.map((p) =>
          p.name === name ? { ...p, enabled: !p.enabled } : p,
        ),
      },
    }));
    get().saveSettings();
  },

  updateProject: (name, updates) => {
    set((state) => ({
      settings: {
        ...state.settings,
        projects: state.settings.projects.map((p) =>
          p.name === name ? { ...p, ...updates } : p,
        ),
      },
    }));
    get().saveSettings();
  },

  // ---- 自定义 Agent ----

  addCustomAgent: (partial) => {
    const state = get();
    const baseName = partial?.name?.trim() || "新 Agent";
    const id = generateCustomAgentId(baseName, state.settings.customAgents);

    const defaultItems: ProfileItem[] = [
      { type: "memory", path: "", format: "md-full", editable: true },
    ];

    const agent: CustomAgent = {
      id,
      name: baseName,
      root: partial?.root ?? "",
      icon: partial?.icon ?? "bot",
      color: partial?.color ?? "neutral",
      enabled: partial?.enabled ?? true,
      description: partial?.description,
      items: partial?.items ?? defaultItems,
    };

    set((s) => ({
      settings: {
        ...s.settings,
        customAgents: [...s.settings.customAgents, agent],
      },
    }));
    get().saveSettings();
    return agent;
  },

  updateCustomAgent: (id, updates) => {
    set((state) => ({
      settings: {
        ...state.settings,
        customAgents: state.settings.customAgents.map((a) =>
          a.id === id ? { ...a, ...updates } : a,
        ),
      },
    }));
    get().saveSettings();
  },

  removeCustomAgent: (id) => {
    set((state) => ({
      settings: {
        ...state.settings,
        customAgents: state.settings.customAgents.filter((a) => a.id !== id),
      },
    }));
    get().saveSettings();
  },

  toggleCustomAgentEnabled: (id) => {
    set((state) => ({
      settings: {
        ...state.settings,
        customAgents: state.settings.customAgents.map((a) =>
          a.id === id ? { ...a, enabled: !a.enabled } : a,
        ),
      },
    }));
    get().saveSettings();
  },

  setBoolSetting: (key, value) => {
    set((state) => ({ settings: { ...state.settings, [key]: value } }));
    get().saveSettings();
  },

  pickFolder: async () => {
    try {
      return await invoke<string | null>("pick_folder");
    } catch {
      return null;
    }
  },
}));

/**
 * 生成唯一的自定义 Agent ID ("custom:<slug>")。
 * slug 取自 name (保留字母/数字/连字符/中文),冲突时追加数字后缀,兜底用时间戳。
 */
function generateCustomAgentId(name: string, existing: CustomAgent[]): string {
  const slugBase =
    name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\p{L}\p{N}-]/gu, "")
      .slice(0, 32) || "agent";

  for (let i = 0; i < 1000; i++) {
    const id = i === 0 ? `custom:${slugBase}` : `custom:${slugBase}-${i}`;
    if (!existing.some((a) => a.id === id)) return id;
  }
  // 兜底:用时间戳保证唯一
  return `custom:${slugBase}-${Date.now()}`;
}
