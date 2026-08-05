/**
 * Tauri FsAdapter —— 全部通过 Rust 后端 command 实现
 *
 * 所有文件系统操作都在 Rust 端完成，前端只通过 invoke 调用。
 * 这样彻底绕过 Tauri fs 插件的 scope 权限限制。
 */

import { invoke } from "@tauri-apps/api/core";
import { homeDir } from "@tauri-apps/api/path";
import type { FsAdapter } from "./scanner";

export async function createTauriFsAdapter(): Promise<FsAdapter> {
  const home = await homeDir();

  return {
    expandHome(path: string): string {
      if (path === "~") return home;
      if (path.startsWith("~/")) return path.replace(/^~/, home);
      return path;
    },

    async exists(path: string): Promise<boolean> {
      return invoke<boolean>("fs_exists", { path });
    },

    async readTextFile(path: string): Promise<string> {
      return invoke<string>("fs_read_text_file", { path });
    },

    async getMtime(path: string): Promise<number> {
      return invoke<number>("fs_get_mtime", { path });
    },

    async listFiles(
      dir: string,
      glob: string,
      exclude: string[] = [],
    ): Promise<string[]> {
      return invoke<string[]>("fs_list_files", { dir, glob, exclude });
    },

    async readSqlite(
      dbPath: string,
      sql: string,
    ): Promise<Record<string, unknown>[]> {
      return invoke<Record<string, unknown>[]>("read_sqlite", { dbPath, sql });
    },
  };
}
