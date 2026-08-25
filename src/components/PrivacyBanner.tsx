"use client";

/**
 * 隐私提示横幅：班级学生信息涉及未成年人个人信息，提示老师妥善管理数据。
 * 可通过 prop 控制是否显示（默认显示）。
 *
 * 注：使用半透明 amber 作为警示色，在三套主题（light/eye/dark）背景下均可读。
 */
export default function PrivacyBanner({
  show = true,
  message = "班级学生信息涉及未成年人个人信息，请老师自行妥善管理数据，本产品仅保存必要信息。",
}: {
  show?: boolean;
  message?: string;
}) {
  if (!show) return null;
  return (
    <div
      role="note"
      className="flex items-start gap-2 rounded-lg border border-amber-400/50 bg-amber-400/15 px-3 py-2 text-sm text-fg"
    >
      <span className="mt-0.5 shrink-0 select-none text-amber-600" aria-hidden>
        🔒
      </span>
      <span className="text-fg/90">{message}</span>
    </div>
  );
}
