"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getRandomQuote } from "@/data/quotes";

/**
 * QuoteOfDay：每日（每次加载时随机）一句励志卡片。
 *  - 从 QUOTES 随机选一条，带淡入动效。
 *  - 用于工作台与话术生成页等。
 *  - 客户端渲染（避免水合不一致）。
 */
export default function QuoteOfDay({
  className,
}: {
  className?: string;
}) {
  const [quote, setQuote] = useState<string | null>(null);

  useEffect(() => {
    setQuote(getRandomQuote());
  }, []);

  if (!quote) {
    // SSR 阶段及首次水合前不渲染，避免与客户端随机不一致
    return null;
  }

  return (
    <motion.figure
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={[
        "rounded-xl border border-border bg-accent/70 px-4 py-3 text-sm text-fg/90 shadow-sm",
        className ?? "",
      ].join(" ")}
    >
      <blockquote className="leading-relaxed">
        <span className="mr-1 select-none text-primary" aria-hidden>
          “
        </span>
        {quote}
        <span className="ml-1 select-none text-primary" aria-hidden>
          ”
        </span>
      </blockquote>
    </motion.figure>
  );
}
