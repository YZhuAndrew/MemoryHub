/**
 * 中间栏 —— 记忆条目列表
 * 包含当前筛选条件可视化
 */

import { useMemo, useState } from "react";
import { ArrowDownAZ, Clock, Filter, Inbox, Search } from "lucide-react";
import { useMemoryStore } from "../store/memory-store";
import { BUILTIN_PROFILES } from "../core/profiles/builtin-profiles";
import { MEMORY_TYPES } from "../constants/memory-types";
import { TYPE_ICONS } from "../constants/icons";
import { resolveAgentAppearance, resolveProjectAppearance } from "../constants/appearance";
import { useSettingsStore } from "../store/settings-store";
import type { MemoryType } from "../types";

function formatTime(ms: number): string {
  if (!ms) return "—";
  const now = Date.now();
  const diff = now - ms;
  if (diff < 60_000) return "刚刚";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}小时前`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}天前`;
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function SkeletonList() {
  return (
    <div className="flex-1 overflow-y-auto">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="animate-pulse border-b border-neutral-100 px-4 py-3 dark:border-neutral-800"
        >
          <div className="mb-2 flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-neutral-200 dark:bg-neutral-700" />
            <div className="h-4 w-2/3 rounded bg-neutral-200 dark:bg-neutral-700" />
            <div className="ml-auto h-5 w-12 rounded bg-neutral-200 dark:bg-neutral-700" />
          </div>
          <div className="mb-2 h-3 w-full rounded bg-neutral-100 dark:bg-neutral-800" />
          <div className="h-3 w-1/3 rounded bg-neutral-100 dark:bg-neutral-800" />
        </div>
      ))}
    </div>
  );
}

