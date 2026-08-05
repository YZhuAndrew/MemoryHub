/**
 * 设置弹窗
 */

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Pencil,
  Plus,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { useSettingsStore } from "../store/settings-store";
import { BUILTIN_PROFILES } from "../core/profiles/builtin-profiles";
import { resolveIcon, resolveColorText } from "../constants/icon-registry";
import { MEMORY_TYPES } from "../constants/memory-types";
import {
  DEFAULT_AGENT_APPEARANCE,
  DEFAULT_PROJECT_APPEARANCE,
} from "../types/settings";
import { AppearancePicker } from "./AppearancePicker";
import type { ProfileItem, SourceFormat } from "../types";

/** 自定义 Agent 扫描条目的所有可用格式 (含中文说明) */
const FORMAT_OPTIONS: { value: SourceFormat; label: string }[] = [
  { value: "md-full", label: "md-full · 整文件" },
  { value: "md-heading", label: "md-heading · 按标题切分" },
  { value: "md-section", label: "md-section · 按分隔符切分" },
  { value: "md-task", label: "md-task · Task 分组" },
  { value: "dir-md", label: "dir-md · 目录遍历" },
  { value: "text", label: "text · 纯文本" },
  { value: "json", label: "json · JSON" },
  { value: "sqlite", label: "sqlite · 数据库" },
];

const DEFAULT_PROJECT_FILES = [
  "CLAUDE.md",
  "AGENTS.md",
  "MEMORY.md",
  ".cursorrules",
  ".windsurfrules",
];

