/**
 * 左侧栏 —— Agent 导航 + 项目导航 + 搜索 + 类型筛选
 * 支持分组折叠、用户自定义图标颜色
 */

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Layers,
  Search,
  X,
} from "lucide-react";
import { useMemoryStore } from "../store/memory-store";
import { useSettingsStore } from "../store/settings-store";
import { MEMORY_TYPES, SIDEBAR_TYPE_ORDER } from "../constants/memory-types";
import { TYPE_ICONS } from "../constants/icons";
import { resolveAgentAppearance, resolveProjectAppearance } from "../constants/appearance";

export function Sidebar() {
  const statsByAgent = useMemoryStore((s) => s.statsByAgent);
  const items = useMemoryStore((s) => s.items);
  const searchQuery = useMemoryStore((s) => s.searchQuery);
  const selectedAgentId = useMemoryStore((s) => s.selectedAgentId);
  const selectedTypeId = useMemoryStore((s) => s.selectedTypeId);
  const setSearch = useMemoryStore((s) => s.setSearch);
  const selectAgent = useMemoryStore((s) => s.selectAgent);
  const selectType = useMemoryStore((s) => s.selectType);
  const agents = useSettingsStore((s) => s.settings.agents);
  const projects = useSettingsStore((s) => s.settings.projects);
  const customAgents = useSettingsStore((s) => s.settings.customAgents);

  const [agentCollapsed, setAgentCollapsed] = useState(false);
  const [typeCollapsed, setTypeCollapsed] = useState(false);
  const [projectCollapsed, setProjectCollapsed] = useState(false);

  const totalCount = items.length;
  const typeCounts: Record<string, number> = {};
  for (const item of items) {
    const t = item.source.itemType;
    typeCounts[t] = (typeCounts[t] ?? 0) + 1;
  }

  // 项目统计
  const projectStats: Record<string, number> = {};
  for (const item of items) {
    if (item.source.agentId.startsWith("project:")) {
      const name = item.source.project ?? item.source.agentName;
      projectStats[name] = (projectStats[name] ?? 0) + 1;
    }
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-neutral-50 dark:bg-neutral-900">
      {/* 搜索框 */}
      <div className="p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索全部记忆..."
            className="w-full rounded-md border border-neutral-300 bg-white py-1.5 pl-8 pr-7 text-sm placeholder-neutral-400 focus:border-blue-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
          />
          {searchQuery && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 可滚动区域 */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {/* 全部 */}
        <button
          onClick={() => selectAgent(null)}
          className={`mb-1 flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
            selectedAgentId === null && selectedTypeId === null
              ? "bg-blue-100 font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
              : "text-neutral-700 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800"
          }`}
        >
          <span className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            <span>全部</span>
          </span>
          <span className="text-xs text-neutral-400">{totalCount}</span>
        </button>

        {/* Agent 列表 */}
        <div className="mb-2 mt-2">
          <button
            onClick={() => setAgentCollapsed(!agentCollapsed)}
            className="flex w-full items-center gap-1 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            {agentCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Agent
          </button>
          {!agentCollapsed && (
            <div className="mt-0.5">
              {statsByAgent
                .filter((stat) => !stat.agentId.startsWith("project:"))
                .map((stat) => {
                  const isActive = selectedAgentId === stat.agentId;
                  const hasItems = stat.itemCount > 0;
                  // 自定义 Agent 的名字不在 BUILTIN_PROFILES 里,直接用扫描结果携带的 agentName
                  const appearance = resolveAgentAppearance(stat.agentId, agents, customAgents);
                  const { icon: Icon, colorText } = appearance;

                  return (
                    <button
                      key={stat.agentId}
                      onClick={() => selectAgent(isActive ? null : stat.agentId)}
                      disabled={!stat.rootExists}
                      className={`mb-0.5 flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors disabled:opacity-40 ${
                        isActive
                          ? "bg-blue-100 font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                          : "text-neutral-700 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800"
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Icon className={`h-4 w-4 shrink-0 ${colorText}`} />
                        <span className="truncate">{stat.agentName}</span>
                      </span>
                      {hasItems && <span className="text-xs text-neutral-400">{stat.itemCount}</span>}
                    </button>
                  );
                })}
            </div>
          )}
        </div>

        {/* 项目列表 */}
        {Object.keys(projectStats).length > 0 && (
          <div className="mb-2 mt-2">
            <button
              onClick={() => setProjectCollapsed(!projectCollapsed)}
              className="flex w-full items-center gap-1 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              {projectCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              项目
            </button>
            {!projectCollapsed && (
              <div className="mt-0.5">
                {Object.entries(projectStats).map(([name, count]) => {
                  const agentId = `project:${name}`;
                  const isActive = selectedAgentId === agentId;
                  const appearance = resolveProjectAppearance(name, projects);
                  const { icon: Icon, colorText } = appearance;

                  return (
                    <button
                      key={name}
                      onClick={() => selectAgent(isActive ? null : agentId)}
                      className={`mb-0.5 flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                        isActive
                          ? "bg-blue-100 font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                          : "text-neutral-700 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800"
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Icon className={`h-4 w-4 shrink-0 ${colorText}`} />
                        <span className="truncate">{name}</span>
                      </span>
                      <span className="text-xs text-neutral-400">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 类型筛选 */}
        <div>
          <button
            onClick={() => setTypeCollapsed(!typeCollapsed)}
            className="flex w-full items-center gap-1 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            {typeCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            类型
          </button>
          {!typeCollapsed && (
            <div className="mt-0.5">
              {SIDEBAR_TYPE_ORDER.filter((t) => typeCounts[t]).map((t) => {
                const info = MEMORY_TYPES[t];
                const isActive = selectedTypeId === t;
                const Icon = TYPE_ICONS[t] ?? TYPE_ICONS.unknown;
                return (
                  <button
                    key={t}
                    onClick={() => selectType(isActive ? null : t)}
                    className={`mb-0.5 flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                      isActive
                        ? "bg-purple-100 font-medium text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                        : "text-neutral-700 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{info.label}</span>
                    </span>
                    <span className="text-xs text-neutral-400">{typeCounts[t]}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
