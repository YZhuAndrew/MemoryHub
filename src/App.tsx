/**
 * MemoryHub 主应用
 */

import { useEffect, useRef, useState } from "react";
import { Archive as ArchiveIcon, Moon, RefreshCw, Settings, Sun } from "lucide-react";
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

  // 先加载设置，再扫描
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    (async () => {
      await loadSettings();
      await runScan();
    })();
  }, [runScan, loadSettings]);

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
