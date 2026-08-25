"use client";

import { Suspense, useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import MotionButton from "@/components/MotionButton";
import Alert from "@/components/ui/Alert";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REMEMBER_KEY = "aiedu:remember-login";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 首次加载：从 localStorage 恢复记住的账号密码
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        const { email: e, password: p } = JSON.parse(saved);
        if (e) setEmail(e);
        if (p) setPassword(p);
        setRemember(true);
      }
    } catch {
      // 忽略解析失败
    }
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!EMAIL_RE.test(email.trim())) {
      setError("请输入正确的邮箱");
      return;
    }
    if (!password) {
      setError("请输入密码");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "登录失败");
        return;
      }

      // 记住密码：勾选则存 localStorage，取消则清除
      try {
        if (remember) {
          localStorage.setItem(
            REMEMBER_KEY,
            JSON.stringify({ email: email.trim(), password })
          );
        } else {
          localStorage.removeItem(REMEMBER_KEY);
        }
      } catch {
        // 忽略存储失败
      }

      // 整页跳转：让浏览器携带刚写入的 httpOnly Cookie 重新走 middleware，
      // 避免 router.push（客户端导航）时 Cookie 尚未生效导致被重定向回登录页
      window.location.href = redirect;
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
        <h1 className="text-2xl font-bold text-fg">登录</h1>
        <p className="mt-1 text-sm text-muted">家校沟通话术助手</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="login-email" className="mb-1 block text-sm text-muted">邮箱</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-fg outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="mb-1 block text-sm text-muted">密码</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-fg outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="••••••"
            />
          </div>

          <div className="flex items-center justify-between">
            <label htmlFor="login-remember" className="flex cursor-pointer items-center gap-2 text-sm text-muted">
              <input
                id="login-remember"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              记住密码
            </label>
          </div>

          {error && <Alert type="error" message={error} />}

          <MotionButton
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary px-4 py-2.5 font-medium text-primary-fg transition hover:brightness-105 disabled:opacity-60"
          >
            {loading ? "登录中…" : "登录"}
          </MotionButton>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          还没有账号？{" "}
          <Link href="/register" className="text-primary hover:underline">
            注册
          </Link>
        </p>
      </motion.div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
