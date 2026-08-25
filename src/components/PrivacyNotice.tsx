"use client";

/**
 * 隐私提示卡片（PrivacyNotice）：
 *  文案固定为未成年人信息保护提示，后续在学生管理与话术生成页可直接 import 使用。
 *  传 className 可自定义容器样式；传 show 可控制是否渲染。
 */
const DEFAULT_MESSAGE =
  "班级学生信息涉及未成年人个人信息，请老师自行妥善管理数据，本产品仅保存必要信息";

export default function PrivacyNotice({
  show = true,
  message = DEFAULT_MESSAGE,
  className,
}: {
  show?: boolean;
  message?: string;
  className?: string;
}) {
  if (!show) return null;
  return (
    <div
      role="note"
      aria-label="隐私提示"
      className={[
        "flex items-start gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-fg",
        className ?? "",
      ].join(" ")}
    >
      <span
        className="mt-0.5 shrink-0 select-none text-amber-600"
        aria-hidden
      >
        🔒
      </span>
      <span className="text-fg/90 leading-relaxed">{message}</span>
    </div>
  );
}

export { DEFAULT_MESSAGE as PRIVACY_NOTICE_TEXT };
