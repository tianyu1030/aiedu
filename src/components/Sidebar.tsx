"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/contexts/SidebarContext";
import LogoutButton from "@/components/LogoutButton";

const NAV_LINKS: { href: string; label: string; icon: string }[] = [
  { href: "/dashboard", label: "工作台", icon: "🏠" },
  { href: "/classes", label: "班级管理", icon: "👥" },
  { href: "/students", label: "学生管理", icon: "🎒" },
  { href: "/records", label: "沟通记录", icon: "💬" },
  { href: "/generate", label: "话术生成", icon: "✨" },
  { href: "/settings", label: "设置", icon: "⚙️" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

/** 展开图标 ☰ */
function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

/** 收起图标 ← */
function CollapseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

/**
 * 移动端侧边栏。
 * - open=false：完全隐藏（顶栏显示 ☰ 打开）
 * - open=true, expanded=false：窄图标栏 56px，顶部有 ☰ 展开按钮
 * - open=true, expanded=true：宽栏 176px 带文字 + 遮罩，顶部有 ← 收起按钮
 * 点击任意导航项 → 自动收缩回窄栏
 */
export default function Sidebar() {
  const { open, expanded, setExpanded } = useSidebar();
  const pathname = usePathname();

  if (!open) return null;

  return (
    <>
      {/* 展开时的遮罩 */}
      {expanded && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm sm:hidden"
          onClick={() => setExpanded(false)}
          aria-hidden
        />
      )}

      <aside
        className={[
          "fixed left-0 top-0 z-50 flex h-full flex-col border-r border-border bg-card shadow-sm transition-all duration-300 sm:hidden",
          expanded ? "w-44" : "w-14",
        ].join(" ")}
      >
        {/* 顶部：仅 logo */}
        <div className="flex h-12 items-center justify-center border-b border-border">
          <Link
            href="/dashboard"
            onClick={() => setExpanded(false)}
            aria-label="家校沟通助手"
          >
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-fg"
              aria-hidden
            >
              家
            </span>
          </Link>
        </div>

        {/* 导航 */}
        <nav
          className="flex flex-1 flex-col gap-1 overflow-y-auto py-2"
          aria-label="移动端导航"
        >
          {NAV_LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                title={link.label}
                aria-label={link.label}
                aria-current={active ? "page" : undefined}
                onClick={() => setExpanded(false)}
                className={[
                  "flex items-center rounded-lg text-fg transition-colors",
                  expanded
                    ? "mx-2 gap-3 px-3 py-2.5 text-sm font-medium"
                    : "mx-auto h-11 w-11 justify-center text-lg",
                  active
                    ? "bg-primary text-primary-fg"
                    : "hover:bg-accent",
                ].join(" ")}
              >
                <span className="shrink-0" aria-hidden>
                  {link.icon}
                </span>
                {expanded && <span>{link.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* 底部：展开/收缩按钮 + 退出登录 */}
        <div className="border-t border-border">
          {/* 展开/收缩按钮 */}
          <div
            className={[
              "border-b border-border",
              expanded ? "px-2 py-1.5" : "flex justify-center py-2",
            ].join(" ")}
          >
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              aria-label={expanded ? "收起侧边栏" : "展开侧边栏"}
              title={expanded ? "收起侧边栏" : "展开侧边栏"}
              aria-expanded={expanded}
              className={[
                "flex items-center rounded-lg text-muted transition-colors hover:bg-accent hover:text-fg",
                expanded
                  ? "w-full gap-3 px-3 py-2 text-sm font-medium"
                  : "h-11 w-11 justify-center",
              ].join(" ")}
            >
              {expanded ? (
                <>
                  <CollapseIcon />
                  <span>收起菜单</span>
                </>
              ) : (
                <MenuIcon />
              )}
            </button>
          </div>

          {/* 退出登录 */}
          <div className={expanded ? "p-2" : "flex justify-center py-2"}>
            <LogoutButton variant="ghost" />
          </div>
        </div>
      </aside>
    </>
  );
}
