/**
 * MemoryHub 主应用
 */

import { useEffect, useRef, useState } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { Archive as ArchiveIcon, Download, Moon, RefreshCw, Settings, Sun, X } from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { MemoryList } from "./components/MemoryList";
import { DetailPanel } from "./components/DetailPanel";
import { ResizablePanels } from "./components/ResizablePanels";
import { BackupModal } from "./components/BackupModal";
import { SettingsModal } from "./components/SettingsModal";
import { useMemoryStore } from "./store/memory-store";
import { useSettingsStore } from "./store/settings-store";
import { useTheme } from "./hooks/useTheme";
import { useFontSize } from "./hooks/useFontSize";
import { useUpdateCheck } from "./hooks/useUpdateCheck";

function App() {
  const runScan = useMemoryStore((s) => s.runScan);
  const loading = useMemoryStore((s) => s.loading);
  const scanDurationMs = useMemoryStore((s) => s.scanDurationMs);
  const items = useMemoryStore((s) => s.items);
  const statsByAgent = useMemoryStore((s) => s.statsByAgent);
  const errors = useMemoryStore((s) => s.errors);
  const fatalError = useMemoryStore((s) => s.fatalError);
  const { theme, toggleTheme } = useTheme();
  useFontSize();
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [showBackup, setShowBackup] = useState(false);

  const updateCheck = useUpdateCheck();

  // 先加载设置，再扫描；扫描完成后静默检查更新
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    (async () => {
      await loadSettings();
      await runScan();
      // 启动时静默检查更新(失败不打扰)
      void updateCheck.checkOnceOnStartup();
    })();
  }, [runScan, loadSettings, updateCheck]);

  // 监听托盘事件:重新扫描 / 记忆文件变化(防抖 + 受 autoRefresh 控制)
  useEffect(() => {
    let rescanUnlisten: UnlistenFn | undefined;
    let changedUnlisten: UnlistenFn | undefined;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    // 托盘菜单「重新扫描」—— 始终响应
    listen("tray-rescan", () => { void runScan(); }).then((un) => { rescanUnlisten = un; });

    // 记忆文件变化 —— 防抖 1.5s,且仅在开启自动刷新时响应
    listen("mem-changed", () => {
      if (!useSettingsStore.getState().settings.autoRefresh) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => { void runScan(); }, 1500);
    }).then((un) => { changedUnlisten = un; });

    return () => {
      rescanUnlisten?.();
      changedUnlisten?.();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [runScan]);
  // 注: autoRefresh 通过 useSettingsStore.getState() 实时读取,故不放进依赖(避免重复订阅)

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-neutral-950">
      {/* 顶部工具栏 */}
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-2 dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex items-center gap-2">
          <ArchiveIcon className="h-5 w-5 text-blue-500" />
          <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            MemoryHub
          </span>
          {loading ? (
            <span className="ml-2 flex items-center gap-1 text-xs text-blue-500">
              <RefreshCw className="h-3 w-3 animate-spin" />
              扫描中...
            </span>
          ) : (
            <span className="ml-2 text-xs text-neutral-400">
              {items.length} 条 · {statsByAgent.filter((s) => s.itemCount > 0).length} 个 Agent
              {scanDurationMs > 0 && ` · ${(scanDurationMs / 1000).toFixed(2)}s`}
              {errors.length > 0 && ` · ⚠️ ${errors.length} 错误`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowBackup(true)}
            className="rounded-md border border-neutral-300 p-1.5 text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
            title="备份管理"
          >
            <ArchiveIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => updateCheck.checkNow(false)}
            disabled={updateCheck.status === "checking"}
            className={`relative rounded-md border p-1.5 transition-colors disabled:opacity-50 ${
              updateCheck.hasUpdate
                ? "border-blue-400 bg-blue-50 text-blue-600 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-300"
                : "border-neutral-300 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
            }`}
            title={
              updateCheck.status === "checking"
                ? "检查更新中..."
                : updateCheck.hasUpdate
                  ? `发现新版本 v${updateCheck.result?.latestVersion}，点击查看`
                  : "检查更新"
            }
          >
            <RefreshCw className={`h-4 w-4 ${updateCheck.status === "checking" ? "animate-spin" : ""}`} />
            {updateCheck.hasUpdate && (
              <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-500" />
              </span>
            )}
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="rounded-md border border-neutral-300 p-1.5 text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
            title="设置"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={toggleTheme}
            className="rounded-md border border-neutral-300 p-1.5 text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
            title={theme === "dark" ? "切换到亮色" : "切换到暗色"}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={() => runScan()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "扫描中" : "重新扫描"}
          </button>
        </div>
      </header>

      {/* 错误提示 */}
      {fatalError && (
        <div className="border-b border-red-300 bg-red-100 px-4 py-2 text-xs text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
          ❌ {fatalError}
        </div>
      )}

      {/* 更新提示 */}
      {updateCheck.hasUpdate && (
        <div className="flex items-center justify-between border-b border-blue-300 bg-blue-50 px-4 py-2 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
          <span className="flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5" />
            发现新版本 <strong>v{updateCheck.result?.latestVersion}</strong>(当前 v{updateCheck.result?.currentVersion})
            {updateCheck.result?.publishedAt && ` · ${new Date(updateCheck.result.publishedAt).toLocaleDateString("zh-CN")}`}
          </span>
          <span className="flex items-center gap-2">
            <a
              href={updateCheck.result?.releaseUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 rounded bg-blue-600 px-2 py-1 font-medium text-white hover:bg-blue-700"
            >
              <Download className="h-3 w-3" />
              下载更新
            </a>
            <button
              onClick={updateCheck.dismiss}
              className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-200"
              title="忽略本次提醒"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        </div>
      )}

      {/* 三栏主体 - 可拖拽调整宽度 */}
      <ResizablePanels
        left={<Sidebar />}
        center={<MemoryList />}
        right={<DetailPanel />}
      />

      {/* 设置弹窗 */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onChanged={() => runScan()}
        />
      )}

      {/* 备份弹窗 */}
      {showBackup && (
        <BackupModal
          onClose={() => setShowBackup(false)}
          onRestored={async () => {
            await loadSettings();
            await runScan();
            setShowBackup(false);
          }}
        />
      )}
    </div>
  );
}

export default App;
