"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import LogoutButton from "@/components/LogoutButton";
import MotionButton from "@/components/MotionButton";
import { useSidebar } from "@/contexts/SidebarContext";

const NAV_LINKS: { href: string; label: string }[] = [
  { href: "/dashboard", label: "工作台" },
  { href: "/classes", label: "班级管理" },
  { href: "/students", label: "学生管理" },
  { href: "/records", label: "沟通记录" },
  { href: "/generate", label: "话术生成" },
  { href: "/settings", label: "设置" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

/** 点击组件外关闭下拉菜单 */
function useClickOutside<T extends HTMLElement>(onOutside: () => void) {
  const [ref, setRef] = useState<T | null>(null);
  useEffect(() => {
    if (!ref) return;
    const el = ref;
    function handler(e: MouseEvent) {
      if (!el.contains(e.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onOutside]);
  return setRef;
}

/**
 * 顶栏导航：登录后统一显示。
 *  - 桌面端：logo + 横向 tab + 主题 + 用户菜单
 *  - 移动端：logo + 侧边栏收缩/展开按钮 + 主题下拉 + 用户菜单
 *           导航链接移至常驻左侧 Sidebar 组件
 */
export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { open, toggle } = useSidebar();

  const [user, setUser] = useState<{ email: string; id: number } | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const menuRef = useClickOutside<HTMLDivElement>(() => setMenuOpen(false));

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "same-origin",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (alive && data?.ok && data?.user) setUser(data.user);
      } catch {
        /* ignore */
      } finally {
        if (alive) setUserLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [pathname]);

  const avatarText =
    user?.email?.[0]?.toUpperCase() ?? (userLoading ? "…" : "我");

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        {/* 移动端：仅当侧边栏完全隐藏时显示打开按钮 */}
        {!open && (
          <MotionButton
            type="button"
            onClick={toggle}
            aria-label="显示侧边栏"
            title="显示侧边栏"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-fg hover:bg-accent sm:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </MotionButton>
        )}

        <Link
          href="/dashboard"
          className="flex shrink-0 items-center gap-2 font-bold text-fg"
        >
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-fg"
            aria-hidden
          >
            家
          </span>
          <span className="hidden text-base sm:inline">家校沟通助手</span>
        </Link>

        {/* 桌面端横向导航 */}
        <nav
          className="nav-scroll -mx-1 hidden flex-1 items-center gap-1 overflow-x-auto px-1 sm:flex"
          aria-label="主导航"
        >
          {NAV_LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-fg"
                    : "text-muted hover:bg-accent hover:text-fg",
                ].join(" ")}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
          <ThemeSwitcher size="sm" />

          {/* 用户名下拉 */}
          <div className="relative" ref={menuRef}>
            <MotionButton
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="用户菜单"
              title="用户菜单"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-accent text-sm font-semibold text-fg hover:border-primary/40"
            >
              {avatarText}
            </MotionButton>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-card p-2 shadow-lg"
              >
                <div className="px-3 py-2">
                  <p className="text-xs text-muted">已登录账户</p>
                  <p className="mt-0.5 truncate text-sm font-medium text-fg" title={user?.email}>
                    {userLoading ? "加载中…" : user?.email ?? "未获取到邮箱"}
                  </p>
                </div>
                <div className="my-1 h-px bg-border" />
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      router.push("/settings");
                    }}
                    className="rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    设置
                  </button>
                  <div role="none">
                    <LogoutButton variant="ghost" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
