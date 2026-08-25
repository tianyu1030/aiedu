"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageTransition from "@/components/PageTransition";
import MotionButton from "@/components/MotionButton";
import ListStagger, { StaggerItem } from "@/components/ListStagger";
import Skeleton from "@/components/ui/Skeleton";
import { useToast, ToastContainer } from "@/hooks/useToast";
import PrivacyNotice from "@/components/PrivacyNotice";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

/* ------------------------------ 类型 ------------------------------ */

interface StudentDetail {
  id: number;
  class_id: number;
  name: string;
  gender: string | null;
  tags: string | null;
  created_at: string;
  class_name: string;
  class_grade: number;
}

interface RecordItem {
  id: number;
  parent_message_summary: string;
  created_at: string;
}

/* ------------------------------ 工具 ------------------------------ */

function splitTags(tagsStr: string | null | undefined): string[] {
  if (!tagsStr) return [];
  return tagsStr
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/* ------------------------------ 页面 ------------------------------ */

export default function StudentDetailPage({
  params,
}: {
  params: { classId: string; studentId: string };
}) {
  const router = useRouter();
  const classId = Number(params.classId);
  const validClassId = Number.isInteger(classId) && classId > 0 ? classId : 0;
  const studentId = Number(params.studentId);
  const validStudentId =
    Number.isInteger(studentId) && studentId > 0 ? studentId : 0;

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast, showToast, hideToast } = useToast();

  /* -------- 加载详情 -------- */
  const loadDetail = useCallback(async () => {
    if (!validStudentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/students/${validStudentId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载失败");
      setStudent(data.student || null);
      setRecords(data.records || []);
    } catch (e) {
      showToast("error", (e as Error).message || "加载学生详情失败");
      setStudent(null);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [validStudentId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const tags = splitTags(student?.tags);

  /* ------------------------------ 渲染 ------------------------------ */

  return (
    <PageTransition className="mx-auto w-full max-w-5xl">
      {/* Toast */}
      <ToastContainer toast={toast} onClose={hideToast} />

      <div className="space-y-6">
        {/* 隐私提示 */}
        <PrivacyNotice />

        {/* 返回 + 标题 */}
        <header>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <MotionButton
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted transition hover:bg-accent hover:text-fg"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
              返回
            </MotionButton>
            <span aria-hidden>·</span>
            <Link
              href={
                validClassId
                  ? `/classes/${validClassId}/students`
                  : "/students"
              }
              className="rounded-md px-2 py-1 transition hover:bg-accent hover:text-fg"
            >
              {student?.class_name
                ? `${student.class_name} 学生列表`
                : "学生列表"}
            </Link>
          </div>
        </header>

        {loading ? (
          <LoadingView />
        ) : !student ? (
          <NotFoundState />
        ) : (
          <>
            {/* 基本信息卡片 */}
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start gap-4 sm:gap-6">
                {/* 头像 + 姓名 */}
                <div
                  aria-hidden
                  className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-primary/10 text-2xl font-bold text-primary sm:h-24 sm:w-24"
                >
                  {student.name?.[0] ?? "?"}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold text-fg">
                      {student.name}
                    </h1>
                    {student.gender && (
                      <span
                        className={[
                          "rounded-full px-2.5 py-0.5 text-xs font-medium",
                          student.gender === "男"
                            ? "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                            : "bg-pink-500/10 text-pink-600 dark:text-pink-400",
                        ].join(" ")}
                      >
                        {student.gender}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {tags.length > 0 ? (
                      tags.map((t, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                        >
                          {t}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted">暂无标签</span>
                    )}
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <InfoItem
                      label="所属班级"
                      value={
                        <Link
                          href={`/classes/${student.class_id}/students`}
                          className="inline-flex items-center gap-1 rounded-md px-1 -mx-1 transition hover:bg-primary/10 hover:text-primary"
                        >
                          {student.class_name}
                          <span className="text-xs text-muted">
                            （{student.class_grade}年级）
                          </span>
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-3 w-3 opacity-60"
                          >
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </Link>
                      }
                    />
                    <InfoItem
                      label="创建时间"
                      value={formatDateTime(student.created_at)}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* 历史沟通记录 */}
            <section>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-fg">
                    历史沟通记录
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    与该学生相关的全部家长沟通记录（按时间倒序，最多显示 50 条）
                  </p>
                </div>
                <Link
                  href="/generate"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-medium text-fg transition hover:bg-muted/30"
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
                  前往话术生成
                </Link>
              </div>

              {records.length === 0 ? (
                <RecordsEmptyState />
              ) : (
                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                  <ListStagger className="divide-y divide-border">
                    {records.map((r) => (
                      <StaggerItem key={r.id}>
                        <RecordCard item={r} />
                      </StaggerItem>
                    ))}
                  </ListStagger>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </PageTransition>
  );
}

/* ------------------------------ 子组件 ------------------------------ */

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-fg">{value}</div>
    </div>
  );
}

function RecordCard({ item }: { item: RecordItem }) {
  return (
    <Link
      href={`/records/${item.id}`}
      className="group flex flex-wrap items-center gap-3 px-4 py-3.5 transition hover:bg-muted/20 sm:px-5"
    >
      <div
        aria-hidden
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-fg"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <path d="M22 6l-10 7L2 6" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm leading-relaxed text-fg/85">
          {item.parent_message_summary || "（无家长消息内容）"}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-xs text-muted">{formatDateTime(item.created_at)}</div>
        <div className="mt-1 inline-flex items-center gap-1 text-xs text-primary transition group-hover:gap-1.5">
          查看详情
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

function LoadingView() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-4 sm:gap-6">
          <Skeleton className="h-20 w-20 shrink-0 rounded-2xl sm:h-24 sm:w-24" />
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-5 w-48" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        </div>
      </div>
      <div>
        <Skeleton className="h-6 w-36" />
        <div className="mt-3 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      <p className="text-base font-semibold text-fg">
        学生不存在或无权限访问
      </p>
      <p className="mt-2 text-sm text-muted">
        请返回学生列表，选择一位您有权限查看的学生。
      </p>
      <Link
        href="/students"
        className="mt-5 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-fg transition hover:bg-muted/30"
      >
        返回学生管理
      </Link>
    </div>
  );
}

function RecordsEmptyState() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-border bg-card">
      <div className="px-6 py-14 text-center sm:py-16">
        <div
          aria-hidden
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary"
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
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <path d="M22 6l-10 7L2 6" />
            <path d="M8 14h8" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-fg">暂无历史沟通记录</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          该学生目前还没有相关的家长沟通记录。前往「话术生成」页录入家长消息后，新生成的记录会自动关联到该学生，并出现在这里。
        </p>
        <Link
          href="/generate"
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
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          前往话术生成
        </Link>
      </div>
    </div>
  );
}
