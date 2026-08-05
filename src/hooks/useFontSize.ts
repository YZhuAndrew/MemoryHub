/**
 * 字体大小控制 hook
 *
 * 快捷键 Cmd/Ctrl+/Cmd- 调整全局字体大小。
 * 范围 12px~20px，持久化到 localStorage。
 */

import { useEffect, useState } from "react";

const STORAGE_KEY = "memoryhub-font-size";
const MIN_SIZE = 12;
const MAX_SIZE = 20;
const DEFAULT_SIZE = 14;

export function useFontSize() {
  const [fontSize, setFontSize] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const size = stored ? parseInt(stored, 10) : DEFAULT_SIZE;
    return Math.max(MIN_SIZE, Math.min(MAX_SIZE, isNaN(size) ? DEFAULT_SIZE : size));
  });

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
    localStorage.setItem(STORAGE_KEY, String(fontSize));
  }, [fontSize]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + = 或 + 放大
      if ((e.metaKey || e.ctrlKey) && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        setFontSize((s) => Math.min(MAX_SIZE, s + 1));
      }
      // Cmd/Ctrl + - 缩小
      if ((e.metaKey || e.ctrlKey) && e.key === "-") {
        e.preventDefault();
        setFontSize((s) => Math.max(MIN_SIZE, s - 1));
      }
      // Cmd/Ctrl + 0 重置
      if ((e.metaKey || e.ctrlKey) && e.key === "0") {
        e.preventDefault();
        setFontSize(DEFAULT_SIZE);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { fontSize, setFontSize };
}
