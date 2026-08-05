/**
 * 外观解析器
 *
 * 将 Agent ID / 项目名 解析为最终的图标组件和颜色 class。
 * 优先级: 用户设置 > 内置默认。
 */

import type { LucideIcon } from "lucide-react";
import {
  resolveIcon,
  resolveColorText,
  resolveColorBg,
} from "./icon-registry";
import {
  DEFAULT_AGENT_APPEARANCE,
  DEFAULT_PROJECT_APPEARANCE,
  type AgentDisplayConfig,
  type ProjectScope,
  type CustomAgent,
} from "../types/settings";

export interface ResolvedAppearance {
  icon: LucideIcon;
  colorText: string;
  colorBg: string;
}

/**
 * 解析 Agent 的外观。
 * settings 是用户设置中的 agents 列表。
 * 优先级: 自定义 Agent (customAgents 自带 icon/color) > 用户覆盖 > 内置默认。
 */
export function resolveAgentAppearance(
  agentId: string,
  agents?: AgentDisplayConfig[],
  customAgents?: CustomAgent[],
): ResolvedAppearance {
  // 自定义 Agent 自带 icon/color
  const custom = customAgents?.find((c) => c.id === agentId);
  if (custom) {
    return {
      icon: resolveIcon(custom.icon),
      colorText: resolveColorText(custom.color),
      colorBg: resolveColorBg(custom.color),
    };
  }

  const userConfig = agents?.find((a) => a.id === agentId);
  const defaults = DEFAULT_AGENT_APPEARANCE[agentId] ?? { icon: "bot", color: "neutral" };

  const iconName = userConfig?.icon || defaults.icon;
  const colorName = userConfig?.color || defaults.color;

  return {
    icon: resolveIcon(iconName),
    colorText: resolveColorText(colorName),
    colorBg: resolveColorBg(colorName),
  };
}

/**
 * 解析项目的外观。
 */
export function resolveProjectAppearance(
  projectName: string,
  projects?: ProjectScope[],
): ResolvedAppearance {
  const userConfig = projects?.find((p) => p.name === projectName);

  const iconName = userConfig?.icon || DEFAULT_PROJECT_APPEARANCE.icon;
  const colorName = userConfig?.color || DEFAULT_PROJECT_APPEARANCE.color;

  return {
    icon: resolveIcon(iconName),
    colorText: resolveColorText(colorName),
    colorBg: resolveColorBg(colorName),
  };
}
