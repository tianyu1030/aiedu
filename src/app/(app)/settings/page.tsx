"use client";

import PageTransition from "@/components/PageTransition";
import ThemeSwitcher from "@/components/ThemeSwitcher";

export const dynamic = "force-dynamic";

/**
 * 设置页：当前放置「主题切换器」（Task 12 要求）。
 * 其他偏好设置后续 Task 继续扩展。
 */
export default function SettingsPage() {
  return (
    <PageTransition className="mx-auto w-full max-w-5xl">
      <div className="space-y-6">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-base font-semibold text-fg">主题外观</h2>
          <p className="mt-1 text-sm text-muted">
            在默认、护眼与暗色三套主题之间切换，偏好会保存在本地。
          </p>
          <div className="mt-4">
            <ThemeSwitcher />
          </div>
        </section>

        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted">
          更多设置待实现
        </div>
      </div>
    </PageTransition>
  );
}
