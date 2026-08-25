"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

/**
 * 移动端侧边栏状态。
 * - open：是否显示窄图标栏（默认 true）
 * - expanded：是否展开为带文字的宽栏，覆盖主内容（默认 false）
 *
 * 交互：
 * - open=false 时点按钮 → open=true（显示窄栏）
 * - open=true 且 expanded=false 时点按钮 → expanded=true（展开宽栏覆盖内容）
 * - open=true 且 expanded=true 时点按钮 → expanded=false（收缩回窄栏）
 * - 点击任意导航项 → expanded=false（自动收缩回窄栏）
 */
interface SidebarCtx {
  open: boolean;
  expanded: boolean;
  setOpen: (v: boolean) => void;
  setExpanded: (v: boolean) => void;
  /** 顶栏按钮：根据当前状态切换 open/expanded */
  toggle: () => void;
}

const Ctx = createContext<SidebarCtx | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState(false);

  function toggle() {
    if (!open) {
      setOpen(true);
    } else if (!expanded) {
      setExpanded(true);
    } else {
      setExpanded(false);
    }
  }

  return (
    <Ctx.Provider
      value={{ open, expanded, setOpen, setExpanded, toggle }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useSidebar(): SidebarCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSidebar 必须在 SidebarProvider 内使用");
  return ctx;
}
