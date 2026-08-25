"use client";

import type { ReactNode } from "react";
import { useSidebar } from "@/contexts/SidebarContext";

/**
 * 内容区容器：移动端根据侧边栏 open 状态左移。
 * - open=true（窄图标栏显示）：内容区 margin-left = 56px（ml-14）
 * - open=false（侧边栏隐藏）：内容区占满（margin-left = 0）
 * - expanded=true（宽栏覆盖）：侧边栏为浮层，内容区位置不变
 * 桌面端不受影响（sm:ml-0）。
 */
export function MainShifter({ children }: { children: ReactNode }) {
  const { open } = useSidebar();
  return (
    <div className={open ? "ml-14 transition-[margin] duration-300 sm:ml-0" : "ml-0 transition-[margin] duration-300 sm:ml-0"}>
      {children}
    </div>
  );
}
