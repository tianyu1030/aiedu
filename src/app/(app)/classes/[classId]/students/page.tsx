"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageTransition from "@/components/PageTransition";
import MotionButton from "@/components/MotionButton";
import ListStagger, { StaggerItem } from "@/components/ListStagger";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import Alert from "@/components/ui/Alert";
import { useToast, ToastContainer } from "@/hooks/useToast";
import PrivacyNotice from "@/components/PrivacyNotice";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

/* ------------------------------ 类型 ------------------------------ */

interface ClassItem {
  id: number;
  name: string;
  grade: number;
  created_at: string;
  studentCount: number;
}

interface StudentItem {
  id: number;
  class_id: number;
  name: string;
  gender: string | null;
  tags: string | null;
  created_at: string;
}

interface ImportPreviewRow {
  lineIndex: number;
  type: "ok" | "skip";
  display: string;
  reason?: string;
}

/* ------------------------------ 工具 ------------------------------ */

const GENDER_OPTIONS = [
  { value: "", label: "请选择" },
  { value: "男", label: "男" },
  { value: "女", label: "女" },
] as const;

const DEFAULT_IMPORT_TEXT = `张三,男,性格内向;近期成绩下滑
李四,女,
王五,,调皮好动;作业拖拉`;

/* 解析标签字符串为数组（逗号分隔，去重+去空） */
function splitTags(tagsStr: string | null | undefined): string[] {
  if (!tagsStr) return [];
  return tagsStr
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/* 解析单行导入文本（和后端 parseLine 行为一致，用于预览） */
function parseImportLine(rawLine: string, lineIndex: number): ImportPreviewRow {
  const line = rawLine.trim();
  if (!line) {
    return { lineIndex, type: "skip", display: "", reason: "空行已跳过" };
  }

  const firstComma = line.indexOf(",");
  if (firstComma === -1) {
    const name = line.trim();
    if (!name) {
      return { lineIndex, type: "skip", display: "", reason: "姓名缺失" };
    }
    if (name.length > 20) {
      return {
        lineIndex,
        type: "skip",
        display: name,
        reason: "姓名超过 20 个字符",
      };
    }
    return {
      lineIndex,
      type: "ok",
      display: `${name}（性别未填，无标签）`,
    };
  }

  const namePart = line.slice(0, firstComma).trim();
  const rest = line.slice(firstComma + 1);

  if (!namePart) {
    return { lineIndex, type: "skip", display: "", reason: "姓名缺失" };
  }
  if (namePart.length > 20) {
    return {
      lineIndex,
      type: "skip",
      display: namePart,
      reason: "姓名超过 20 个字符",
    };
  }

  const secondComma = rest.indexOf(",");
  let genderPart: string;
  let tagsPart: string;
  if (secondComma === -1) {
    genderPart = rest.trim();
    tagsPart = "";
  } else {
    genderPart = rest.slice(0, secondComma).trim();
    tagsPart = rest.slice(secondComma + 1).trim();
  }

  let gender = "未填";
  if (genderPart === "男" || genderPart === "女") {
    gender = genderPart;
  } else if (genderPart) {
    gender = "未填（原值非法，将置空）";
  }

  let tagsDisplay = "无标签";
  if (tagsPart) {
    const parts = tagsPart
      .split(";")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 0) {
      tagsDisplay = parts.join("、");
    }
  }

  return {
    lineIndex,
    type: "ok",
    display: `${namePart} · 性别：${gender} · 标签：${tagsDisplay}`,
  };
}

/* ------------------------------ 页面 ------------------------------ */

