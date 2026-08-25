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
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

/* ------------------------------ 类型 ------------------------------ */

interface ClassItem {
  id: number;
  name: string;
  grade: number;
  created_at: string;
  studentCount: number;
}

/* ------------------------------ 页面 ------------------------------ */

export default function StudentClassSelectPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast, showToast, hideToast } = useToast();

  /* -------- 加载班级列表 -------- */
  const loadClasses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/classes");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载失败");
      setClasses(data.classes || []);
    } catch (e) {
      showToast("error", (e as Error).message || "加载班级失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  /* -------- 进入班级学生列表 -------- */
  const goStudents = (classId: number) => {
    router.push(`/classes/${classId}/students`);
  };

  /* ------------------------------ 渲染 ------------------------------ */

  return (
    <PageTransition className="mx-auto w-full max-w-5xl">
      {/* Toast */}
      <ToastContainer toast={toast} onClose={hideToast} />

      <div className="space-y-6">
        {/* 隐私提示 */}
        <PrivacyNotice />

        {/* 顶部标题 */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <MotionButton
            onClick={() => router.push("/classes")}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-fg transition hover:bg-muted/30"
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
              <path d="M3 9l9-6 9 6v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
              <path d="M9 22V12h6v10" />
            </svg>
            去班级管理
          </MotionButton>
        </header>

        {/* 班级卡片列表 */}
        <main>
          {loading ? (
            <LoadingList />
          ) : classes.length === 0 ? (
            <EmptyState />
          ) : (
            <ListStagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {classes.map((c) => (
                <StaggerItem key={c.id}>
                  <ClassCard item={c} onEnter={() => goStudents(c.id)} />
                </StaggerItem>
              ))}
            </ListStagger>
          )}
        </main>
      </div>
    </PageTransition>
  );
}

/* ------------------------------ 子组件 ------------------------------ */

function ClassCard({
  item,
  onEnter,
}: {
  item: ClassItem;
  onEnter: () => void;
}) {
  return (
    <article className="group h-full rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-fg">
            {item.name}
          </h3>
          <div className="mt-1 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            {item.grade} 年级
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stat label="学生数" value={`${item.studentCount} 人`} />
        <Stat label="创建时间" value={formatDate(item.created_at)} />
      </div>

      <div className="mt-5">
        <MotionButton
          onClick={onEnter}
          className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-fg transition hover:brightness-105"
        >
          <span className="inline-flex items-center justify-center gap-2">
            查看学生
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </span>
        </MotionButton>
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-fg">{value}</div>
    </div>
  );
}

function LoadingList() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border bg-card p-5"
        >
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="mt-2 h-5 w-20" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
          <Skeleton className="mt-5 h-9 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-border bg-card">
      <div className="px-6 py-16 text-center sm:py-20">
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
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-fg">还没有任何班级</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          请先前往「班级管理」创建班级，创建完成后即可在「学生管理」中添加该班级的学生信息。
        </p>
        <Link
          href="/classes"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-fg shadow-sm transition hover:brightness-105"
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
          去新建班级
        </Link>
      </div>
    </div>
  );
}
