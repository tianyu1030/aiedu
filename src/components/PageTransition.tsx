"use client";

import type { ReactNode } from "react";
import { motion, type Variants } from "framer-motion";

/**
 * PageTransition：页面顶层淡入容器。
 *  - 每个页面直接用 import PageTransition from "@/components/PageTransition" 包裹即可。
 *  - initial opacity 0 → animate opacity 1，duration 0.3。
 */
export default function PageTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* 也作为命名导出，方便 import { PageTransition } 兼容。 */
export { PageTransition };
