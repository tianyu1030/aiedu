"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageTransition from "@/components/PageTransition";
import MotionButton from "@/components/MotionButton";
import ListStagger, { StaggerItem } from "@/components/ListStagger";
import Skeleton from "@/components/ui/Skeleton";
import { useToast, ToastContainer } from "@/hooks/useToast";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

/* ------------------------------ 类型 ------------------------------ */

interface ClassOption {
  id: number;
  name: string;
  grade: number;
}

interface RecordItem {
  id: number;
  student_id: number | null;
  student_name: string | null;
  parent_message_summary: string;
  created_at: string;
}

interface StudentOption {
  id: number;
  name: string;
}

/* ------------------------------ 工具 ------------------------------ */

const ALL_CLASSES_ID = 0;
const ALL_STUDENTS_ID = 0;

/* ------------------------------ 页面 ------------------------------ */

export default function RecordsPage() {
  const router = useRouter();

  // 数据
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(true);

  // 筛选
  const [selectedClassId, setSelectedClassId] = useState<number>(ALL_CLASSES_ID);
  const [selectedStudentId, setSelectedStudentId] = useState<number>(ALL_STUDENTS_ID);

  const { toast, showToast, hideToast } = useToast();

  /* -------- 加载班级 -------- */
  const loadClasses = useCallback(async () => {
    setLoadingClasses(true);
    try {
      const res = await fetch("/api/classes");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载班级失败");
      setClasses(data.classes || []);
    } catch (e) {
      showToast("error", (e as Error).message || "加载班级失败");
    } finally {
      setLoadingClasses(false);
    }
  }, []);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  /* -------- 加载记录列表 -------- */
  const loadRecords = useCallback(
    async (classId: number, studentId: number) => {
      setLoadingRecords(true);
      try {
        const params = new URLSearchParams();
        if (classId !== ALL_CLASSES_ID) params.set("classId", String(classId));
        if (studentId !== ALL_STUDENTS_ID) params.set("studentId", String(studentId));
        const qs = params.toString();
        const res = await fetch(`/api/records${qs ? `?${qs}` : ""}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "加载记录失败");
        setRecords(data.records || []);
      } catch (e) {
        showToast("error", (e as Error).message || "加载记录失败");
        setRecords([]);
      } finally {
        setLoadingRecords(false);
      }
    },
    []
  );

  // 初次加载（无筛选）
  useEffect(() => {
    void loadRecords(ALL_CLASSES_ID, ALL_STUDENTS_ID);
  }, [loadRecords]);

  /* -------- 班级变化：清空学生选择，用新班级重查 -------- */
  const handleClassChange = (classId: number) => {
    setSelectedClassId(classId);
    setSelectedStudentId(ALL_STUDENTS_ID);
    void loadRecords(classId, ALL_STUDENTS_ID);
  };

  /* -------- 学生变化：传入新 studentId 重查 -------- */
  const handleStudentChange = (studentId: number) => {
    setSelectedStudentId(studentId);
    void loadRecords(selectedClassId, studentId);
  };

  /* -------- 从当前 records 中提取可用学生选项（去重） -------- */
  const studentOptions: StudentOption[] = useMemo(() => {
    const map = new Map<number, string>();
    for (const r of records) {
      if (r.student_id != null && r.student_name) {
        if (!map.has(r.student_id)) map.set(r.student_id, r.student_name);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [records]);

  /* -------- 点击卡片进入详情 -------- */
  const goDetail = (id: number) => {
    router.push(`/records/${id}`);
  };

  /* ------------------------------ 渲染 ------------------------------ */

  return (
    <PageTransition className="mx-auto w-full max-w-5xl">
      {/* Toast */}
      <ToastContainer toast={toast} onClose={hideToast} />

      <div className="space-y-6">
        {/* 筛选区 */}
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="filter-class" className="mb-1.5 block text-sm font-medium text-fg">
                班级筛选
              </label>
              {loadingClasses ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <select
                  id="filter-class"
                  value={selectedClassId}
                  onChange={(e) => handleClassChange(Number(e.target.value))}
                  className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-fg outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value={ALL_CLASSES_ID}>全部班级</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}（{c.grade}年级）
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label htmlFor="filter-student" className="mb-1.5 block text-sm font-medium text-fg">
                学生筛选
              </label>
              {loadingRecords ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <select
                  id="filter-student"
                  value={selectedStudentId}
                  onChange={(e) => handleStudentChange(Number(e.target.value))}
                  disabled={studentOptions.length === 0}
                  className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-fg outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                >
                  <option value={ALL_STUDENTS_ID}>全部学生</option>
                  {studentOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
              {!loadingRecords && studentOptions.length === 0 && (
                <p className="mt-1 text-xs text-muted">
                  {selectedClassId === ALL_CLASSES_ID
                    ? "暂无记录"
                    : "该班级下暂无记录"}
                </p>
              )}
            </div>

            <div className="sm:col-span-2 flex items-end justify-end gap-2">
              <MotionButton
                onClick={() => {
                  setSelectedClassId(ALL_CLASSES_ID);
                  setSelectedStudentId(ALL_STUDENTS_ID);
                  void loadRecords(ALL_CLASSES_ID, ALL_STUDENTS_ID);
                }}
                className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-fg transition hover:bg-muted/30"
              >
                重置筛选
              </MotionButton>
            </div>
          </div>
        </section>

        {/* 列表区 */}
        <main>
          {loadingRecords ? (
            <LoadingList />
          ) : records.length === 0 ? (
            <EmptyState />
          ) : (
            <ListStagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {records.map((r) => (
                <StaggerItem key={r.id}>
                  <RecordCard item={r} onClick={() => goDetail(r.id)} />
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

function RecordCard({
  item,
  onClick,
}: {
  item: RecordItem;
  onClick: () => void;
}) {
  const hasStudent = item.student_id != null && item.student_name;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left h-full w-full rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30"
    >
      <div className="flex items-center justify-between gap-2">
        {hasStudent ? (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            {item.student_name}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-muted/30 px-2.5 py-0.5 text-xs font-medium text-muted">
            未关联学生
          </span>
        )}
        <span className="shrink-0 text-xs text-muted">
          {formatDateTime(item.created_at)}
        </span>
      </div>

      <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-fg/80">
        {item.parent_message_summary || "（无家长消息内容）"}
      </p>

      <div className="mt-4 flex items-center justify-between text-xs text-muted">
        <span>记录 #{item.id}</span>
        <span className="inline-flex items-center gap-1 text-primary transition group-hover:gap-1.5">
          查看详情
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
        </span>
      </div>
    </button>
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
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="mt-4 h-10 w-full" />
          <div className="mt-4 flex justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
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
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <path d="M22 6l-10 7L2 6" />
            <path d="M8 14h8" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-fg">
          暂无沟通记录
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          当前筛选条件下还没有任何沟通记录。您可以在「话术生成」页保存生成结果后，记录会自动出现在这里。
        </p>
      </div>
    </div>
  );
}
