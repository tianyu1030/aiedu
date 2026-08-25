"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { MotionButton } from "@/components/motion";
import { FadeIn, StaggerList, StaggerItem } from "@/components/motion";
import PrivacyNotice from "@/components/PrivacyNotice";
import QuoteOfDay from "@/components/QuoteOfDay";
import Modal from "@/components/ui/Modal";
import { useToast, ToastContainer } from "@/hooks/useToast";
import Skeleton from "@/components/ui/Skeleton";

/* ------------------------------ 类型定义 ------------------------------ */

interface ClassOption {
  id: number;
  name: string;
  grade: number;
  studentCount: number;
}

interface StudentOption {
  id: number;
  class_id: number;
  name: string;
  gender: string | null;
  tags: string | null;
}

interface GeneratedResult {
  scripts: string[];
  strategy: string;
  risks: string[];
}

/* ------------------------------ 小工具 ------------------------------ */

async function apiFetch<T = any>(
  url: string,
  options?: RequestInit
): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const resp = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    const json = (await resp.json()) as any;
    if (!resp.ok) {
      return { ok: false, error: json?.error || `请求失败（${resp.status}）` };
    }
    return { ok: true, data: json };
  } catch (err: any) {
    return { ok: false, error: err?.message || "网络错误" };
  }
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/* ------------------------------ 加载骨架 ------------------------------ */

function ResultSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-28 w-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-28 w-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-28 w-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}

/* ------------------------------ 主页面 ------------------------------ */

export const dynamic = "force-dynamic";

