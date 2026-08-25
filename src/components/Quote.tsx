"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getRandomQuote } from "@/lib/quotes";

/**
 * 励志提示卡片：客户端组件，mount 时随机展示一条文案，带淡入动效。
 */
export default function Quote() {
  const [quote, setQuote] = useState<string | null>(null);

  useEffect(() => {
    setQuote(getRandomQuote());
  }, []);

  if (!quote) {
    // mount 前不渲染，避免水合不匹配
    return null;
  }

  return (
    <motion.blockquote
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-xl border border-border bg-accent px-4 py-3 text-sm text-fg/90"
    >
      <span className="mr-1 select-none text-primary">“</span>
      {quote}
      <span className="ml-1 select-none text-primary">”</span>
    </motion.blockquote>
  );
}
