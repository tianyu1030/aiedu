"use client";

import { useCallback, useEffect, useState } from "react";
import PageTransition from "@/components/PageTransition";
import MotionButton from "@/components/MotionButton";
import ListStagger, { StaggerItem } from "@/components/ListStagger";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import Alert from "@/components/ui/Alert";
import { useToast, ToastContainer } from "@/hooks/useToast";
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

/* ------------------------------ 工具 ------------------------------ */

const GRADE_OPTIONS = [1, 2, 3, 4, 5, 6] as const;

/* ------------------------------ 页面 ------------------------------ */

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast, showToast, hideToast } = useToast();

  // 新建/编辑弹窗
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClassItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formGrade, setFormGrade] = useState<number>(1);
  const [formError, setFormError] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  // 删除确认弹窗
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<ClassItem | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  /* -------- 加载列表 -------- */
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

  /* -------- 打开新建 -------- */
  const openCreate = () => {
    setEditing(null);
    setFormName("");
    setFormGrade(1);
    setFormError("");
    setFormOpen(true);
  };

  /* -------- 打开编辑 -------- */
  const openEdit = (item: ClassItem) => {
    setEditing(item);
    setFormName(item.name);
    setFormGrade(item.grade);
    setFormError("");
    setFormOpen(true);
  };

  /* -------- 提交表单（新建/编辑） -------- */
  const submitForm = async () => {
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
      const payload = { name, grade: formGrade };
      let res: Response;
      if (editing) {
        res = await fetch(`/api/classes/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/classes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      showToast("success", editing ? "班级已更新" : "班级创建成功");
      setFormOpen(false);
      void loadClasses();
    } catch (e) {
      setFormError((e as Error).message || "保存失败");
    } finally {
      setFormSubmitting(false);
    }
  };

  /* -------- 打开删除确认 -------- */
  const openDelete = (item: ClassItem) => {
    setDeletingItem(item);
    setDeleteOpen(true);
  };

  /* -------- 确认删除 -------- */
  const confirmDelete = async () => {
    if (!deletingItem) return;
    setDeleteSubmitting(true);
    try {
      const res = await fetch(`/api/classes/${deletingItem.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "删除失败");
      showToast("success", "班级已删除");
      setDeleteOpen(false);
      setDeletingItem(null);
      void loadClasses();
    } catch (e) {
      showToast("error", (e as Error).message || "删除失败");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  /* ------------------------------ 渲染 ------------------------------ */

  return (
    <PageTransition className="mx-auto w-full max-w-5xl">
      {/* Toast */}
      <ToastContainer toast={toast} onClose={hideToast} />

      <div className="space-y-6">
        {/* 顶部标题 + 新建按钮 */}
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

        {/* 列表区 */}
        <main>
          {loading ? (
            <LoadingList />
          ) : classes.length === 0 ? (
            <EmptyState onCreate={openCreate} />
          ) : (
            <ListStagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {classes.map((c) => (
                <StaggerItem key={c.id}>
                  <ClassCard
                    item={c}
                    onEdit={() => openEdit(c)}
                    onDelete={() => openDelete(c)}
                  />
                </StaggerItem>
              ))}
            </ListStagger>
          )}
        </main>
      </div>

      {/* 新建/编辑 弹窗 */}
      <Modal
        open={formOpen}
        onClose={() => !formSubmitting && setFormOpen(false)}
        title={editing ? "编辑班级" : "新建班级"}
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submitForm();
          }}
        >
          <div>
            <label htmlFor="class-form-name" className="mb-1.5 block text-sm font-medium text-fg">
              班级名称
            </label>
            <input
              id="class-form-name"
              type="text"
              maxLength={30}
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="如：三年级（2）班"
              className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-fg outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
            <p className="mt-1 text-xs text-muted">
              {formName.length}/30
            </p>
          </div>
          <div>
            <label htmlFor="class-form-grade" className="mb-1.5 block text-sm font-medium text-fg">
              年级
            </label>
            <select
              id="class-form-grade"
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

          {formError && (
            <Alert type="error" message={formError} />
          )}

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
              {formSubmitting
                ? "保存中…"
                : editing
                  ? "保存修改"
                  : "创建班级"}
            </MotionButton>
          </div>
        </form>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        open={deleteOpen}
        onClose={() => !deleteSubmitting && setDeleteOpen(false)}
        title="确认删除"
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-400">
            <p className="font-semibold">⚠ 删除班级后不可恢复</p>
            <p className="mt-2 leading-relaxed">
              班级「
              <span className="font-medium">{deletingItem?.name}</span>
              」下所有学生与沟通记录将一并删除，此操作不可撤销。
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <MotionButton
              type="button"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteSubmitting}
              className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-fg transition hover:bg-muted/30 disabled:opacity-60"
            >
              取消
            </MotionButton>
            <MotionButton
              type="button"
              onClick={() => void confirmDelete()}
              disabled={deleteSubmitting}
              className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {deleteSubmitting ? "删除中…" : "确定删除"}
            </MotionButton>
          </div>
        </div>
      </Modal>
    </PageTransition>
  );
}

/* ------------------------------ 子组件 ------------------------------ */

function ClassCard({
  item,
  onEdit,
  onDelete,
}: {
  item: ClassItem;
  onEdit: () => void;
  onDelete: () => void;
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

      <div className="mt-5 flex gap-2">
        <MotionButton
          onClick={onEdit}
          className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-xs font-medium text-fg transition hover:border-primary/40 hover:text-primary"
        >
          编辑
        </MotionButton>
        <MotionButton
          onClick={onDelete}
          className="flex-1 rounded-lg border border-rose-200/60 bg-rose-500/5 px-3 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-500/10 dark:text-rose-400"
        >
          删除
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

function EmptyState({ onCreate }: { onCreate: () => void }) {
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
            <path d="M3 9l9-6 9 6v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
            <path d="M9 22V12h6v10" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-fg">
          还没有任何班级
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          创建您的第一个班级，开始管理学生与家长沟通记录。每个班级可以包含多名学生。
        </p>
        <MotionButton
          onClick={onCreate}
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
          新建班级
        </MotionButton>
      </div>
    </div>
  );
}
