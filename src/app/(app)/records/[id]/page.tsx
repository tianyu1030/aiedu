"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import PageTransition from "@/components/PageTransition";
import MotionButton from "@/components/MotionButton";
import Skeleton from "@/components/ui/Skeleton";
import Alert from "@/components/ui/Alert";
import { useToast, ToastContainer } from "@/hooks/useToast";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

/* ------------------------------ 类型 ------------------------------ */

interface RecordDetail {
  id: number;
  student_id: number | null;
  student_name: string | null;
  parent_message: string;
  reply: string | null;
  strategy: string | null;
  risks: string | null;
  result: string | null;
  created_at: string;
  updated_at: string;
}

/* ------------------------------ 页面 ------------------------------ */

export default function RecordDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [record, setRecord] = useState<RecordDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const [resultDraft, setResultDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const { toast, showToast, hideToast } = useToast();

  /* -------- 加载详情 -------- */
  const loadDetail = useCallback(async () => {
    const idStr = params?.id;
    const id = Number(idStr);
    if (!Number.isInteger(id) || id <= 0) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setNotFound(false);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/records/${id}`);
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 404) {
          setNotFound(true);
        } else {
          setErrorMsg(data.error || "加载详情失败");
          showToast("error", data.error || "加载详情失败");
        }
        return;
      }
      setRecord(data.record);
      setResultDraft(data.record?.result ?? "");
      setDirty(false);
    } catch (e) {
      const msg = (e as Error).message || "加载详情失败";
      setErrorMsg(msg);
      showToast("error", msg);
    } finally {
      setLoading(false);
    }
  }, [params?.id]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  /* -------- 保存 result -------- */
  const handleSaveResult = async () => {
    if (!record || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/records/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result: resultDraft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");

      setRecord({ ...record, result: resultDraft });
      setDirty(false);
      showToast("success", "沟通结果已保存");
    } catch (e) {
      showToast("error", (e as Error).message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  /* -------- 本地编辑 result -------- */
  const handleResultChange = (v: string) => {
    setResultDraft(v);
    setDirty(true);
  };

  /* ------------------------------ 渲染 ------------------------------ */

  return (
    <PageTransition className="mx-auto w-full max-w-4xl">
      {/* Toast */}
      <ToastContainer toast={toast} onClose={hideToast} />

      <div className="space-y-6">
        {/* 顶部：返回按钮 + 标题 */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <Link
              href="/records"
              className="mb-2 inline-flex items-center gap-1 text-sm text-muted transition hover:text-fg"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
              返回记录列表
            </Link>
            <h1 className="truncate text-2xl font-bold text-fg">沟通记录详情</h1>
            {record && (
              <p className="mt-2 text-sm text-muted">
                记录 #{record.id} · 创建于 {formatDateTime(record.created_at)}
              </p>
            )}
          </div>
        </header>

        {/* 主内容 */}
        <main>
          {loading ? (
            <DetailSkeleton />
          ) : notFound ? (
            <NotFoundBlock onBack={() => router.push("/records")} />
          ) : errorMsg && !record ? (
            <ErrorBlock
              message={errorMsg}
              onRetry={() => void loadDetail()}
              onBack={() => router.push("/records")}
            />
          ) : record ? (
            <div className="space-y-5">
              {/* 关联学生 */}
              <Section title="关联学生" icon="user">
                {record.student_id && record.student_name ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href={`/students`}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary/10 px-3.5 py-2 text-sm font-medium text-primary transition hover:bg-primary/15"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      {record.student_name}
                    </Link>
                    <span className="text-xs text-muted">
                      student_id: {record.student_id}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-muted">未关联学生</span>
                )}
              </Section>

              {/* 家长消息 */}
              <Section title="家长消息原文" icon="message-in">
                <BlockText value={record.parent_message} empty="（无内容）" />
              </Section>

              {/* 回复话术 */}
              <Section title="回复话术" icon="message-out">
                <BlockText value={record.reply} empty="（未生成回复内容）" />
              </Section>

              {/* 沟通策略 */}
              <Section title="沟通策略" icon="target">
                <BlockText value={record.strategy} empty="（未提供）" />
              </Section>

              {/* 风险提示 */}
              <Section title="风险提示" icon="alert" variant="warn">
                <BlockText value={record.risks} empty="（无风险提示）" />
              </Section>

              {/* 沟通结果（可编辑） */}
              <Section
                title="沟通结果"
                icon="edit"
                headingId="record-result-heading"
                description="记录与家长实际沟通后的结论与后续跟进事项，仅您自己可见。"
                extra={
                  <div className="flex items-center gap-2">
                    {dirty && (
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        有未保存的修改
                      </span>
                    )}
                    <MotionButton
                      onClick={() => void handleSaveResult()}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-fg shadow-sm transition hover:brightness-105 disabled:opacity-60"
                    >
                      {saving ? "保存中…" : "保存结果"}
                    </MotionButton>
                  </div>
                }
              >
                <textarea
                  id="record-result"
                  aria-labelledby="record-result-heading"
                  value={resultDraft}
                  onChange={(e) => handleResultChange(e.target.value)}
                  rows={6}
                  placeholder="例如：家长已回复，约定下周三面谈；已转交班主任跟进……"
                  className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm leading-relaxed text-fg outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 resize-y"
                />
                <p className="mt-2 flex justify-between text-xs text-muted">
                  <span>
                    最后更新：{formatDateTime(record.updated_at)}
                  </span>
                  <span>{resultDraft.length} 字</span>
                </p>
              </Section>
            </div>
          ) : null}
        </main>
      </div>
    </PageTransition>
  );
}

/* ------------------------------ 子组件 ------------------------------ */

type SectionIcon = "user" | "message-in" | "message-out" | "target" | "alert" | "edit";

function Section({
  title,
  description,
  icon,
  variant = "default",
  extra,
  headingId,
  children,
}: {
  title: string;
  description?: string;
  icon?: SectionIcon;
  variant?: "default" | "warn";
  extra?: ReactNode;
  headingId?: string;
  children: ReactNode;
}) {
  const accent =
    variant === "warn"
      ? "border-amber-300/50 bg-amber-50 dark:bg-amber-500/5"
      : "border-border bg-card";
  return (
    <section className={`rounded-2xl border p-5 shadow-sm ${accent}`}>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 id={headingId} className="inline-flex items-center gap-2 text-base font-semibold text-fg">
            {icon && <SectionIconIcon icon={icon} variant={variant} />}
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-sm text-muted">{description}</p>
          )}
        </div>
        {extra && <div className="shrink-0">{extra}</div>}
      </header>
      {children}
    </section>
  );
}

function SectionIconIcon({
  icon,
  variant,
}: {
  icon: SectionIcon;
  variant: "default" | "warn";
}) {
  const color =
    variant === "warn"
      ? "text-amber-500 bg-amber-500/10"
      : "text-primary bg-primary/10";
  return (
    <span
      aria-hidden
      className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${color}`}
    >
      <IconSvg name={icon} />
    </span>
  );
}