export function SettingsModal({
  onClose,
  onChanged,
}: {
  onClose: () => void;
  onChanged: () => void;
}) {
  const {
    settings,
    ensureAgentConfig,
    addProject,
    removeProject,
    toggleProjectEnabled,
    updateProject,
    pickFolder,
    addCustomAgent,
  } = useSettingsStore();

  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectPath, setNewProjectPath] = useState("");
  // 新建的 custom Agent 自动展开进入编辑态
  const [newlyCreatedAgentId, setNewlyCreatedAgentId] = useState<string | null>(null);

  const handlePickFolder = async () => {
    const folder = await pickFolder();
    if (folder) {
      setNewProjectPath(folder);
      if (!newProjectName) {
        const name = folder.split("/").filter(Boolean).pop() ?? "项目";
        setNewProjectName(name);
      }
    }
  };

  const handleAddProject = () => {
    if (!newProjectName.trim() || !newProjectPath.trim()) return;
    addProject({
      name: newProjectName.trim(),
      root: newProjectPath.trim(),
      files: [...DEFAULT_PROJECT_FILES],
      icon: DEFAULT_PROJECT_APPEARANCE.icon,
      color: DEFAULT_PROJECT_APPEARANCE.color,
      enabled: true,
    });
    setNewProjectName("");
    setNewProjectPath("");
    onChanged();
  };

  const handleAddCustomAgent = () => {
    const agent = addCustomAgent();
    setNewlyCreatedAgentId(agent.id);
    onChanged();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-[720px] flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3 dark:border-neutral-700">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-neutral-500" />
            <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">设置</h2>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Agent 配置 */}
          <section className="mb-6">
            <h3 className="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Agent 配置
            </h3>
            <p className="mb-3 text-xs text-neutral-400">
              修改路径、图标、颜色，或禁用不需要的 Agent
            </p>
            <div className="space-y-1.5">
              {BUILTIN_PROFILES.map((profile) => {
                const config = ensureAgentConfig(profile.id);
                const defaults = DEFAULT_AGENT_APPEARANCE[profile.id] ?? { icon: "bot", color: "neutral" };
                const iconName = config.icon || defaults.icon;
                const colorName = config.color || defaults.color;
                const colorText = resolveColorText(colorName);
                const currentRoot = config.root?.trim() || profile.root;

                return (
                  <AgentConfigRow
                    key={profile.id}
                    profile={profile}
                    config={config}
                    iconName={iconName}
                    colorName={colorName}
                    colorText={colorText}
                    currentRoot={currentRoot}
                    onChanged={onChanged}
                  />
                );
              })}
            </div>
          </section>

          {/* 自定义 Agent */}
          <section className="mb-6">
            <h3 className="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              自定义 Agent
            </h3>
            <p className="mb-3 text-xs text-neutral-400">
              添加任意 Agent，定义其根目录与扫描条目（与内置 Agent 能力对等）
            </p>
            <div className="space-y-1.5">
              {settings.customAgents.map((agent) => (
                <CustomAgentRow
                  key={agent.id}
                  agent={agent}
                  defaultExpanded={agent.id === newlyCreatedAgentId}
                  onChanged={onChanged}
                  onPickFolder={pickFolder}
                />
              ))}
            </div>
            <button
              onClick={handleAddCustomAgent}
              className="mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-neutral-300 px-3 py-2 text-sm text-neutral-500 hover:border-blue-400 hover:text-blue-600 dark:border-neutral-600 dark:hover:border-blue-500 dark:hover:text-blue-400"
            >
              <Plus className="h-4 w-4" />
              添加自定义 Agent
            </button>
          </section>

          {/* 项目记忆 */}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              项目记忆
            </h3>
            <p className="mb-3 text-xs text-neutral-400">
              添加项目文件夹，扫描其中的 CLAUDE.md / AGENTS.md / MEMORY.md 等
            </p>

            {/* 已添加的项目 */}
            <div className="mb-3 space-y-1.5">
              {settings.projects.map((project) => {
                const Icon = resolveIcon(project.icon || DEFAULT_PROJECT_APPEARANCE.icon);
                const colorText = resolveColorText(project.color || DEFAULT_PROJECT_APPEARANCE.color);
                return (
                  <div
                    key={project.name}
                    className={`flex flex-wrap items-center gap-2 rounded-md border border-neutral-200 px-3 py-2 dark:border-neutral-700 ${
                      !project.enabled ? "opacity-50" : ""
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${colorText}`} />
                    <span className="w-24 shrink-0 truncate text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      {project.name}
                    </span>
                    <span className="flex-1 truncate font-mono text-xs text-neutral-400">
                      {project.root}
                    </span>
                    <span className="shrink-0 text-xs text-neutral-400">
                      {project.files.length} 文件
                    </span>
                    <AppearancePicker
                      icon={project.icon || DEFAULT_PROJECT_APPEARANCE.icon}
                      color={project.color || DEFAULT_PROJECT_APPEARANCE.color}
                      onIconChange={(ic) => { updateProject(project.name, { icon: ic }); onChanged(); }}
                      onColorChange={(cl) => { updateProject(project.name, { color: cl }); onChanged(); }}
                    />
                    <button
                      onClick={() => { toggleProjectEnabled(project.name); onChanged(); }}
                      className={`shrink-0 rounded px-2 py-1 text-xs font-medium transition-colors ${
                        project.enabled
                          ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300"
                          : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400"
                      }`}
                    >
                      {project.enabled ? "启用" : "禁用"}
                    </button>
                    <button
                      onClick={() => { removeProject(project.name); onChanged(); }}
                      className="shrink-0 rounded p-1 text-neutral-400 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* 添加新项目 */}
            <div className="rounded-md border border-dashed border-neutral-300 p-3 dark:border-neutral-600">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="项目名称"
                  className="w-32 shrink-0 rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                />
                <input
                  type="text"
                  value={newProjectPath}
                  onChange={(e) => setNewProjectPath(e.target.value)}
                  placeholder="项目路径 (如 ~/git-projects/my-project)"
                  className="flex-1 rounded border border-neutral-300 bg-white px-2 py-1.5 font-mono text-xs focus:border-blue-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                />
                <button
                  onClick={handlePickFolder}
                  className="shrink-0 rounded-md border border-neutral-300 p-1.5 text-neutral-500 hover:bg-neutral-100 dark:border-neutral-600 dark:hover:bg-neutral-800"
                  title="选择文件夹"
                >
                  <FolderPlus className="h-4 w-4" />
                </button>
                <button
                  onClick={handleAddProject}
                  disabled={!newProjectName.trim() || !newProjectPath.trim()}
                  className="flex shrink-0 items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  添加
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* 底部 */}
        <div className="border-t border-neutral-200 px-5 py-3 dark:border-neutral-700">
          <p className="text-xs text-neutral-400">
            设置保存在 ~/.memoryhub/settings.json · 修改后自动重新扫描
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            自定义 Agent 的配置会随设置自动备份；其数据目录暂不纳入备份。
          </p>
        </div>
      </div>
    </div>
  );
}

/** Agent 配置行 (含可展开的条目类型编辑) */
function AgentConfigRow({
  profile,
  config,
  iconName,
  colorName,
  colorText,
  currentRoot,
  onChanged,
}: {
  profile: typeof BUILTIN_PROFILES[0];
  config: ReturnType<ReturnType<typeof useSettingsStore.getState>["ensureAgentConfig"]>;
  iconName: string;
  colorName: string;
  colorText: string;
  currentRoot: string;
  onChanged: () => void;
}) {
  const { updateAgent, toggleAgentEnabled, setItemTypeOverride } = useSettingsStore();
  const [expanded, setExpanded] = useState(false);
  const Icon = resolveIcon(iconName);

  const typeOptions = Object.entries(MEMORY_TYPES);

  return (
    <div
      className={`rounded-md border border-neutral-200 dark:border-neutral-700 ${
        !config.enabled ? "opacity-50" : ""
      }`}
    >
      {/* 主行 */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
          title={expanded ? "收起条目" : "展开条目类型设置"}
        >
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        <Icon className={`h-4 w-4 shrink-0 ${colorText}`} />
        <span className="w-20 shrink-0 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {profile.name}
        </span>
        <input
          type="text"
          value={currentRoot}
          onChange={(e) => updateAgent(profile.id, { root: e.target.value })}
          className="flex-1 rounded border border-neutral-300 bg-white px-2 py-1 font-mono text-xs text-neutral-700 focus:border-blue-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
        />
        <AppearancePicker
          icon={iconName}
          color={colorName}
          onIconChange={(ic) => { updateAgent(profile.id, { icon: ic }); onChanged(); }}
          onColorChange={(cl) => { updateAgent(profile.id, { color: cl }); onChanged(); }}
        />
        <button
          onClick={() => { toggleAgentEnabled(profile.id); onChanged(); }}
          className={`shrink-0 rounded px-2 py-1 text-xs font-medium transition-colors ${
            config.enabled
              ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300"
              : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400"
          }`}
        >
          {config.enabled ? "启用" : "禁用"}
        </button>
      </div>

      {/* 展开的条目类型编辑 */}
      {expanded && (
        <div className="border-t border-neutral-200 px-3 py-2 dark:border-neutral-700">
          <div className="mb-1.5 text-xs text-neutral-400">条目类型设置</div>
          <div className="space-y-1">
            {profile.items.map((item, idx) => {
              const override = config.typeOverrides?.find((o) => o.path === item.path);
              const currentType = override?.type ?? item.type;
              return (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <span className="w-48 shrink-0 truncate font-mono text-neutral-500">
                    {item.path}
                  </span>
                  <select
                    value={currentType}
                    onChange={(e) => {
                      setItemTypeOverride(profile.id, item.path, e.target.value);
                      onChanged();
                    }}
                    className="rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-xs text-neutral-700 focus:border-blue-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                  >
                    {typeOptions.map(([typeKey, typeInfo]) => (
                      <option key={typeKey} value={typeKey}>
                        {typeInfo.label}
                      </option>
                    ))}
                  </select>
                  {override && (
                    <span className="text-xs text-blue-500">已修改</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================================================
// 自定义 Agent —— 完整增删改查编辑器
// ==========================================================================

/** 单个自定义 Agent 的折叠行 + 展开编辑器 */
function CustomAgentRow({
  agent,
  defaultExpanded,
  onChanged,
  onPickFolder,
}: {
  agent: { id: string; name: string; root: string; icon: string; color: string; enabled: boolean; description?: string; items: ProfileItem[] };
  defaultExpanded: boolean;
  onChanged: () => void;
  onPickFolder: () => Promise<string | null>;
}) {
  const { updateCustomAgent, removeCustomAgent, toggleCustomAgentEnabled } = useSettingsStore();
  const [expanded, setExpanded] = useState(defaultExpanded);

  const Icon = resolveIcon(agent.icon);
  const colorText = resolveColorText(agent.color);
  const itemIdx = (i: number) => `${agent.id}#${i}`;

  return (
    <div
      className={`rounded-md border border-neutral-200 dark:border-neutral-700 ${
        !agent.enabled ? "opacity-50" : ""
      }`}
    >
      {/* 主行 (折叠态) */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
          title={expanded ? "收起编辑" : "展开编辑"}
        >
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        <Icon className={`h-4 w-4 shrink-0 ${colorText}`} />
        <span className="w-20 shrink-0 truncate text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {agent.name || "未命名"}
        </span>
        <span className="flex-1 truncate font-mono text-xs text-neutral-400">
          {agent.root || "（未设置根目录）"}
        </span>
        <span className="shrink-0 text-xs text-neutral-400">{agent.items.length} 条目</span>
        <AppearancePicker
          icon={agent.icon}
          color={agent.color}
          onIconChange={(ic) => { updateCustomAgent(agent.id, { icon: ic }); onChanged(); }}
          onColorChange={(cl) => { updateCustomAgent(agent.id, { color: cl }); onChanged(); }}
        />
        <button
          onClick={() => { toggleCustomAgentEnabled(agent.id); onChanged(); }}
          className={`shrink-0 rounded px-2 py-1 text-xs font-medium transition-colors ${
            agent.enabled
              ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300"
              : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400"
          }`}
        >
          {agent.enabled ? "启用" : "禁用"}
        </button>
        <button
          onClick={() => setExpanded(true)}
          className="shrink-0 rounded p-1 text-neutral-400 hover:bg-blue-100 hover:text-blue-500 dark:hover:bg-blue-900/30"
          title="编辑"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => { removeCustomAgent(agent.id); onChanged(); }}
          className="shrink-0 rounded p-1 text-neutral-400 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30"
          title="删除"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* 展开的编辑器 */}
      {expanded && (
        <div className="space-y-3 border-t border-neutral-200 px-3 py-3 dark:border-neutral-700">
          {/* 基本信息 */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="w-12 shrink-0 text-xs text-neutral-400">名称</label>
            <input
              type="text"
              value={agent.name}
              onChange={(e) => { updateCustomAgent(agent.id, { name: e.target.value }); onChanged(); }}
              placeholder="Agent 名称"
              className="w-40 shrink-0 rounded border border-neutral-300 bg-white px-2 py-1 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
            />
            <label className="w-12 shrink-0 text-xs text-neutral-400">根目录</label>
            <input
              type="text"
              value={agent.root}
              onChange={(e) => { updateCustomAgent(agent.id, { root: e.target.value }); onChanged(); }}
              placeholder="~/.my-agent"
              className="flex-1 rounded border border-neutral-300 bg-white px-2 py-1 font-mono text-xs focus:border-blue-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
            />
            <button
              onClick={async () => {
                const folder = await onPickFolder();
                if (folder) { updateCustomAgent(agent.id, { root: folder }); onChanged(); }
              }}
              className="shrink-0 rounded-md border border-neutral-300 p-1.5 text-neutral-500 hover:bg-neutral-100 dark:border-neutral-600 dark:hover:bg-neutral-800"
              title="选择文件夹"
            >
              <FolderPlus className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="w-12 shrink-0 text-xs text-neutral-400">描述</label>
            <input
              type="text"
              value={agent.description ?? ""}
              onChange={(e) => { updateCustomAgent(agent.id, { description: e.target.value }); onChanged(); }}
              placeholder="（可选）简短描述"
              className="flex-1 rounded border border-neutral-300 bg-white px-2 py-1 text-xs focus:border-blue-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
            />
          </div>

          {/* 扫描条目编辑器 */}
          <div>
            <div className="mb-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
              扫描条目
            </div>
            <div className="space-y-1.5">
              {agent.items.map((item, idx) => (
                <CustomAgentItemEditor
                  key={itemIdx(idx)}
                  item={item}
                  typeOptions={Object.entries(MEMORY_TYPES)}
                  onChange={(newItem) => {
                    const items = agent.items.map((it, i) => (i === idx ? newItem : it));
                    updateCustomAgent(agent.id, { items });
                    onChanged();
                  }}
                  onRemove={() => {
                    const items = agent.items.filter((_, i) => i !== idx);
                    updateCustomAgent(agent.id, { items });
                    onChanged();
                  }}
                />
              ))}
              <button
                onClick={() => {
                  const items: ProfileItem[] = [
                    ...agent.items,
                    { type: "memory", path: "", format: "md-full", editable: true },
                  ];
                  updateCustomAgent(agent.id, { items });
                  onChanged();
                }}
                className="flex items-center gap-1 rounded border border-dashed border-neutral-300 px-2 py-1 text-xs text-neutral-500 hover:border-blue-400 hover:text-blue-600 dark:border-neutral-600 dark:hover:border-blue-500 dark:hover:text-blue-400"
              >
                <Plus className="h-3 w-3" />
                添加条目
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** 单个扫描条目的编辑器 (类型/路径/格式/可编辑/formatOptions) */
function CustomAgentItemEditor({
  item,
  typeOptions,
  onChange,
  onRemove,
}: {
  item: ProfileItem;
  typeOptions: [string, { label: string }][];
  onChange: (item: ProfileItem) => void;
  onRemove: () => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 当前 formatOptions 的字符串视图
  const opts = (item.formatOptions ?? {}) as Record<string, unknown>;
  const delimiter = typeof opts.delimiter === "string" ? opts.delimiter : "";
  const glob = typeof opts.glob === "string" ? opts.glob : "";
  const excludeStr = Array.isArray(opts.exclude) ? (opts.exclude as string[]).join(", ") : "";
  const advancedJson = (() => {
    // 仅在非 md-section/dir-md 的常见字段被占用时展示完整 JSON
    if (Object.keys(opts).length === 0) return "";
    return JSON.stringify(opts, null, 2);
  })();

  return (
    <div className="rounded border border-neutral-200 px-2 py-2 dark:border-neutral-700">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={item.type}
          onChange={(e) => onChange({ ...item, type: e.target.value as ProfileItem["type"] })}
          className="shrink-0 rounded border border-neutral-300 bg-white px-1.5 py-1 text-xs text-neutral-700 focus:border-blue-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
        >
          {typeOptions.map(([typeKey, typeInfo]) => (
            <option key={typeKey} value={typeKey}>{typeInfo.label}</option>
          ))}
        </select>
        <input
          type="text"
          value={item.path}
          onChange={(e) => onChange({ ...item, path: e.target.value })}
          placeholder="相对路径 (如 MEMORY.md 或 skills/)"
          className="flex-1 rounded border border-neutral-300 bg-white px-2 py-1 font-mono text-xs text-neutral-700 focus:border-blue-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
        />
        <select
          value={item.format}
          onChange={(e) => onChange({ ...item, format: e.target.value as SourceFormat })}
          className="shrink-0 rounded border border-neutral-300 bg-white px-1.5 py-1 text-xs text-neutral-700 focus:border-blue-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
        >
          {FORMAT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <label className="flex shrink-0 items-center gap-1 text-xs text-neutral-500" title="勾选后该条目的内容可在详情面板编辑写回">
          <input
            type="checkbox"
            checked={item.editable ?? false}
            onChange={(e) => onChange({ ...item, editable: e.target.checked })}
            className="h-3.5 w-3.5"
          />
          可编辑
        </label>
        <button
          onClick={onRemove}
          className="shrink-0 rounded p-1 text-neutral-400 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30"
          title="删除条目"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* 格式专属参数 */}
      {item.format === "md-section" && (
        <div className="mt-1.5 flex items-center gap-2 pl-1">
          <span className="text-xs text-neutral-400">分隔符</span>
          <input
            type="text"
            value={delimiter}
            onChange={(e) => onChange({ ...item, formatOptions: { ...opts, delimiter: e.target.value } })}
            placeholder="§"
            className="w-20 rounded border border-neutral-300 bg-white px-2 py-0.5 font-mono text-xs focus:border-blue-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
          />
        </div>
      )}
      {item.format === "dir-md" && (
        <div className="mt-1.5 flex flex-wrap items-center gap-2 pl-1">
          <span className="text-xs text-neutral-400">glob</span>
          <input
            type="text"
            value={glob}
            onChange={(e) => {
              const next = { ...opts };
              if (e.target.value) next.glob = e.target.value; else delete next.glob;
              onChange({ ...item, formatOptions: next });
            }}
            placeholder="**/*.md"
            className="w-32 rounded border border-neutral-300 bg-white px-2 py-0.5 font-mono text-xs focus:border-blue-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
          />
          <span className="text-xs text-neutral-400">排除 (逗号分隔)</span>
          <input
            type="text"
            value={excludeStr}
            onChange={(e) => {
              const arr = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
              const next = { ...opts };
              if (arr.length) next.exclude = arr; else delete next.exclude;
              onChange({ ...item, formatOptions: next });
            }}
            placeholder=".git, cache"
            className="flex-1 rounded border border-neutral-300 bg-white px-2 py-0.5 font-mono text-xs focus:border-blue-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
          />
        </div>
      )}

      {/* 高级选项 (JSON) —— 覆盖 sqlite / md-task 等复杂格式 */}
      {(item.format === "sqlite" ||
        item.format === "md-task" ||
        item.format === "json" ||
        Object.keys(opts).length > 0 && item.format !== "md-section" && item.format !== "dir-md") && (
        <div className="mt-1.5 pl-1">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-blue-500 hover:underline"
          >
            {showAdvanced ? "▼ 收起高级选项 (JSON)" : "▶ 高级选项 (JSON)"}
          </button>
          {showAdvanced && (
            <textarea
              value={advancedJson}
              onChange={(e) => {
                const text = e.target.value;
                if (!text.trim()) {
                  onChange({ ...item, formatOptions: undefined });
                  return;
                }
                try {
                  const parsed = JSON.parse(text);
                  onChange({ ...item, formatOptions: parsed });
                } catch {
                  // JSON 解析失败时忽略,等待用户输入合法 JSON
                }
              }}
              placeholder={'{\n  "table": "memories",\n  "keyColumn": "key",\n  "valueColumn": "value"\n}'}
              rows={4}
              className="mt-1 w-full rounded border border-neutral-300 bg-white px-2 py-1 font-mono text-xs text-neutral-700 focus:border-blue-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
            />
          )}
        </div>
      )}
    </div>
  );
}
