/**
 * 备份和恢复 —— 前端调用封装
 */

import { invoke } from "@tauri-apps/api/core";

export interface BackupInfo {
  name: string;
  path: string;
  size: number;
  created: number;
}

/** 创建备份 (target_dir=null 时存到默认位置) */
export async function createBackup(targetDir?: string): Promise<string> {
  return invoke<string>("create_backup", {
    targetDir: targetDir ?? null,
  });
}

/** 列出已有备份 */
export async function listBackups(): Promise<BackupInfo[]> {
  return invoke<BackupInfo[]>("list_backups");
}

/** 从备份恢复 */
export async function restoreBackup(zipPath: string): Promise<void> {
  return invoke<void>("restore_backup", { zipPath });
}

/** 删除备份 */
export async function deleteBackup(zipPath: string): Promise<void> {
  return invoke<void>("delete_backup", { zipPath });
}

/** 格式化文件大小 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
