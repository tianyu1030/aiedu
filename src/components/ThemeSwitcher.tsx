"use client";

import { useTheme, type Theme } from "@/contexts/ThemeContext";

const OPTIONS: { value: Theme; label: string; emoji: string }[] = [
  { value: "default", label: "默认", emoji: "☀️" },
  { value: "eye", label: "护眼", emoji: "🌿" },
  { value: "dark", label: "暗色", emoji: "🌙" },
];

/**
 * 主题切换器。
 *  - 桌面端（sm+）：三按钮平铺
 *  - 移动端：下拉选择器，节省顶栏空间
 */
export default function ThemeSwitcher({ size = "md" }: { size?: "sm" | "md" }) {
  const { theme, setTheme, mounted } = useTheme();
  const paddingY = size === "sm" ? "py-1" : "py-1.5";
  const paddingX = size === "sm" ? "px-2" : "px-2.5";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <>
      {/* 桌面端：三按钮 */}
      <div
        className="hidden sm:inline-flex rounded-lg border border-border bg-card p-0.5 shadow-sm"
        role="group"
        aria-label="切换主题"
        suppressHydrationWarning
      >
        {OPTIONS.map((opt) => {
          const active = mounted && theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              aria-pressed={active}
              suppressHydrationWarning
              className={[
                `rounded-md ${paddingX} ${paddingY} ${textSize} font-medium transition-colors`,
                active
                  ? "bg-primary text-primary-fg"
                  : "text-muted hover:text-fg hover:bg-accent",
              ].join(" ")}
            >
              <span className="mr-1" aria-hidden>
                {opt.emoji}
              </span>
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* 移动端：下拉 */}
      <div className="sm:hidden" suppressHydrationWarning>
        <select
          value={mounted ? theme : "default"}
          onChange={(e) => setTheme(e.target.value as Theme)}
          aria-label="切换主题"
          suppressHydrationWarning
          className="h-9 rounded-lg border border-border bg-card px-2 text-xs font-medium text-fg outline-none transition focus:border-primary"
        >
          {OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.emoji} {opt.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
