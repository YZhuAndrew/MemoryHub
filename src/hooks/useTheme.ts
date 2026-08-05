/**
 * 主题管理 hook
 *
 * 暗色模式切换。首屏已在 index.html 中同步初始化（避免闪白），
 * 这里负责运行时的切换和持久化。
 */

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "memoryhub-theme";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark")
        ? "dark"
        : "light";
    }
    return "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.style.backgroundColor = "#0a0a0a";
    } else {
      root.classList.remove("dark");
      root.style.backgroundColor = "#ffffff";
    }
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return { theme, toggleTheme };
}
