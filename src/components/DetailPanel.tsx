/**
 * 右侧栏 —— 记忆详情查看 + 编辑
 * 包含 Markdown 渲染、编辑器快捷键、外部操作按钮
 */

import { useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** 从 Markdown 内容中分离 frontmatter 和正文 */
function splitFrontmatter(content: string): { frontmatter: string | null; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (match) {
    return { frontmatter: match[1], body: content.slice(match[0].length) };
  }
  return { frontmatter: null, body: content };
}
import {
  Check,
  Copy,
  ExternalLink,
  FolderOpen,
  Pencil,
  X,
} from "lucide-react";
import { useMemoryStore } from "../store/memory-store";
import { useSettingsStore } from "../store/settings-store";
import { writeMemoryItem } from "../core/editor";
import { MEMORY_TYPES } from "../constants/memory-types";
import { TYPE_ICONS } from "../constants/icons";
import { resolveAgentAppearance, resolveProjectAppearance } from "../constants/appearance";
import type { MemoryType } from "../types";
import {
  EDITOR_APPS,
  openWithApp,
  revealInFinder,
  copyToClipboard,
} from "../core/actions";

export function DetailPanel() {
  const selectedItemId = useMemoryStore((s) => s.selectedItemId);
  const items = useMemoryStore((s) => s.items);
  const selectItem = useMemoryStore((s) => s.selectItem);
  const runScan = useMemoryStore((s) => s.runScan);
  const agents = useSettingsStore((s) => s.settings.agents);
  const projects = useSettingsStore((s) => s.settings.projects);
  const itemTypes = useSettingsStore((s) => s.settings.itemTypes);
  const setItemCustomType = useSettingsStore((s) => s.setItemCustomType);

  const item = useMemo(
    () => items.find((i) => i.id === selectedItemId) ?? null,
    [items, selectedItemId],
  );

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showEditorMenu, setShowEditorMenu] = useState(false);

  const isDirty = isEditing && editContent !== (item?.content ?? "");

  useEffect(() => {
    setIsEditing(false);
    setSaveError(null);
    setEditContent(item?.content ?? "");
    setShowEditorMenu(false);
  }, [item?.id]);

  const handleClose = () => {
    if (isDirty && !confirm("有未保存的修改，确定关闭？")) return;
    selectItem(null);
  };

  const handleSave = async () => {
    if (!item) return;
    setSaving(true);
    setSaveError(null);
    try {
      await writeMemoryItem(item, editContent);
      setIsEditing(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
      await runScan();
      selectItem(item.id);
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (isDirty && !confirm("放弃未保存的修改？")) return;
    setEditContent(item?.content ?? "");
    setIsEditing(false);
    setSaveError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleCopyPath = async () => {
    if (!item) return;
    await copyToClipboard(item.source.filePath);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!item) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-neutral-50 text-neutral-400 dark:bg-neutral-900">
        <FolderOpen className="mb-3 h-12 w-12 opacity-40" />
        <p className="text-sm">选择一条记忆查看详情</p>
      </div>
    );
  }

  const isEditable = item.format !== "sqlite";
  // 有效类型 = 用户自定义覆盖 > 原始扫描类型
  const effectiveType = (itemTypes?.[item.id] ?? item.source.itemType) as MemoryType;
  const typeInfo = MEMORY_TYPES[effectiveType] ?? MEMORY_TYPES.unknown;
  const TypeIcon = TYPE_ICONS[effectiveType] ?? TYPE_ICONS.unknown;
  const isProject = item.source.agentId.startsWith("project:");
  const displayName = isProject
    ? (item.source.project ?? item.source.agentName)
    : item.source.agentName;
  const appearance = isProject
    ? resolveProjectAppearance(displayName, projects)
    : resolveAgentAppearance(item.source.agentId, agents);
  const { icon: SourceIcon, colorText } = appearance;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-neutral-50 dark:bg-neutral-900">
      {/* 头部 */}
      <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h2 className="flex-1 text-base font-semibold text-neutral-800 dark:text-neutral-100">
            {item.title}
          </h2>
          <button
            onClick={handleClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 来源信息 */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span className="flex items-center gap-1">
            <SourceIcon className={`h-3.5 w-3.5 ${colorText}`} />
            <span className={`font-medium ${colorText}`}>{displayName}</span>
          </span>
          <span className="text-neutral-300 dark:text-neutral-600">·</span>
          {/* 可修改的类型下拉 */}
          <div className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-xs ${typeInfo.badgeClass}`}>
            <TypeIcon className="h-3 w-3 shrink-0" />
            <select
              value={effectiveType}
              onChange={(e) => {
                setItemCustomType(item.id, e.target.value);
              }}
              className={`cursor-pointer appearance-none bg-transparent text-xs outline-none ${typeInfo.badgeClass}`}
              title="修改类型"
            >
              {Object.entries(MEMORY_TYPES).map(([key, info]) => (
                <option key={key} value={key} className="bg-white text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  {info.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 文件路径 + 操作按钮 */}
        <div className="mt-2 flex items-center gap-1">
          <span className="flex-1 truncate font-mono text-xs text-neutral-400">
            {item.source.filePath}
          </span>
          <div className="flex items-center gap-0.5">
            {/* 复制路径 */}
            <button
              onClick={handleCopyPath}
              className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
              title="复制路径"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            {/* 在访达中显示 */}
            <button
              onClick={() => revealInFinder(item.source.filePath)}
              className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
              title="在访达中显示"
            >
              <FolderOpen className="h-3.5 w-3.5" />
            </button>
            {/* 用其他编辑器打开 */}
            <div className="relative">
              <button
                onClick={() => setShowEditorMenu(!showEditorMenu)}
                className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
                title="用其他应用打开"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
              {showEditorMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowEditorMenu(false)} />
                  <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-md border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-600 dark:bg-neutral-800">
                    {EDITOR_APPS.map((app) => (
                      <button
                        key={app.id}
                        onClick={() => {
                          openWithApp(item.source.filePath, app.id);
                          setShowEditorMenu(false);
                        }}
                        className="block w-full px-3 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
                      >
                        {app.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 标签 */}
        {item.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.tags.map((tag, i) => (
              <span
                key={i}
                className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-hidden p-4">
        {isEditing ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-full w-full resize-none rounded-md border border-neutral-300 bg-white p-3 font-mono text-sm leading-relaxed text-neutral-800 focus:border-blue-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
            placeholder="编辑内容... (⌘S 保存, Esc 取消)"
            autoFocus
          />
        ) : (
          <div className="h-full overflow-y-auto">
            {(() => {
              const { frontmatter, body } = splitFrontmatter(item.content || "");
              return (
                <>
                  {frontmatter && (
                    <pre className="mb-4 rounded-md border border-neutral-200 bg-neutral-50 p-3 font-mono text-xs leading-relaxed text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-400">
                      {`---\n${frontmatter}\n---`}
                    </pre>
                  )}
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {body || "(空内容)"}
                    </ReactMarkdown>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {saveError && (
        <div className="mx-4 mb-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/30 dark:text-red-400">
          保存失败: {saveError}
        </div>
      )}

      {/* 底部操作栏 */}
      <div className="border-t border-neutral-200 px-4 py-2.5 dark:border-neutral-700">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存 (⌘S)"}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              取消 (Esc)
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400">
              {savedFlash ? (
                <span className="flex items-center gap-1 text-green-500">
                  <Check className="h-3 w-3" /> 已保存
                </span>
              ) : (
                `${item.contentLength} 字符`
              )}
            </span>
            {isEditable ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <Pencil className="h-3.5 w-3.5" />
                编辑
              </button>
            ) : (
              <span className="text-xs text-neutral-400">只读 (SQLite)</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
