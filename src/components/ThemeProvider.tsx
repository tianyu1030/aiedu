"use client";

import {
  ThemeContextProvider,
  useTheme,
  type Theme,
  type ThemeContextValue,
} from "@/contexts/ThemeContext";
import type { ReactNode } from "react";

/**
 * ThemeProvider：layout 顶层包裹子树。
 * 逻辑委托给 ThemeContextProvider（定义在 src/contexts/ThemeContext.tsx），
 * 这里仅做再导出，保证 @/components/ThemeProvider 的调用方零改动。
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeContextProvider>{children}</ThemeContextProvider>;
}

export { useTheme };
export type { Theme, ThemeContextValue };

export default ThemeProvider;
