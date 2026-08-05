/**
 * 图标注册表 + 颜色调色板
 *
 * 用户可在设置中为每个 Agent / 项目选择图标和颜色。
 * 这里提供可选项列表，以及根据名称解析到 lucide 图标组件的工具函数。
 */

import {
  Bot,
  Brain,
  Cat,
  Code2,
  Database,
  FileText,
  Folder,
  FolderGit2,
  Heart,
  Home,
  Leaf,
  Lightbulb,
  type LucideIcon,
  MousePointer2,
  Package,
  PenTool,
  Rocket,
  Scale,
  Sparkles,
  Star,
  Terminal,
  User,
  Wand2,
  Wrench,
  Zap,
} from "lucide-react";

/** 可选图标列表 (name → 组件) */
export const ICON_REGISTRY: { name: string; icon: LucideIcon; label: string }[] = [
  { name: "bot", icon: Bot, label: "机器人" },
  { name: "brain", icon: Brain, label: "大脑" },
  { name: "cat", icon: Cat, label: "猫" },
  { name: "code", icon: Code2, label: "代码" },
  { name: "database", icon: Database, label: "数据库" },
  { name: "file", icon: FileText, label: "文件" },
  { name: "folder", icon: Folder, label: "文件夹" },
  { name: "git", icon: FolderGit2, label: "Git 项目" },
  { name: "heart", icon: Heart, label: "心" },
  { name: "home", icon: Home, label: "主页" },
  { name: "leaf", icon: Leaf, label: "叶子" },
  { name: "bulb", icon: Lightbulb, label: "灯泡" },
  { name: "mouse", icon: MousePointer2, label: "鼠标" },
  { name: "package", icon: Package, label: "包裹" },
  { name: "pen", icon: PenTool, label: "笔" },
  { name: "rocket", icon: Rocket, label: "火箭" },
  { name: "scale", icon: Scale, label: "天平" },
  { name: "sparkles", icon: Sparkles, label: "闪光" },
  { name: "star", icon: Star, label: "星" },
  { name: "terminal", icon: Terminal, label: "终端" },
  { name: "user", icon: User, label: "用户" },
  { name: "wand", icon: Wand2, label: "魔杖" },
  { name: "wrench", icon: Wrench, label: "扳手" },
  { name: "zap", icon: Zap, label: "闪电" },
];

/** 可选颜色列表 */
export const COLOR_PALETTE: { name: string; textClass: string; bgClass: string; hex: string }[] = [
  { name: "blue", textClass: "text-blue-500", bgClass: "bg-blue-500", hex: "#3b82f6" },
  { name: "green", textClass: "text-green-500", bgClass: "bg-green-500", hex: "#22c55e" },
  { name: "purple", textClass: "text-purple-500", bgClass: "bg-purple-500", hex: "#a855f7" },
  { name: "orange", textClass: "text-orange-500", bgClass: "bg-orange-500", hex: "#f97316" },
  { name: "pink", textClass: "text-pink-500", bgClass: "bg-pink-500", hex: "#ec4899" },
  { name: "red", textClass: "text-red-500", bgClass: "bg-red-500", hex: "#ef4444" },
  { name: "teal", textClass: "text-teal-500", bgClass: "bg-teal-500", hex: "#14b8a6" },
  { name: "indigo", textClass: "text-indigo-500", bgClass: "bg-indigo-500", hex: "#6366f1" },
  { name: "cyan", textClass: "text-cyan-500", bgClass: "bg-cyan-500", hex: "#06b6d4" },
  { name: "amber", textClass: "text-amber-500", bgClass: "bg-amber-500", hex: "#f59e0b" },
  { name: "emerald", textClass: "text-emerald-500", bgClass: "bg-emerald-500", hex: "#10b981" },
  { name: "neutral", textClass: "text-neutral-500", bgClass: "bg-neutral-500", hex: "#737373" },
];

/** 根据 icon name 获取 lucide 图标组件 */
export function resolveIcon(iconName: string | undefined): LucideIcon {
  if (!iconName) return Bot;
  const entry = ICON_REGISTRY.find((i) => i.name === iconName);
  return entry?.icon ?? Bot;
}

/** 根据 color name 获取 Tailwind 文字色 class */
export function resolveColorText(colorName: string | undefined): string {
  const entry = COLOR_PALETTE.find((c) => c.name === colorName);
  return entry?.textClass ?? "text-neutral-500";
}

/** 根据 color name 获取 Tailwind 背景色 class */
export function resolveColorBg(colorName: string | undefined): string {
  const entry = COLOR_PALETTE.find((c) => c.name === colorName);
  return entry?.bgClass ?? "bg-neutral-500";
}
