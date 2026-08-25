"use client";

import { useEffect, useState, useCallback } from "react";
import Alert, { type AlertType } from "@/components/ui/Alert";

export interface ToastState {
  type: AlertType;
  message: string;
}

export interface UseToastReturn {
  toast: ToastState | null;
  showToast: (type: AlertType, message: string) => void;
  hideToast: () => void;
}

/**
 * 通用 Toast hook：统一各页面的 toast state + 自动关闭逻辑。
 * 默认 2600ms 自动关闭。
 */
export function useToast(duration = 2600): UseToastReturn {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback(
    (type: AlertType, message: string) => {
      setToast({ type, message });
    },
    []
  );

  const hideToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), duration);
    return () => clearTimeout(t);
  }, [toast, duration]);

  return { toast, showToast, hideToast };
}

/**
 * Toast 渲染容器：固定顶部居中，配合 useToast 使用。
 * 用法：
 *   const { toast, showToast, hideToast } = useToast();
 *   ...
 *   <ToastContainer toast={toast} onClose={hideToast} />
 */
export function ToastContainer({
  toast,
  onClose,
}: {
  toast: ToastState | null;
  onClose: () => void;
}) {
  return (
    <div className="pointer-events-none fixed left-1/2 top-6 z-40 w-[92%] max-w-md -translate-x-1/2">
      {toast && (
        <Alert
          type={toast.type}
          message={toast.message}
          show
          onClose={onClose}
        />
      )}
    </div>
  );
}
