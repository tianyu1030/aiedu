"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

export type AlertType = "success" | "error" | "info";

interface AlertProps {
  /** 是否显示 */
  show?: boolean;
  /** 类型：success | error | info */
  type?: AlertType;
  /** 主文案 */
  message: ReactNode;
  /** 副文案（可选） */
  description?: ReactNode;
  /** 关闭回调（有则显示关闭按钮） */
  onClose?: () => void;
  className?: string;
}

const TYPE_STYLES: Record<AlertType, { bg: string; border: string; icon: string; iconColor: string; label: string }> = {
  success: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    icon: "✓",
    iconColor: "text-emerald-500",
    label: "成功",
  },
  error: {
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    icon: "!",
    iconColor: "text-rose-500",
    label: "错误",
  },
  info: {
    bg: "bg-sky-500/10",
    border: "border-sky-500/30",
    icon: "i",
    iconColor: "text-sky-500",
    label: "提示",
  },
};

/**
 * 通用 Alert / Toast 组件。
 * - show 控制显示/隐藏，带动画
 * - 可作为常驻 Banner 或短暂 Toast 使用
 */
export default function Alert({
  show = true,
  type = "info",
  message,
  description,
  onClose,
  className = "",
}: AlertProps) {
  const s = TYPE_STYLES[type];
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="alert"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${s.bg} ${s.border} ${className}`}
        >
          <span
            aria-hidden
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/80 text-xs font-bold ${s.iconColor}`}
          >
            {s.icon}
          </span>
          <div className="flex-1 text-sm">
            <div className="font-medium text-fg">
              {message}
            </div>
            {description && (
              <div className="mt-1 text-muted">{description}</div>
            )}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭提示"
              className="shrink-0 rounded p-1 text-muted transition hover:bg-black/5 hover:text-fg"
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
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
