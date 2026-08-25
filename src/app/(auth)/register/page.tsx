"use client";

import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import MotionButton from "@/components/MotionButton";
import Alert from "@/components/ui/Alert";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COUNTDOWN_SECONDS = 3;

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

  // 注册成功后倒计时跳转登录页
  useEffect(() => {
    if (!success) return;
    if (countdown <= 0) {
      router.push("/login");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [success, countdown, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!EMAIL_RE.test(email.trim())) {
      setError("请输入正确的邮箱");
      return;
    }
    if (password.length < 6) {
      setError("密码至少 6 位");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "注册失败");
        return;
      }
      setSuccess(true);
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm"
      >
        <h1 className="text-2xl font-bold text-fg">注册</h1>
        <p className="mt-1 text-sm text-muted">创建家校沟通话术助手账号</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="register-email" className="mb-1 block text-sm text-muted">邮箱</label>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={success}
              className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-fg outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="register-password" className="mb-1 block text-sm text-muted">密码</label>
            <input
              id="register-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={success}
              className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-fg outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
              placeholder="至少 6 位"
            />
          </div>

          {error && <Alert type="error" message={error} />}
          {success && (
            <Alert
              type="success"
              message={`注册成功！${countdown} 秒后自动跳转到登录页，或点击此处立即登录`}
            />
          )}

          {!success && (
            <MotionButton
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary px-4 py-2.5 font-medium text-primary-fg transition hover:brightness-105 disabled:opacity-60"
            >
              {loading ? "注册中…" : "注册"}
            </MotionButton>
          )}
        </form>

        {success ? (
          <div className="mt-6 text-center">
            <button
              onClick={() => router.push("/login")}
              className="text-sm text-primary hover:underline"
            >
              立即前往登录 →
            </button>
          </div>
        ) : (
          <p className="mt-6 text-center text-sm text-muted">
            已有账号？{" "}
            <Link href="/login" className="text-primary hover:underline">
              登录
            </Link>
          </p>
        )}
      </motion.div>
    </main>
  );
}
