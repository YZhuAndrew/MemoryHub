/**
 * 记忆类型的共享常量
 *
 * 统一 Sidebar 和 MemoryList 中使用的类型标签和颜色。
 * 图标在组件层从 constants/icons.ts 获取 (lucide SVG)。
 */

import type { MemoryType } from "../types";

export interface TypeInfo {
  label: string;
  /** Tailwind 类名：徽章背景 + 文字色（亮色 + 暗色） */
  badgeClass: string;
}

export const MEMORY_TYPES: Record<MemoryType, TypeInfo> = {
  memory: {
    label: "记忆",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  identity: {
    label: "身份",
    badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  },
  user: {
    label: "用户",
    badgeClass: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  },
  rules: {
    label: "规则",
    badgeClass: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  },
  skill: {
    label: "技能",
    badgeClass: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  },
  prompt: {
    label: "提示词",
    badgeClass: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  },
  heartbeat: {
    label: "心跳",
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  },
  bootstrap: {
    label: "启动",
    badgeClass: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  },
  tools: {
    label: "工具",
    badgeClass: "bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300",
  },
  profile: {
    label: "档案",
    badgeClass: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  },
  unknown: {
    label: "其他",
    badgeClass: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
  },
};

/** Sidebar 里按顺序展示的类型列表（排除不常见的） */
export const SIDEBAR_TYPE_ORDER: MemoryType[] = [
  "memory",
  "identity",
  "user",
  "rules",
  "skill",
  "prompt",
  "heartbeat",
  "bootstrap",
  "tools",
];