export default function GeneratePage() {
  /* ------------------ 选择器状态 ------------------ */
  const [classes, setClasses] = useState<ClassOption[] | null>(null);
  const [classesError, setClassesError] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | "">("");

  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | "">("");

  /* ------------------ 输入状态 ------------------ */
  const [parentMessage, setParentMessage] = useState("");
  const MAX_MESSAGE = 5000;
  const messageLen = parentMessage.length;

  /* ------------------ 生成状态 ------------------ */
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedResult | null>(null);

  /* ------------------ 结果编辑态 ------------------ */
  const [editableScripts, setEditableScripts] = useState<string[]>([]);
  const [editableStrategy, setEditableStrategy] = useState("");
  const [editableRisks, setEditableRisks] = useState<string[]>([]);

  /* ------------------ 复制反馈 ------------------ */
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  /* ------------------ 保存记录 ------------------ */
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);

  /* ------------------ Toast ------------------ */
  const { toast, showToast, hideToast } = useToast(3200);

  /* ------------------ 拉取班级列表 ------------------ */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await apiFetch<{ classes: ClassOption[] }>(
        "/api/classes",
        { method: "GET" }
      );
      if (cancelled) return;
      if (!res.ok) {
        setClassesError(res.error || "获取班级列表失败");
        setClasses([]);
        return;
      }
      setClasses(res.data?.classes ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ------------------ 班级变更 → 拉取学生 ------------------ */
  useEffect(() => {
    // 班级为空 → 清空学生
    if (selectedClassId === "") {
      setStudents([]);
      setSelectedStudentId("");
      return;
    }
    let cancelled = false;
    setStudentsLoading(true);
    (async () => {
      const res = await apiFetch<{ students: StudentOption[] }>(
        `/api/students?classId=${selectedClassId}`,
        { method: "GET" }
      );
      if (cancelled) return;
      setStudentsLoading(false);
      if (!res.ok) {
        setStudents([]);
        showToast("error", `获取学生列表失败${res.error ? `：${res.error}` : ""}`);
        return;
      }
      setStudents(res.data?.students ?? []);
      setSelectedStudentId("");
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedClassId]);

  /* ------------------ 生成话术 ------------------ */
  async function handleGenerate() {
    if (generating) return;
    if (!parentMessage.trim()) {
      showToast("error", "请先输入家长消息");
      return;
    }
    if (messageLen > MAX_MESSAGE) {
      showToast("error", `家长消息不能超过 ${MAX_MESSAGE} 字符`);
      return;
    }

    setGenerating(true);
    setGenerateError(null);
    setResult(null);

    const body: Record<string, unknown> = { parentMessage };
    if (selectedStudentId !== "") {
      body.studentId = selectedStudentId;
    }

    const res = await apiFetch<{ data: GeneratedResult }>("/api/generate", {
      method: "POST",
      body: JSON.stringify(body),
    });

    setGenerating(false);

    if (!res.ok) {
      setGenerateError(res.error || "生成失败");
      showToast("error", `生成话术失败${res.error ? `：${res.error}` : ""}`);
      return;
    }

    const data = res.data?.data;
    if (!data || !Array.isArray(data.scripts) || data.scripts.length === 0) {
      setGenerateError("返回内容为空，请重试");
      showToast("error", "返回内容为空，请重试");
      return;
    }

    setResult(data);
    setEditableScripts([...data.scripts]);
    setEditableStrategy(data.strategy || "");
    setEditableRisks([...(data.risks || [])]);
  }

  /* ------------------ 话术编辑 / 复制 ------------------ */
  function updateScript(idx: number, value: string) {
    setEditableScripts((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  }

  async function handleCopy(idx: number) {
    const text = editableScripts[idx] ?? "";
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedIdx(idx);
      showToast("success", `已复制话术 ${idx + 1}`);
      setTimeout(() => setCopiedIdx((cur) => (cur === idx ? null : cur)), 1400);
    } else {
      showToast("error", "复制失败，请手动复制");
    }
  }

  /* ------------------ 保存沟通记录 ------------------ */
  function openSaveModal() {
    if (!result) {
      showToast("info", "请先生成话术再保存");
      return;
    }
    setFollowUp("");
    setSavedId(null);
    setSaveModalOpen(true);
  }

  async function handleSaveConfirm() {
    if (!result) return;
    setSaving(true);
    const reply = editableScripts.join("\n\n---\n\n");
    const risks = editableRisks.join("\n");
    const body: Record<string, unknown> = {
      parentMessage,
      reply,
      strategy: editableStrategy,
      risks: risks.length > 0 ? risks : null,
    };
    if (followUp.trim().length > 0) {
      body.result = followUp;
    }
    if (selectedStudentId !== "") {
      body.studentId = selectedStudentId;
    }

    const res = await apiFetch<{ id: number }>("/api/records/create", {
      method: "POST",
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      showToast("error", `保存失败${res.error ? `：${res.error}` : ""}`);
      return;
    }
    const id = res.data?.id;
    setSavedId(id ?? null);
    setSaveModalOpen(false);
    showToast("success", id ? "已保存为沟通记录" : "已保存为沟通记录（未能获取记录 ID）");
  }

  /* ------------------ 派生：风险是否含解析异常 ------------------ */
  const hasParseRisk = useMemo(() => {
    return editableRisks.some((r) => /解析异常|解析失败/.test(r ?? ""));
  }, [editableRisks]);

  /* ------------------ 渲染 ------------------ */
  return (
    <PageTransition className="space-y-5">
      <PrivacyNotice />
      <QuoteOfDay />

      {/* 主体：左右布局（移动端上下堆叠） */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* 左：输入区 */}
        <FadeIn className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-fg">
              1. 填写信息
            </h2>

            {/* 关联学生：班级 */}
            <div className="space-y-1.5">
              <label htmlFor="generate-class-select" className="text-sm font-medium text-fg">
                关联学生（可选）
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-muted mb-1">先选班级</div>
                  <select
                    id="generate-class-select"
                    value={selectedClassId}
                    onChange={(e) =>
                      setSelectedClassId(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                    disabled={classes === null}
                  >
                    <option value="">不关联</option>
                    {(classes ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}（{c.grade}年级 · {c.studentCount}人）
                      </option>
                    ))}
                  </select>
                  {classesError && (
                    <div className="mt-1 text-xs text-rose-500">
                      {classesError}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-muted mb-1">再选学生</div>
                  <select
                    id="generate-student-select"
                    value={selectedStudentId}
                    onChange={(e) =>
                      setSelectedStudentId(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    disabled={
                      selectedClassId === "" ||
                      studentsLoading ||
                      students.length === 0
                    }
                    className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                  >
                    <option value="">不关联具体学生</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.gender ? `（${s.gender}）` : ""}
                        {s.tags ? ` · ${s.tags}` : ""}
                      </option>
                    ))}
                  </select>
                  {studentsLoading && (
                    <div className="mt-1 text-xs text-muted">加载中…</div>
                  )}
                </div>
              </div>
            </div>

            {/* 家长消息 */}
            <div className="mt-5 space-y-1.5">
              <label htmlFor="generate-parent-message" className="text-sm font-medium text-fg">
                2. 家长消息
                <span className="ml-1 text-xs font-normal text-muted">
                  （Ctrl/⌘ + Enter 快捷生成）
                </span>
              </label>
              <textarea
                id="generate-parent-message"
                value={parentMessage}
                onChange={(e) => setParentMessage(e.target.value.slice(0, MAX_MESSAGE))}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                    e.preventDefault();
                    void handleGenerate();
                  }
                }}
                maxLength={MAX_MESSAGE}
                rows={10}
                placeholder={
                  "粘贴家长发来的消息…\n例如：老师，我家孩子在学校被同学打了，你们到底怎么管的？"
                }
                className="w-full resize-y rounded-xl border border-border bg-bg px-3 py-2.5 text-sm leading-relaxed text-fg outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <div className="flex items-center justify-between text-xs text-muted">
                <span>建议粘贴家长原话，越完整效果越好</span>
                <span
                  className={
                    messageLen > MAX_MESSAGE - 100
                      ? "text-amber-500"
                      : ""
                  }
                >
                  {messageLen} / {MAX_MESSAGE}
                </span>
              </div>
            </div>

            {/* 生成按钮 */}
            <div className="mt-5">
              <MotionButton
                type="button"
                onClick={handleGenerate}
                disabled={generating || !parentMessage.trim()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-fg shadow-md transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generating ? (
                  <>
                    <motion.span
                      aria-hidden
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 0.9,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="inline-block h-4 w-4 rounded-full border-2 border-primary-fg/30 border-t-primary-fg"
                    />
                    正在生成话术…
                  </>
                ) : (
                  <>✨ 生成话术</>
                )}
              </MotionButton>
              {generateError && (
                <div className="mt-2 text-xs text-rose-500">
                  生成失败：{generateError}
                </div>
              )}
            </div>
          </div>
        </FadeIn>

        {/* 右：结果区 */}
        <FadeIn delay={0.05}>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm min-h-[480px]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-fg">
                3. 生成结果
              </h2>
              {result && (
                <span className="text-xs text-muted">
                  生成 {editableScripts.length} 条话术 · 可编辑后保存
                </span>
              )}
            </div>

            {/* 加载中 */}
            {generating && (
              <div className="py-2">
                <ResultSkeleton />
              </div>
            )}

            {/* 无结果占位 */}
            {!generating && !result && (
              <EmptyResultPlaceholder />
            )}

            {/* 结果展示 */}
            <AnimatePresence mode="wait">
              {!generating && result && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="space-y-4"
                >
                  {/* 话术卡片 1-3 条 */}
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-fg">
                      回复话术（可编辑）
                    </h3>
                    <StaggerList className="space-y-3">
                      {editableScripts.map((s, idx) => (
                        <StaggerItem
                          key={idx}
                          className="rounded-xl border border-border bg-bg/60 p-4 shadow-sm"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              话术 {idx + 1}
                              {hasParseRisk && idx === 0 && (
                                <span className="text-amber-600 ml-1">
                                  · 建议人工审查
                                </span>
                              )}
                            </span>
                            <MotionButton
                              type="button"
                              onClick={() => handleCopy(idx)}
                              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-fg hover:bg-accent/60 disabled:opacity-50"
                            >
                              {copiedIdx === idx ? "✓ 已复制" : "📋 复制文案"}
                            </MotionButton>
                          </div>
                          <textarea
                            value={s}
                            onChange={(e) => updateScript(idx, e.target.value)}
                            rows={6}
                            placeholder="生成的话术内容…"
                            className="w-full resize-y rounded-xl border border-border bg-bg px-3 py-2 text-sm leading-relaxed text-fg outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
                          />
                        </StaggerItem>
                      ))}
                    </StaggerList>
                  </section>

                  {/* 沟通策略 */}
                  <section>
                    <h3 className="mb-2 text-sm font-semibold text-fg">
                      沟通策略
                    </h3>
                    <textarea
                      value={editableStrategy}
                      onChange={(e) => setEditableStrategy(e.target.value)}
                      rows={4}
                      placeholder="沟通策略提示…"
                      className="w-full resize-y rounded-xl border border-border bg-bg px-3 py-2 text-sm leading-relaxed text-fg outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </section>

                  {/* 风险提示 */}
                  <section>
                    <h3 className="mb-2 text-sm font-semibold text-fg">
                      风险提示
                    </h3>
                    <textarea
                      value={editableRisks.join("\n")}
                      onChange={(e) =>
                        setEditableRisks(
                          e.target.value
                            .split(/\r?\n/)
                            .map((l) => l.trim())
                            .filter(Boolean)
                        )
                      }
                      rows={4}
                      placeholder="风险点，每行一条…"
                      className="w-full resize-y rounded-lg border border-amber-400/40 bg-amber-50/80 px-3 py-2 text-sm leading-relaxed text-fg outline-none transition placeholder:text-amber-700/60 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    />
                  </section>

                  {/* 保存按钮 */}
                  <div className="pt-2">
                    <MotionButton
                      type="button"
                      onClick={openSaveModal}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-md transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      💾 保存为沟通记录
                    </MotionButton>
                    {savedId !== null && (
                      <div className="mt-2 text-xs text-emerald-600">
                        <Link
                          href={`/records/${savedId}`}
                          className="underline hover:text-emerald-700"
                        >
                          查看记录 → /records/{savedId}
                        </Link>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </FadeIn>
      </section>

      {/* 保存记录 Modal */}
      <Modal
        open={saveModalOpen}
        onClose={() => !saving && setSaveModalOpen(false)}
        title="保存为沟通记录"
        closeOnMask={!saving}
      >
        <div className="space-y-4">
          <div className="text-xs text-muted">
            将把上方家长消息、编辑后的话术、策略与风险提示一起保存。
          </div>

          <div className="space-y-1.5">
            <label htmlFor="generate-follow-up" className="text-sm font-medium text-fg">
              后续进展（可选）
            </label>
            <textarea
              id="generate-follow-up"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              rows={4}
              placeholder="如果已经和家长沟通了一部分，可以先记在这里…"
              className="w-full resize-y rounded-lg border border-border bg-input px-3 py-2 text-sm leading-relaxed text-fg outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="rounded-xl border border-border bg-bg px-3 py-2 text-xs text-muted space-y-1">
            <div>
              家长消息：
              <span className="text-fg/90">
                {(parentMessage.length > 40
                  ? parentMessage.slice(0, 40) + "…"
                  : parentMessage) || "—"}
              </span>
            </div>
            <div>
              关联学生：
              <span className="text-fg/90">
                {selectedStudentId !== ""
                  ? students.find((s) => s.id === selectedStudentId)?.name ||
                    `学生#${selectedStudentId}`
                  : "不关联"}
              </span>
            </div>
            <div>
              话术条数：<span className="text-fg/90">{editableScripts.length}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <MotionButton
              type="button"
              onClick={() => setSaveModalOpen(false)}
              disabled={saving}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg hover:bg-accent/60 disabled:opacity-60"
            >
              取消
            </MotionButton>
            <MotionButton
              type="button"
              onClick={handleSaveConfirm}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg shadow hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <motion.span
                    aria-hidden
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 0.9,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="inline-block h-3.5 w-3.5 rounded-full border-2 border-primary-fg/30 border-t-primary-fg"
                  />
                  保存中…
                </>
              ) : (
                "保存"
              )}
            </MotionButton>
          </div>
        </div>
      </Modal>

      {/* Toast */}
      <ToastContainer toast={toast} onClose={hideToast} />
    </PageTransition>
  );
}

/* ------------------------------ 占位引导 ------------------------------ */

function EmptyResultPlaceholder() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-[400px] flex-col items-center justify-center text-center"
    >
      <div
        aria-hidden
        className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-border bg-accent/40 text-4xl"
      >
        💬
      </div>
      <h3 className="text-base font-semibold text-fg">还没有结果</h3>
      <p className="mt-1 max-w-xs text-sm text-muted">
        在左侧粘贴家长发来的消息（质疑、投诉或咨询），点击「生成话术」，
        AI 会基于 20 种常见沟通场景为你生成专业回复与风险提示。
      </p>
      <div className="mt-5 grid grid-cols-1 gap-2 text-xs text-muted">
        <div className="rounded-lg border border-border bg-bg/70 px-3 py-2 text-left">
          ✅ 可选关联学生 / 班级，生成更个性化的话术
        </div>
        <div className="rounded-lg border border-border bg-bg/70 px-3 py-2 text-left">
          ✅ 结果可编辑，满意后一键保存为沟通记录
        </div>
      </div>
    </motion.div>
  );
}