function IconSvg({ name }: { name: SectionIcon }) {
  const base = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-4 w-4",
  };
  switch (name) {
    case "user":
      return (
        <svg {...base}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case "message-in":
      return (
        <svg {...base}>
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <path d="M22 6l-10 7L2 6" />
        </svg>
      );
    case "message-out":
      return (
        <svg {...base}>
          <path d="M22 2L11 13" />
          <path d="M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
      );
    case "target":
      return (
        <svg {...base}>
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      );
    case "alert":
      return (
        <svg {...base}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case "edit":
      return (
        <svg {...base}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      );
  }
}

function BlockText({ value, empty }: { value: string | null; empty: string }) {
  const text = value ?? "";
  if (!text.trim()) {
    return <p className="text-sm italic text-muted">{empty}</p>;
  }
  return (
    <div className="whitespace-pre-wrap break-words rounded-xl border border-border/60 bg-bg/60 p-4 text-sm leading-7 text-fg/90">
      {text}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border bg-card p-5 shadow-sm"
        >
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-4 h-24 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

function NotFoundBlock({ onBack }: { onBack: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card">
      <div className="px-6 py-16 text-center sm:py-20">
        <div
          aria-hidden
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-rose-200/40 to-rose-500/5 text-rose-500"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-10 w-10"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-fg">记录不存在或无权限查看</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          该沟通记录可能已被删除，或者不属于当前登录账号。请返回列表重新选择。
        </p>
        <MotionButton
          onClick={onBack}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-fg shadow-sm transition hover:brightness-105"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          返回记录列表
        </MotionButton>
      </div>
    </div>
  );
}

function ErrorBlock({
  message,
  onRetry,
  onBack,
}: {
  message: string;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <Alert type="error" message={message} />
      <div className="mt-5 flex flex-wrap gap-3">
        <MotionButton
          onClick={onRetry}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-fg transition hover:brightness-105"
        >
          重试加载
        </MotionButton>
        <MotionButton
          onClick={onBack}
          className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-fg transition hover:bg-muted/30"
        >
          返回列表
        </MotionButton>
      </div>
    </div>
  );
}
