/**
 * 备份管理弹窗
 *
 * 创建备份、列出备份、恢复、删除、导出
 */

import { useState, useEffect, useCallback } from "react";
import {
  Archive,
  ArchiveRestore,
  Check,
  Download,
  HardDriveDownload,
  Loader2,
  Package,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import {
  type BackupInfo,
  createBackup,
  listBackups,
  restoreBackup,
  deleteBackup,
  formatSize,
} from "../core/backup";
import { useSettingsStore } from "../store/settings-store";

function formatTime(ms: number): string {
  if (!ms) return "—";
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BackupModal({
  onClose,
  onRestored,
}: {
  onClose: () => void;
  onRestored: () => void;
}) {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "ok" | "err" } | null>(null);
  const pickFolder = useSettingsStore((s) => s.pickFolder);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listBackups();
      setBackups(list);
    } catch (e) {
      setMessage({ text: `加载失败: ${(e as Error).message}`, type: "err" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const showMessage = (text: string, type: "ok" | "err" = "ok") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleCreate = async () => {
    setBusy("create");
    try {
      const path = await createBackup();
      showMessage(`备份已创建: ${path.split("/").pop()}`);
      await refresh();
    } catch (e) {
      showMessage(`备份失败: ${(e as Error).message}`, "err");
    } finally {
      setBusy(null);
    }
  };

  const handleExport = async () => {
    const folder = await pickFolder();
    if (!folder) return;
    setBusy("export");
    try {
      const path = await createBackup(folder);
      showMessage(`已导出到: ${path}`);
    } catch (e) {
      showMessage(`导出失败: ${(e as Error).message}`, "err");
    } finally {
      setBusy(null);
    }
  };

  const handleRestore = async (backup: BackupInfo) => {
    if (!confirm(`确定从 ${backup.name} 恢复吗？\n\n这将覆盖现有的设置和记忆文件，不可撤销。`)) {
      return;
    }
    setBusy(`restore:${backup.path}`);
    try {
      await restoreBackup(backup.path);
      showMessage("恢复成功！正在重新加载...");
      setTimeout(() => onRestored(), 1000);
    } catch (e) {
      showMessage(`恢复失败: ${(e as Error).message}`, "err");
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (backup: BackupInfo) => {
    if (!confirm(`确定删除 ${backup.name} 吗？`)) return;
    setBusy(`delete:${backup.path}`);
    try {
      await deleteBackup(backup.path);
      showMessage("已删除");
      await refresh();
    } catch (e) {
      showMessage(`删除失败: ${(e as Error).message}`, "err");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-[600px] flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3 dark:border-neutral-700">
          <div className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-neutral-500" />
            <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">备份管理</h2>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2 border-b border-neutral-200 px-5 py-3 dark:border-neutral-700">
          <button
            onClick={handleCreate}
            disabled={!!busy}
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {busy === "create" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Package className="h-3.5 w-3.5" />}
            创建备份
          </button>
          <button
            onClick={handleExport}
            disabled={!!busy}
            className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {busy === "export" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            导出到...
          </button>
          <span className="ml-auto text-xs text-neutral-400">
            备份存储在 ~/.memoryhub/backups/
          </span>
        </div>

        {/* 消息提示 */}
        {message && (
          <div
            className={`px-5 py-2 text-sm ${
              message.type === "ok"
                ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"
            }`}
          >
            {message.type === "ok" && <Check className="mr-1 inline h-3.5 w-3.5" />}
            {message.text}
          </div>
        )}

        {/* 备份列表 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-neutral-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              加载中...
            </div>
          ) : backups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-neutral-400">
              <HardDriveDownload className="mb-2 h-10 w-10 opacity-50" />
              <p className="text-sm">暂无备份，点击"创建备份"开始</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {backups.map((backup) => (
                <div
                  key={backup.path}
                  className="flex items-center gap-3 rounded-md border border-neutral-200 px-3 py-2 dark:border-neutral-700"
                >
                  <Archive className="h-4 w-4 shrink-0 text-blue-500" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      {backup.name}
                    </div>
                    <div className="text-xs text-neutral-400">
                      {formatTime(backup.created)} · {formatSize(backup.size)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRestore(backup)}
                    disabled={!!busy}
                    className="flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs text-blue-600 transition-colors hover:bg-blue-100 disabled:opacity-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
                    title="恢复"
                  >
                    {busy === `restore:${backup.path}` ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5" />
                    )}
                    恢复
                  </button>
                  <button
                    onClick={() => handleDelete(backup)}
                    disabled={!!busy}
                    className="shrink-0 rounded p-1 text-neutral-400 transition-colors hover:bg-red-100 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-900/30"
                    title="删除"
                  >
                    {busy === `delete:${backup.path}` ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="border-t border-neutral-200 px-5 py-3 dark:border-neutral-700">
          <p className="flex items-center gap-1 text-xs text-neutral-400">
            <ArchiveRestore className="h-3 w-3" />
            备份包含设置和所有 Agent 的记忆文件 · 最多保留 10 个版本
          </p>
        </div>
      </div>
    </div>
  );
}
