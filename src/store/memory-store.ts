/**
 * 状态管理 (Zustand)
 *
 * 管理全局状态：
 * - 扫描结果 (items / stats / errors)
 * - 搜索过滤
 * - 当前选中的记忆条目
 * - 编辑状态
 */

import { create } from "zustand";
import type {
  MemoryItem,
  ScanResult,
  AgentScanStats,
  ScanError,
} from "../types";
import { getEffectiveProfiles } from "../core/profiles/builtin-profiles";
import { scanAll } from "../core/scanner/scanner";
import { createTauriFsAdapter } from "../core/scanner/tauri-fs-adapter";
import { useSettingsStore } from "./settings-store";

interface MemoryState {
  // 数据
  items: MemoryItem[];
  statsByAgent: AgentScanStats[];
  errors: ScanError[];
  fatalError: string | null; // 扫描整体崩溃的错误

  // UI 状态
  loading: boolean;
  scanDurationMs: number;
  searchQuery: string;
  selectedAgentId: string | null; // null = 全部
  selectedTypeId: string | null; // null = 全部类型
  selectedItemId: string | null;

  // 操作
  runScan: () => Promise<void>;
  setSearch: (query: string) => void;
  selectAgent: (agentId: string | null) => void;
  selectType: (typeId: string | null) => void;
  selectItem: (itemId: string | null) => void;
}

export const useMemoryStore = create<MemoryState>((set, get) => ({
  items: [],
  statsByAgent: [],
  errors: [],
  fatalError: null,

  loading: false,
  scanDurationMs: 0,
  searchQuery: "",
  selectedAgentId: null,
  selectedTypeId: null,
  selectedItemId: null,

  runScan: async () => {
    // 防止并发扫描互相覆盖结果
    if (get().loading) return;

    set({ loading: true, fatalError: null });
    try {
      // 使用用户设置合并后的 profiles
      const settings = useSettingsStore.getState().settings;
      const profiles = getEffectiveProfiles(settings);
      const fs = await createTauriFsAdapter();
      const result: ScanResult = await scanAll(profiles, fs);

      set({
        items: result.items,
        statsByAgent: result.statsByAgent,
        errors: result.errors,
        scanDurationMs: result.durationMs,
        loading: false,
        selectedItemId: null,
        fatalError: null,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      set({ loading: false, fatalError: `扫描失败: ${msg}` });
    }
  },

  setSearch: (query) => set({ searchQuery: query }),

  selectAgent: (agentId) =>
    set({ selectedAgentId: agentId, selectedItemId: null }),

  selectType: (typeId) => set({ selectedTypeId: typeId, selectedItemId: null }),

  selectItem: (itemId) => set({ selectedItemId: itemId }),
}));
