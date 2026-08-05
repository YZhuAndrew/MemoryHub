/**
 * 可拖拽三栏布局
 *
 * 纯 flex + 鼠标事件实现，无第三方依赖。
 * 两个分隔条可拖动，调整三栏宽度比例。
 */

import { useRef, useState, useCallback, type ReactNode } from "react";

interface ResizablePanelsProps {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
}

const MIN_LEFT = 160;
const MIN_CENTER = 240;
const MIN_RIGHT = 300;

export function ResizablePanels({ left, center, right }: ResizablePanelsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // 用像素值存储宽度，更精确可控
  const [leftWidth, setLeftWidth] = useState(220);
  const [rightWidth, setRightWidth] = useState(500);
  const [dragging, setDragging] = useState<null | "left" | "right">(null);

  const startDrag = useCallback((which: "left" | "right") => {
    setDragging(which);
    // 拖动时禁用文本选中
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  }, []);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const containerWidth = rect.width;

      if (dragging === "left") {
        // 左分隔条：鼠标 x 相对容器的位置就是左栏宽度
        const newLeft = e.clientX - rect.left;
        const maxLeft = containerWidth - MIN_CENTER - rightWidth - 8; // 8 = 两个分隔条宽度
        setLeftWidth(Math.max(MIN_LEFT, Math.min(newLeft, maxLeft)));
      } else {
        // 右分隔条：鼠标 x 到容器右边的距离就是右栏宽度
        const newRight = rect.right - e.clientX;
        const maxRight = containerWidth - leftWidth - MIN_CENTER - 8;
        setRightWidth(Math.max(MIN_RIGHT, Math.min(newRight, maxRight)));
      }
    },
    [dragging, leftWidth, rightWidth],
  );

  const stopDrag = useCallback(() => {
    if (dragging) {
      setDragging(null);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    }
  }, [dragging]);

  return (
    <div
      ref={containerRef}
      className="flex flex-1 overflow-hidden"
      onMouseMove={onMouseMove}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
    >
      {/* 左栏 */}
      <div style={{ width: leftWidth }} className="shrink-0 overflow-hidden">
        {left}
      </div>

      {/* 左分隔条 */}
      <div
        onMouseDown={() => startDrag("left")}
        className="w-1 shrink-0 cursor-col-resize bg-neutral-200 transition-colors hover:bg-blue-400 dark:bg-neutral-700 dark:hover:bg-blue-600"
      />

      {/* 中间栏 */}
      <div className="min-w-0 flex-1 overflow-hidden">{center}</div>

      {/* 右分隔条 */}
      <div
        onMouseDown={() => startDrag("right")}
        className="w-1 shrink-0 cursor-col-resize bg-neutral-200 transition-colors hover:bg-blue-400 dark:bg-neutral-700 dark:hover:bg-blue-600"
      />

      {/* 右栏 */}
      <div style={{ width: rightWidth }} className="shrink-0 overflow-hidden">
        {right}
      </div>
    </div>
  );
}
