"use client";

import { motion } from "framer-motion";
import type { HTMLAttributes } from "react";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** 形状：rect（默认，圆角）| circle */
  variant?: "rect" | "circle";
}

/**
 * 通用骨架屏。基于 framer-motion 的 shimmer 动画。
 * 默认带圆角。variant="circle" 会变成完全圆形。
 */
export default function Skeleton({
  variant = "rect",
  className = "",
  style,
  ...rest
}: SkeletonProps) {
  const shapeClass =
    variant === "circle" ? "rounded-full" : "rounded-lg";
  return (
    <motion.div
      aria-hidden
      className={`relative overflow-hidden bg-muted/40 ${shapeClass} ${className}`}
      style={style}
      {...(rest as any)}
    >
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent"
        animate={{ x: ["0%", "200%"] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
      />
    </motion.div>
  );
}