export default function ClassStudentsPage({
  params,
}: {
  params: { classId: string };
}) {
  const router = useRouter();
  const classId = Number(params.classId);
  const validClassId = Number.isInteger(classId) && classId > 0 ? classId : 0;

  // 班级信息
  const [classInfo, setClassInfo] = useState<ClassItem | null>(null);
  const [classLoading, setClassLoading] = useState(true);

  // 学生列表
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);

  const { toast, showToast, hideToast } = useToast(3200);

  // 新建/编辑弹窗
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StudentItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formGender, setFormGender] = useState<string>("");
  const [formTags, setFormTags] = useState("");
  const [formError, setFormError] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  // 删除确认弹窗
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<StudentItem | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // 批量导入弹窗
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState(DEFAULT_IMPORT_TEXT);
  const [importPreview, setImportPreview] = useState<ImportPreviewRow[] | null>(null);
  const [importSubmitting, setImportSubmitting] = useState(false);

  /* -------- 加载班级信息（从 /api/classes 获取，用于显示班级名） -------- */
  const loadClassInfo = useCallback(async () => {
    if (!validClassId) {
      setClassLoading(false);
      return;
    }
    setClassLoading(true);
    try {
      const res = await fetch("/api/classes");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载班级失败");
      const list = (data.classes || []) as ClassItem[];
      const found = list.find((c) => c.id === validClassId);
      if (!found) {
        showToast("error", "班级不存在或无权限访问");
      }
      setClassInfo(found || null);
    } catch (e) {
      showToast("error", (e as Error).message || "加载班级信息失败");
    } finally {
      setClassLoading(false);
    }
  }, [validClassId]);

  /* -------- 加载学生列表 -------- */
  const loadStudents = useCallback(async () => {
    if (!validClassId) {
      setStudentsLoading(false);
      return;
    }
    setStudentsLoading(true);
    try {
      const res = await fetch(`/api/students?classId=${validClassId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载失败");
      setStudents(data.students || []);
    } catch (e) {
      showToast("error", (e as Error).message || "加载学生列表失败");
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  }, [validClassId]);

  useEffect(() => {
    void loadClassInfo();
    void loadStudents();
  }, [loadClassInfo, loadStudents]);

  /* -------- 打开新建 -------- */
  const openCreate = () => {
    setEditing(null);
    setFormName("");
    setFormGender("");
    setFormTags("");
    setFormError("");
    setFormOpen(true);
  };

  /* -------- 打开编辑 -------- */
  const openEdit = (item: StudentItem) => {
    setEditing(item);
    setFormName(item.name);
    setFormGender(item.gender || "");
    setFormTags(item.tags || "");
    setFormError("");
    setFormOpen(true);
  };

  /* -------- 提交表单（新建/编辑） -------- */
  const submitForm = async () => {
    const name = formName.trim();
    if (!name) {
      setFormError("学生姓名不能为空");
      return;
    }
    if (name.length > 20) {
      setFormError("学生姓名不能超过 20 个字符");
      return;
    }
    setFormError("");
    setFormSubmitting(true);

    try {
      const gender = formGender === "" ? null : formGender;
      const tags = formTags.trim() || null;
      const payload: Record<string, unknown> = { name };
      if (editing) {
        // PUT 只传实际字段
        payload.gender = gender;
        payload.tags = tags;
      } else {
        // POST 需要 class_id
        payload.class_id = validClassId;
        payload.gender = gender;
        payload.tags = tags;
      }

      let res: Response;
      if (editing) {
        res = await fetch(`/api/students/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");

      showToast("success", editing ? "学生信息已更新" : "学生已添加");
      setFormOpen(false);
      void loadStudents();
      void loadClassInfo(); // 更新学生数统计
    } catch (e) {
      setFormError((e as Error).message || "保存失败");
    } finally {
      setFormSubmitting(false);
    }
  };

  /* -------- 打开删除确认 -------- */
  const openDelete = (item: StudentItem) => {
    setDeletingItem(item);
    setDeleteOpen(true);
  };

  /* -------- 确认删除 -------- */
  const confirmDelete = async () => {
    if (!deletingItem) return;
    setDeleteSubmitting(true);
    try {
      const res = await fetch(`/api/students/${deletingItem.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "删除失败");
      showToast("success", "学生已删除");
      setDeleteOpen(false);
      setDeletingItem(null);
      void loadStudents();
      void loadClassInfo();
    } catch (e) {
      showToast("error", (e as Error).message || "删除失败");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  /* -------- 打开导入弹窗（重置预览） -------- */
  const openImport = () => {
    setImportPreview(null);
    setImportOpen(true);
  };

  /* -------- 解析预览 -------- */
  const runParsePreview = () => {
    const lines = importText.split(/\r?\n/);
    const preview: ImportPreviewRow[] = lines.map((l, i) =>
      parseImportLine(l, i + 1)
    );
    setImportPreview(preview);
  };

  /* -------- 预览统计 -------- */
  const previewStat = useMemo(() => {
    if (!importPreview) return null;
    let ok = 0;
    let skip = 0;
    for (const p of importPreview) {
      if (p.type === "ok") ok++;
      else skip++;
    }
    return { ok, skip };
  }, [importPreview]);

  /* -------- 确认导入 -------- */
  const confirmImport = async () => {
    setImportSubmitting(true);
    try {
      const res = await fetch("/api/students/batch-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ class_id: validClassId, text: importText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "导入失败");

      const successCount = Number(data.successCount ?? 0);
      const skipCount = Number(data.skipCount ?? 0);
      const parts: string[] = [];
      if (successCount > 0) parts.push(`成功导入 ${successCount} 人`);
      if (skipCount > 0) parts.push(`跳过 ${skipCount} 行`);

      const importMsg = parts.join("，") || "未导入任何数据";
      const skippedDesc =
        skipCount > 0 && data.skippedRows?.length
          ? data.skippedRows
              .slice(0, 5)
              .map(
                (r: { lineIndex: number; reason: string }) =>
                  `第${r.lineIndex === -1 ? "?" : r.lineIndex}行：${r.reason}`
              )
              .join("；") + (data.skippedRows.length > 5 ? "…" : "")
          : "";
      showToast(
        successCount > 0 ? "success" : "info",
        skippedDesc ? `${importMsg}（${skippedDesc}）` : importMsg
      );

      setImportOpen(false);
      setImportPreview(null);
      void loadStudents();
      void loadClassInfo();
    } catch (e) {
      showToast("error", (e as Error).message || "导入失败");
    } finally {
      setImportSubmitting(false);
    }
  };

  /* -------- 点击学生进入详情 -------- */
  const goDetail = (sid: number) => {
    router.push(`/classes/${validClassId}/students/${sid}`);
  };

  /* ------------------------------ 渲染 ------------------------------ */

  const displayClassName = classInfo
    ? `${classInfo.name}${classLoading ? "" : ""}`
    : classLoading
      ? "加载中…"
      : "未知班级";

  return (
    <PageTransition className="mx-auto w-full max-w-5xl">
      {/* Toast */}
      <ToastContainer toast={toast} onClose={hideToast} />

      <div className="space-y-6">
        {/* 隐私提示 */}
        <PrivacyNotice />

        {/* 顶部标题 + 操作按钮 */}
        <header>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <Link
              href="/classes"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 transition hover:bg-accent hover:text-fg"
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
              返回班级列表
            </Link>
            <span aria-hidden>·</span>
            <Link
              href="/students"
              className="rounded-md px-2 py-1 transition hover:bg-accent hover:text-fg"
            >
              学生管理首页
            </Link>
          </div>

          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-fg">
                {displayClassName} 学生管理
              </h1>
              <p className="mt-2 text-sm text-muted">
                {classInfo && classInfo.grade
                  ? `${classInfo.grade} 年级 · 共 ${studentsLoading ? "…" : students.length} 名学生`
                  : "管理该班级学生信息，支持添加、编辑、删除与批量导入。"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <MotionButton
                onClick={openImport}
                disabled={!classInfo}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-fg transition hover:bg-muted/30 disabled:opacity-60"
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
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                批量导入
              </MotionButton>
              <MotionButton
                onClick={openCreate}
                disabled={!classInfo}
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
                添加学生
              </MotionButton>
            </div>
          </div>
        </header>

        {/* 学生列表 */}
        <main>
          {studentsLoading || classLoading ? (
            <LoadingList />
          ) : !classInfo ? (
            <ClassNotFoundState />
          ) : students.length === 0 ? (
            <EmptyState onCreate={openCreate} />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <ListStagger className="divide-y divide-border">
                {students.map((s) => (
                  <StaggerItem key={s.id}>
                    <StudentRow
                      item={s}
                      onView={() => goDetail(s.id)}
                      onEdit={() => openEdit(s)}
                      onDelete={() => openDelete(s)}
                    />
                  </StaggerItem>
                ))}
              </ListStagger>
            </div>
          )}
        </main>
      </div>

      {/* 新建/编辑 弹窗 */}
      <Modal
        open={formOpen}
        onClose={() => !formSubmitting && setFormOpen(false)}
        title={editing ? "编辑学生" : "添加学生"}
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submitForm();
          }}
        >
          <div>
            <label htmlFor="student-form-name" className="mb-1.5 block text-sm font-medium text-fg">
              姓名 <span className="text-rose-500">*</span>
            </label>
            <input
              id="student-form-name"
              type="text"
              maxLength={20}
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="请输入学生姓名，最多 20 字"
              className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-fg outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
            <p className="mt-1 text-xs text-muted">{formName.length}/20</p>
          </div>

          <div>
            <label htmlFor="student-form-gender" className="mb-1.5 block text-sm font-medium text-fg">
              性别
            </label>
            <select
              id="student-form-gender"
              value={formGender}
              onChange={(e) => setFormGender(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-fg outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {GENDER_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="student-form-tags" className="mb-1.5 block text-sm font-medium text-fg">
              标签
            </label>
            <input
              id="student-form-tags"
              type="text"
              value={formTags}
              onChange={(e) => setFormTags(e.target.value)}
              placeholder="多个标签用逗号分隔，例如：调皮好动,作业拖拉"
              className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-fg outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <p className="mt-1 text-xs text-muted">
              多个标签用逗号分隔，便于之后快速了解学生情况
            </p>
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
              {formSubmitting
                ? "保存中…"
                : editing
                  ? "保存修改"
                  : "添加学生"}
            </MotionButton>
          </div>
        </form>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        open={deleteOpen}
        onClose={() => !deleteSubmitting && setDeleteOpen(false)}
        title="确认删除学生"
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-400">
            <p className="font-semibold">⚠ 删除学生信息</p>
            <p className="mt-2 leading-relaxed">
              学生「
              <span className="font-medium">{deletingItem?.name}</span>
              」的信息将被删除，沟通记录将保留但不再关联该学生。此操作不可撤销。
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

      {/* 批量导入弹窗 */}
      <Modal
        open={importOpen}
        onClose={() => !importSubmitting && setImportOpen(false)}
        title="批量导入学生"
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="student-import-text" className="mb-1.5 block text-sm font-medium text-fg">
              粘贴学生数据
            </label>
            <textarea
              id="student-import-text"
              value={importText}
              onChange={(e) => {
                setImportText(e.target.value);
                setImportPreview(null); // 文本变化后清空旧预览
              }}
              rows={8}
              placeholder={`每行一位学生，格式为：姓名,性别,标签1;标签2\n例如：\n张三,男,性格内向;近期成绩下滑\n李四,女,\n王五,,调皮好动;作业拖拉`}
              className="w-full resize-y rounded-xl border border-border bg-bg px-3.5 py-2.5 font-mono text-sm text-fg outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <p className="mt-1 text-xs text-muted">
              格式：姓名,性别,标签1;标签2（性别男/女/留空，多个标签用分号分隔）
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <MotionButton
              type="button"
              onClick={runParsePreview}
              disabled={importSubmitting}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-fg transition hover:bg-muted/30 disabled:opacity-60"
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
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              解析预览
            </MotionButton>
            {importPreview && previewStat && (
              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-emerald-600 dark:text-emerald-400">
                  ✓ 成功 {previewStat.ok}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-amber-600 dark:text-amber-400">
                  ! 跳过 {previewStat.skip}
                </span>
              </div>
            )}
          </div>

          {importPreview && (
            <div className="max-h-56 overflow-auto rounded-xl border border-border bg-bg p-3">
              <ul className="space-y-1.5 text-sm">
                {importPreview.map((p, idx) => (
                  <li
                    key={idx}
                    className={`flex items-start gap-2 rounded-lg px-2 py-1 ${
                      p.type === "ok"
                        ? ""
                        : "bg-amber-500/5 text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    <span className="mt-0.5 shrink-0 font-mono text-xs text-muted">
                      L{p.lineIndex}
                    </span>
                    {p.type === "ok" ? (
                      <span className="text-fg">{p.display}</span>
                    ) : (
                      <span>
                        跳过：{p.reason}
                        {p.display && (
                          <span className="text-muted">
                            {" "}（内容：{p.display}）
                          </span>
                        )}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <MotionButton
              type="button"
              onClick={() => setImportOpen(false)}
              disabled={importSubmitting}
              className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-fg transition hover:bg-muted/30 disabled:opacity-60"
            >
              取消
            </MotionButton>
            <MotionButton
              type="button"
              onClick={() => void confirmImport()}
              disabled={importSubmitting || !importPreview}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-fg transition hover:brightness-105 disabled:opacity-60"
            >
              {importSubmitting
                ? "导入中…"
                : importPreview
                  ? "确认导入"
                  : "请先解析预览"}
            </MotionButton>
          </div>
        </div>
      </Modal>
    </PageTransition>
  );
}

/* ------------------------------ 子组件 ------------------------------ */

function StudentRow({
  item,
  onView,
  onEdit,
  onDelete,
}: {
  item: StudentItem;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tags = splitTags(item.tags);
  return (
    <div className="group flex flex-wrap items-center gap-3 px-4 py-3.5 transition hover:bg-muted/20 sm:px-5">
      {/* 基本信息：点击进入详情 */}
      <button
        type="button"
        onClick={onView}
        className="group/name flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <div
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
        >
          {item.name?.[0] ?? "?"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold text-fg group-hover/name:text-primary">
              {item.name}
            </span>
            {item.gender && (
              <span
                className={[
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  item.gender === "男"
                    ? "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                    : "bg-pink-500/10 text-pink-600 dark:text-pink-400",
                ].join(" ")}
              >
                {item.gender}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {tags.length > 0 ? (
              tags.map((t, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-full bg-muted/40 px-2 py-0.5 text-xs text-fg/75"
                >
                  {t}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted">暂无标签</span>
            )}
          </div>
        </div>
        <div className="hidden shrink-0 text-right text-xs text-muted sm:block">
          <div>创建时间</div>
          <div className="mt-0.5">{formatDateTime(item.created_at)}</div>
        </div>
      </button>

      {/* 操作按钮 */}
      <div className="flex shrink-0 items-center gap-1.5">
        <MotionButton
          type="button"
          onClick={onView}
          className="rounded-lg border border-border bg-bg px-3 py-1.5 text-xs font-medium text-fg transition hover:border-primary/40 hover:text-primary"
        >
          详情
        </MotionButton>
        <MotionButton
          type="button"
          onClick={onEdit}
          className="rounded-lg border border-border bg-bg px-3 py-1.5 text-xs font-medium text-fg transition hover:border-primary/40 hover:text-primary"
        >
          编辑
        </MotionButton>
        <MotionButton
          type="button"
          onClick={onDelete}
          className="rounded-lg border border-rose-200/60 bg-rose-500/5 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-500/10 dark:text-rose-400"
        >
          删除
        </MotionButton>
      </div>
    </div>
  );
}

function LoadingList() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-border px-4 py-3.5 last:border-b-0 sm:px-5"
        >
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="hidden h-8 w-16 sm:block" />
          <Skeleton className="h-8 w-14" />
          <Skeleton className="h-8 w-14" />
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
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-fg">该班级还没有学生</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          可以添加单个学生，或使用「批量导入」一次粘贴多位学生信息（Excel/表格中的名单可直接粘贴）。
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
          添加首位学生
        </MotionButton>
      </div>
    </div>
  );
}

function ClassNotFoundState() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      <p className="text-base font-semibold text-fg">班级不存在或无权限访问</p>
      <p className="mt-2 text-sm text-muted">
        请返回班级列表，选择一个您有权限的班级。
      </p>
      <Link
        href="/classes"
        className="mt-5 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-fg transition hover:bg-muted/30"
      >
        返回班级列表
      </Link>
    </div>
  );
}