export function MemoryList() {
  const items = useMemoryStore((s) => s.items);
  const loading = useMemoryStore((s) => s.loading);
  const searchQuery = useMemoryStore((s) => s.searchQuery);
  const selectedAgentId = useMemoryStore((s) => s.selectedAgentId);
  const selectedTypeId = useMemoryStore((s) => s.selectedTypeId);
  const selectedItemId = useMemoryStore((s) => s.selectedItemId);
  const selectItem = useMemoryStore((s) => s.selectItem);
  const selectAgent = useMemoryStore((s) => s.selectAgent);
  const selectType = useMemoryStore((s) => s.selectType);
  const setSearch = useMemoryStore((s) => s.setSearch);
  const agents = useSettingsStore((s) => s.settings.agents);
  const projects = useSettingsStore((s) => s.settings.projects);
  const itemTypes = useSettingsStore((s) => s.settings.itemTypes);
  const [sortBy, setSortBy] = useState<"time" | "type" | "title">("time");

  const filtered = useMemo(() => {
    const getEffectiveType = (i: typeof items[0]) =>
      (itemTypes?.[i.id] ?? i.source.itemType) as MemoryType;

    let result = items;
    if (selectedAgentId) {
      result = result.filter((i) => i.source.agentId === selectedAgentId);
    }
    if (selectedTypeId) {
      result = result.filter((i) => getEffectiveType(i) === selectedTypeId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.content.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    const sorted = [...result];
    if (sortBy === "time") {
      sorted.sort((a, b) => b.updatedAt - a.updatedAt);
    } else if (sortBy === "type") {
      sorted.sort((a, b) => {
        const tc = getEffectiveType(a).localeCompare(getEffectiveType(b));
        return tc !== 0 ? tc : b.updatedAt - a.updatedAt;
      });
    } else if (sortBy === "title") {
      sorted.sort((a, b) => a.title.localeCompare(b.title, "zh"));
    }
    return sorted;
  }, [items, searchQuery, selectedAgentId, selectedTypeId, sortBy, itemTypes]);

  const isEmpty = filtered.length === 0;
  const hasFilters = !!(searchQuery.trim() || selectedAgentId || selectedTypeId);
  const customAgents = useSettingsStore((s) => s.settings.customAgents);
  const selectedAgentProfile = useMemo(() => {
    if (!selectedAgentId) return null;
    // 内置 Agent
    const builtin = BUILTIN_PROFILES.find((p) => p.id === selectedAgentId);
    if (builtin) return { name: builtin.name };
    // 自定义 Agent
    const custom = customAgents.find((c) => c.id === selectedAgentId);
    if (custom) return { name: custom.name };
    // 项目级 Agent (id 形如 "project:<name>")
    if (selectedAgentId.startsWith("project:")) {
      return { name: selectedAgentId.slice("project:".length) };
    }
    return null;
  }, [selectedAgentId, customAgents]);
  const selectedTypeInfo = selectedTypeId ? MEMORY_TYPES[selectedTypeId as MemoryType] : null;

  // 按类型统计当前列表条数 (使用覆盖后的类型)
  const typeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of filtered) {
      const t = (itemTypes?.[item.id] ?? item.source.itemType) as MemoryType;
      counts[t] = (counts[t] ?? 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [filtered, itemTypes]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white dark:bg-neutral-950">
      {/* 列表头部 + 筛选条件 */}
      <div className="border-b border-neutral-200 px-4 py-2.5 dark:border-neutral-700">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
            {loading ? "扫描中..." : `${filtered.length} 条结果`}
          </span>
          {/* 排序按钮 */}
          <div className="flex items-center gap-0.5">
            {([
              { key: "time", label: "时间", icon: Clock },
              { key: "type", label: "类型", icon: Filter },
              { key: "title", label: "标题", icon: ArrowDownAZ },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-colors ${
                  sortBy === key
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                    : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                }`}
                title={`按${label}排序`}
              >
                <Icon className="h-3 w-3" />
              </button>
            ))}
          </div>
        </div>
        {/* 类型条数统计 (可点击筛选) */}
        {typeBreakdown.length > 0 && !loading && (
          <div className="mb-1 flex flex-wrap items-center gap-1 text-xs text-neutral-400">
            {typeBreakdown.map(([type, count]) => {
              const info = MEMORY_TYPES[type as MemoryType] ?? MEMORY_TYPES.unknown;
              const isActive = selectedTypeId === type;
              return (
                <button
                  key={type}
                  onClick={() => selectType(isActive ? null : type)}
                  className={`flex items-center gap-0.5 rounded px-1 py-0.5 transition-all hover:scale-105 ${
                    isActive ? "ring-1 ring-blue-400 " + info.badgeClass : ""
                  }`}
                  title={isActive ? `取消${info.label}筛选` : `只看${info.label}`}
                >
                  <span className={`rounded px-1 ${isActive ? "bg-white/30 dark:bg-black/30" : info.badgeClass}`}>{count}</span>
                  <span className={isActive ? "font-medium" : ""}>{info.label}</span>
                </button>
              );
            })}
          </div>
        )}
        {/* 筛选条件标签 */}
        {hasFilters && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Filter className="h-3 w-3 text-neutral-400" />
            {selectedAgentProfile && (
              <button
                onClick={() => selectAgent(null)}
                className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60"
              >
                {selectedAgentProfile.name}
                <span className="opacity-60">✕</span>
              </button>
            )}
            {selectedTypeInfo && (
              <button
                onClick={() => selectType(null)}
                className="flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:hover:bg-purple-900/60"
              >
                {selectedTypeInfo.label}
                <span className="opacity-60">✕</span>
              </button>
            )}
            {searchQuery.trim() && (
              <button
                onClick={() => setSearch("")}
                className="flex items-center gap-1 rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600"
              >
                搜索: {searchQuery}
                <span className="opacity-60">✕</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 列表内容 */}
      {loading && items.length === 0 ? (
        <SkeletonList />
      ) : isEmpty ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <div className="mb-2 text-neutral-300 dark:text-neutral-600">
            {hasFilters ? <Search className="h-10 w-10" /> : <Inbox className="h-10 w-10" />}
          </div>
          <p className="text-sm text-neutral-400">
            {hasFilters
              ? "没有匹配的记忆条目"
              : items.length === 0
                ? "暂无数据，请确认 Agent 目录存在"
                : "暂无记忆"}
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {filtered.map((item) => {
            const isSelected = item.id === selectedItemId;
            // 有效类型 = 用户自定义覆盖 > 原始扫描类型
            const effectiveType = (itemTypes?.[item.id] ?? item.source.itemType) as MemoryType;
            const typeInfo = MEMORY_TYPES[effectiveType] ?? MEMORY_TYPES.unknown;
            const TypeIcon = TYPE_ICONS[effectiveType] ?? TYPE_ICONS.unknown;
            const isProject = item.source.agentId.startsWith("project:");
            const displayName = isProject
              ? (item.source.project ?? item.source.agentName)
              : item.source.agentName;
            // 解析外观 (用户设置 > 默认)
            const appearance = isProject
              ? resolveProjectAppearance(displayName, projects)
              : resolveAgentAppearance(item.source.agentId, agents);
            const { colorText } = appearance;
            const preview = item.content
              .replace(/[#*`>]/g, "")
              .replace(/\n+/g, " ")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 100);

            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => selectItem(item.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    selectItem(item.id);
                  }
                }}
                className={`block w-full cursor-pointer border-b border-neutral-100 border-l-2 px-4 py-3 text-left transition-colors dark:border-neutral-800 ${
                  isSelected
                    ? "border-l-blue-500 bg-blue-50 dark:bg-blue-950/40"
                    : "border-l-transparent hover:bg-neutral-50 dark:hover:bg-neutral-900"
                }`}
              >
                {/* 标题行 */}
                <div className="mb-1 flex items-center gap-2">
                  <span className={`flex-1 truncate text-sm font-medium ${isSelected ? "text-blue-700 dark:text-blue-300" : "text-neutral-800 dark:text-neutral-100"}`}>
                    {item.title}
                  </span>
                  <span className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-xs ${typeInfo.badgeClass}`}>
                    <TypeIcon className="h-3 w-3" />
                    {typeInfo.label}
                  </span>
                </div>

                {/* 预览 */}
                <p className="mb-1 line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">
                  {preview}
                </p>

                {/* 底部信息: 彩色名称 + 文件名 + 时间 */}
                <div className="flex items-center gap-2 text-xs">
                  <span className={`font-medium ${colorText}`}>{displayName}</span>
                  <span className="text-neutral-300 dark:text-neutral-600">·</span>
                  <span className="font-mono text-neutral-400">
                    {item.source.filePath.split("/").pop() ?? item.source.filePath}
                  </span>
                  <span className="text-neutral-300 dark:text-neutral-600">·</span>
                  <span className="text-neutral-400">{formatTime(item.updatedAt)}</span>
                  {item.tags.length > 0 && (
                    <>
                      <span className="text-neutral-300 dark:text-neutral-600">·</span>
                      <span className="truncate text-neutral-400">{item.tags.slice(0, 3).join(", ")}</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
