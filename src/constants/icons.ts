/**
 * 图标映射 —— 使用 lucide-react 无色 SVG 图标
 *
 * 为每个 Agent 和记忆类型分配语义化的线条图标。
 */

import {
  Bot,
  Brain,
  Cat,
  Code2,
  Database,
  FileText,
  Heart,
  MousePointer2,
  Package,
  Rocket,
  Sparkles,
  Terminal,
  User,
  Wand2,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { MemoryType } from "../types";

/** Agent 图标映射 (替换之前的 emoji) */
export const AGENT_ICONS: Record<string, LucideIcon> = {
  hermes: Wand2,
  codex: Terminal,
  claude: Bot,
  memmy: Database,
  workbuddy: Package,
  openclaw: Cat,
  copaw: Heart,
  zcode: Code2,
  cursor: MousePointer2,
};

/** Agent 主题色 (用于列表区分) */
export const AGENT_COLORS: Record<string, string> = {
  hermes: "text-purple-500",
  codex: "text-green-500",
  claude: "text-orange-500",
  memmy: "text-blue-500",
  workbuddy: "text-teal-500",
  openclaw: "text-pink-500",
  copaw: "text-red-500",
  zcode: "text-indigo-500",
  cursor: "text-cyan-500",
};

/** 获取 Agent 图标组件，未找到则返回默认 */
export function getAgentIcon(agentId: string): LucideIcon {
  return AGENT_ICONS[agentId] ?? Bot;
}

/** 获取 Agent 主题色 */
export function getAgentColor(agentId: string): string {
  return AGENT_COLORS[agentId] ?? "text-neutral-500";
}

/** 记忆类型图标映射 */
export const TYPE_ICONS: Record<MemoryType, LucideIcon> = {
  memory: Brain,
  identity: Sparkles,
  user: User,
  rules: FileText,
  skill: Sparkles,
  prompt: FileText,
  heartbeat: Heart,
  bootstrap: Rocket,
  tools: Wrench,
  profile: Package,
  unknown: FileText,
};
