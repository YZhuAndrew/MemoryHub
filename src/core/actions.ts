/**
 * 外部操作 —— 调用 Rust 后端用其他 App 打开文件、在访达中显示、复制路径
 */

import { invoke } from "@tauri-apps/api/core";

/** 常用的编辑器 App 名称 (macOS) */
export const EDITOR_APPS = [
  { name: "Typora", id: "Typora" },
  { name: "Zed", id: "Zed" },
  { name: "VS Code", id: "Visual Studio Code" },
  { name: "Cursor", id: "Cursor" },
  { name: "默认应用", id: "" },
] as const;

/** 用指定编辑器打开文件 */
export async function openWithApp(filePath: string, appName: string): Promise<void> {
  await invoke("open_with_app", {
    path: filePath,
    appName: appName || null,
  });
}

/** 在访达中显示文件（选中） */
export async function revealInFinder(filePath: string): Promise<void> {
  await invoke("reveal_in_finder", { path: filePath });
}

/** 复制文本到剪贴板 */
export async function copyToClipboard(text: string): Promise<void> {
  await invoke("copy_to_clipboard", { text });
}
