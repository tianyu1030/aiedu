"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageTransition from "@/components/PageTransition";
import QuoteOfDay from "@/components/QuoteOfDay";
import MotionButton from "@/components/MotionButton";
import ListStagger, { StaggerItem } from "@/components/ListStagger";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import Alert from "@/components/ui/Alert";
import { useToast, ToastContainer } from "@/hooks/useToast";
import { formatTimeSmart } from "@/lib/format";

export const dynamic = "force-dynamic";

/* ------------------------------ 类型 ------------------------------ */

interface OverviewRecentRecord {
  id: number;
  parent_message_summary: string;
  created_at: string;
  student_name: string | null;
}

interface OverviewData {
  classCount: number;
  studentCount: number;
  recentRecords: OverviewRecentRecord[];
}

/* ------------------------------ 常量 ------------------------------ */

const GRADE_OPTIONS = [1, 2, 3, 4, 5, 6] as const;

/* ------------------------------ 页面 ------------------------------ */

export default function DashboardPage() {
  const router = useRouter();

  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast, showToast, hideToast } = useToast();

  // 新建班级弹窗
  const [formOpen, setFormOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formGrade, setFormGrade] = useState<number>(1);
  const [formError, setFormError] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  /* -------- 加载概览数据 -------- */
  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/overview");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "加载失败");
      setData({
        classCount: Number(json.classCount ?? 0),
        studentCount: Number(json.studentCount ?? 0),
        recentRecords: Array.isArray(json.recentRecords) ? json.recentRecords : [],
      });
    } catch (e) {
      showToast("error", (e as Error).message || "加载概览失败");
      setData({ classCount: 0, studentCount: 0, recentRecords: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  /* -------- 打开新建班级 -------- */
  const openCreate = () => {
    setFormName("");
    setFormGrade(1);
    setFormError("");
    setFormOpen(true);
  };

  /* -------- 提交新建班级 -------- */
  const submitCreate = async () => {
    const name = formName.trim();
    if (!name) {
      setFormError("班级名称不能为空");
      return;
    }
    if (name.length > 30) {
      setFormError("班级名称不能超过 30 个字符");
      return;
    }
    setFormError("");
    setFormSubmitting(true);
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, grade: formGrade }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "创建失败");
      showToast("success", "班级创建成功");
      setFormOpen(false);
      void loadOverview();
    } catch (e) {
      setFormError((e as Error).message || "创建失败");
    } finally {
      setFormSubmitting(false);
    }
  };

  /* ------------------------------ 渲染 ------------------------------ */

  return (
    <PageTransition className="mx-auto w-full max-w-5xl">
      {/* Toast */}
      <ToastContainer toast={toast} onClose={hideToast} />

      <div className="space-y-6">
        {/* 顶部：标题 + 新建按钮 */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <MotionButton
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-fg shadow-sm transition hover:brightness-105 disabled:opacity-60"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            新建班级
          </MotionButton>
        </header>

        {/* 每日励志语 */}
        <QuoteOfDay />

        {/* 数据概览卡片 */}
        <section>
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border bg-card p-6"
                >
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="mt-4 h-12 w-24" />
                  <Skeleton className="mt-4 h-4 w-32" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* 班级数量 */}
              <button
                type="button"
                onClick={() => router.push("/classes")}
                className="group text-left rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted">
                    班级数量
                  </span>
                  <div
                    aria-hidden
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary/15"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5"
                    >
                      <path d="M3 9l9-6 9 6v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
                      <path d="M9 22V12h6v10" />
                    </svg>
                  </div>
                </div>
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-4xl font-bold tracking-tight text-fg">
                    {data?.classCount ?? 0}
                  </span>
                  <span className="text-sm text-muted">个班级</span>
                </div>
                <div className="mt-4 flex items-center text-xs text-primary">
                  查看班级管理
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="ml-1 h-3.5 w-3.5 transition group-hover:translate-x-0.5"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </button>

              {/* 学生总数 */}
              <button
                type="button"
                onClick={() => router.push("/students")}
                className="group text-left rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted">
                    学生总数
                  </span>
                  <div
                    aria-hidden
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 transition group-hover:bg-emerald-500/15 dark:text-emerald-400"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5"
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                </div>
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-4xl font-bold tracking-tight text-fg">
                    {data?.studentCount ?? 0}
                  </span>
                  <span className="text-sm text-muted">名学生</span>
                </div>
                <div className="mt-4 flex items-center text-xs text-primary">
                  查看学生列表
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="ml-1 h-3.5 w-3.5 transition group-hover:translate-x-0.5"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </button>

              {/* 话术生成快捷入口 */}
              <button
                type="button"
                onClick={() => router.push("/generate")}
                className="group relative overflow-hidden text-left rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <div
                  aria-hidden
                  className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl transition group-hover:bg-primary/15"
                />
                <div className="relative flex items-center justify-between">
                  <span className="text-sm font-medium text-muted">
                    快捷入口
                  </span>
                  <div
                    aria-hidden
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-fg shadow-sm transition group-hover:scale-105"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5"
                    >
                      <path d="M12 2a3 3 0 0 0-3 3v1H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2V5a3 3 0 0 0-3-3z" />
                      <path d="M9 13h6" />
                      <path d="M9 17h4" />
                    </svg>
                  </div>
                </div>
                <div className="relative mt-5">
                  <span className="text-2xl font-semibold tracking-tight text-fg">
                    生成话术
                  </span>
                </div>
                <div className="relative mt-4 flex items-center text-xs text-primary">
                  开始 AI 辅助撰写
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="ml-1 h-3.5 w-3.5 transition group-hover:translate-x-0.5"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </button>
            </div>
          )}
        </section>

        {/* 最近沟通记录 */}
        <section className="rounded-2xl border border-border bg-card shadow-sm">
          {/* 标题栏 */}
          <header className="flex items-center justify-between border-b border-border/70 px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-base font-semibold text-fg">
                最近沟通记录
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                显示最新的 5 条家校沟通记录
              </p>
            </div>
            <MotionButton
              onClick={() => router.push("/records")}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-bg px-3 py-1.5 text-xs font-medium text-fg transition hover:border-primary/30 hover:text-primary"
            >
              查看全部
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </MotionButton>
          </header>

          {/* 列表内容 */}
          <div className="px-2 py-2 sm:px-3 sm:py-3">
            {loading ? (
              <LoadingRecords />
            ) : !data || data.recentRecords.length === 0 ? (
              <EmptyRecords />
            ) : (
              <ListStagger className="divide-y divide-border/60">
                {data.recentRecords.map((r) => (
                  <StaggerItem key={r.id}>
                    <RecordItem record={r} />
                  </StaggerItem>
                ))}
              </ListStagger>
            )}
          </div>
        </section>
      </div>

      {/* 新建班级弹窗 */}
      <Modal
        open={formOpen}
        onClose={() => !formSubmitting && setFormOpen(false)}
        title="新建班级"
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submitCreate();
          }}
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-fg">
              班级名称
            </label>
            <input
              type="text"
              maxLength={30}
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="如：三年级（2）班"
              className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-fg outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
            <p className="mt-1 text-xs text-muted">{formName.length}/30</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-fg">
              年级
            </label>
            <select
              value={formGrade}
              onChange={(e) => setFormGrade(Number(e.target.value))}
              className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-fg outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {GRADE_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g} 年级
                </option>
              ))}
            </select>
          </div>

          {formError && <Alert type="error" message={formError} />}

          <div className="flex justify-end gap-2 pt-2">
            <MotionButton
              type="button"
              onClick={() => setFormOpen(false)}
              disabled={formSubmitting}
              className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-fg transition hover:bg-muted/30 disabled:opacity-60"
            >
              取消
            </MotionButton>
            <MotionButton
              type="submit"
              disabled={formSubmitting}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-fg transition hover:brightness-105 disabled:opacity-60"
            >
              {formSubmitting ? "创建中…" : "创建班级"}
            </MotionButton>
          </div>
        </form>
      </Modal>
    </PageTransition>
  );
}

