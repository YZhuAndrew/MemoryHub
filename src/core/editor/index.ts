/**
 * 编辑器 —— 把编辑后的内容写回原始文件
 *
 * 通过 Rust 后端 command 写文件，不依赖 fs 插件。
 */

import { invoke } from "@tauri-apps/api/core";
import type { MemoryItem } from "../../types";

/**
 * 把编辑后的内容写回 MemoryItem 对应的原始文件。
 */
export async function writeMemoryItem(
  item: MemoryItem,
  newContent: string,
): Promise<void> {
  if (item.format === "sqlite") {
    throw new Error("SQLite 格式暂不支持直接编辑（需要通过 Agent API）");
  }

  const filePath = item.source.filePath;

  if (item.format === "md-full") {
    // 整文件替换
    await invoke("fs_write_text_file", { path: filePath, content: newContent });
    return;
  }

  // 其他 Markdown 格式：需要读取原文件，按行替换，再写回
  const original: string = await invoke("fs_read_text_file", { path: filePath });
  const lines = original.split("\n");

  const range = item.location?.lineRange;
  if (!range) {
    await invoke("fs_write_text_file", { path: filePath, content: newContent });
    return;
  }

  const [startLine, endLine] = range;
  const safeStart = Math.max(0, Math.min(startLine, lines.length - 1));
  const safeEnd = Math.max(safeStart, Math.min(endLine, lines.length - 1));

  const newLines = newContent.split("\n");
  const resultLines = [
    ...lines.slice(0, safeStart),
    ...newLines,
    ...lines.slice(safeEnd + 1),
  ];

  await invoke("fs_write_text_file", {
    path: filePath,
    content: resultLines.join("\n"),
  });
}
