/**
 * 图标+颜色选择器
 *
 * 用于在设置中为 Agent/项目选择显示外观。
 */

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ICON_REGISTRY, COLOR_PALETTE, resolveIcon, resolveColorText } from "../constants/icon-registry";

export function AppearancePicker({
  icon,
  color,
  onIconChange,
  onColorChange,
}: {
  icon: string;
  color: string;
  onIconChange: (icon: string) => void;
  onColorChange: (color: string) => void;
}) {
  const [iconOpen, setIconOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);

  const CurrentIcon = resolveIcon(icon);
  const colorText = resolveColorText(color);

  return (
    <div className="flex items-center gap-2">
      {/* 图标选择 */}
      <div className="relative">
        <button
          onClick={() => {
            setIconOpen(!iconOpen);
            setColorOpen(false);
          }}
          className={`flex items-center gap-1 rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-600 dark:hover:bg-neutral-800 ${colorText}`}
        >
          <CurrentIcon className="h-3.5 w-3.5" />
          <span className="text-neutral-500">{ICON_REGISTRY.find((i) => i.name === icon)?.label}</span>
          {iconOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
        {iconOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIconOpen(false)} />
            <div className="absolute left-0 top-full z-20 mt-1 grid w-64 grid-cols-6 gap-1 rounded-md border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-600 dark:bg-neutral-800">
              {ICON_REGISTRY.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      onIconChange(item.name);
                      setIconOpen(false);
                    }}
                    title={item.label}
                    className={`flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700 ${
                      icon === item.name ? "bg-blue-100 dark:bg-blue-900/40" : ""
                    } ${colorText}`}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 颜色选择 */}
      <div className="relative">
        <button
          onClick={() => {
            setColorOpen(!colorOpen);
            setIconOpen(false);
          }}
          className="flex items-center gap-1 rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-600 dark:hover:bg-neutral-800"
        >
          <span className={`h-3.5 w-3.5 rounded-full ${COLOR_PALETTE.find((c) => c.name === color)?.bgClass ?? "bg-neutral-500"}`} />
          {colorOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
        {colorOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setColorOpen(false)} />
            <div className="absolute left-0 top-full z-20 mt-1 grid w-48 grid-cols-6 gap-1 rounded-md border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-600 dark:bg-neutral-800">
              {COLOR_PALETTE.map((item) => (
                <button
                  key={item.name}
                  onClick={() => {
                    onColorChange(item.name);
                    setColorOpen(false);
                  }}
                  title={item.name}
                  className={`flex h-7 w-7 items-center justify-center rounded-full transition-transform hover:scale-110 ${
                    color === item.name ? "ring-2 ring-offset-1 ring-blue-500 dark:ring-offset-neutral-800" : ""
                  }`}
                >
                  <span className={`h-4 w-4 rounded-full ${item.bgClass}`} />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
