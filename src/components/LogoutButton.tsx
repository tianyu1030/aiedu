"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import MotionButton from "@/components/MotionButton";

export default function LogoutButton({
  className,
  variant = "outline",
}: {
  className?: string;
  /** outline：边框按钮（默认顶栏风格）；ghost：用于下拉菜单内 */
  variant?: "outline" | "ghost";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) return;
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setLoading(false);
      router.push("/login");
      router.refresh();
    }
  }

  const base =
    variant === "ghost"
      ? "w-full justify-start rounded-md px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
      : "rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted/10 disabled:opacity-50";

  return (
    <MotionButton
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={[base, className ?? ""].join(" ").trim()}
    >
      {loading ? "退出中…" : "退出登录"}
    </MotionButton>
  );
}