/* ------------------------------ 子组件 ------------------------------ */

/** 单条记录项：点击跳转详情 */
function RecordItem({ record }: { record: OverviewRecentRecord }) {
  const router = useRouter();
  const hasStudent = !!record.student_name;

  return (
    <button
      type="button"
      onClick={() => router.push(`/records/${record.id}`)}
      className="group flex w-full items-center gap-4 rounded-xl px-3 py-3 text-left transition hover:bg-muted/30 sm:px-4 focus:outline-none focus:ring-2 focus:ring-primary/30"
    >
      {/* 时间 */}
      <div className="shrink-0 text-right">
        <div className="text-sm font-medium tabular-nums text-fg">
          {formatTimeSmart(record.created_at)}
        </div>
      </div>

      {/* 学生名胶囊 */}
      <div className="shrink-0">
        {hasStudent ? (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            {record.student_name}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-muted/30 px-2.5 py-0.5 text-xs font-medium text-muted">
            未关联
          </span>
        )}
      </div>

      {/* 消息摘要 */}
      <p className="min-w-0 flex-1 truncate text-sm text-fg/80">
        {record.parent_message_summary || "（无家长消息内容）"}
      </p>

      {/* 箭头 */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-primary"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
  );
}

/** 加载骨架：5 条 */
function LoadingRecords() {
  return (
    <ul className="divide-y divide-border/60">
      {Array.from({ length: 5 }).map((_, i) => (
        <li
          key={i}
          className="flex items-center gap-4 rounded-xl px-3 py-3 sm:px-4"
        >
          <Skeleton className="h-5 w-12 shrink-0" />
          <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
          <Skeleton className="h-5 flex-1" />
        </li>
      ))}
    </ul>
  );
}

/** 无记录空状态 */
function EmptyRecords() {
  const router = useRouter();
  return (
    <div className="px-4 py-12 text-center sm:px-6 sm:py-14">
      <div
        aria-hidden
        className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-8 w-8"
        >
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <path d="M22 6l-10 7L2 6" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-fg">暂无沟通记录</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
        还没有任何家校沟通记录。前往「话术生成」快速生成第一条沟通话术，保存后自动出现在这里。
      </p>
      <MotionButton
        onClick={() => router.push("/generate")}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-fg shadow-sm transition hover:brightness-105"
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
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
        立即生成
      </MotionButton>
    </div>
  );
}
