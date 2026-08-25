"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/**
 * 主题值：default（浅色 B2C）/ eye（护眼绿）/ dark（暗色）
 * —— 通过 <html data-theme=...> 切换 globals.css 中的 CSS 变量。
 */
export type Theme = "default" | "eye" | "dark";

const STORAGE_KEY = "theme";
const DEFAULT_THEME: Theme = "default";

// 历史兼容：用户本地若存了 "light"，当作 default
const NORMALIZE: Record<string, Theme> = {
  light: "default",
  default: "default",
  eye: "eye",
  dark: "dark",
};

export type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  /** 是否已在客户端完成水合（避免 SSR 与客户端首次渲染不一致） */
  mounted: boolean;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/** 把主题应用到 <html data-theme=...> */
function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw && NORMALIZE[raw]) return NORMALIZE[raw];
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME;
}

/** ThemeContext.Provider：负责首次读取 localStorage + 写入 data-theme + 持久化 */
export function ThemeContextProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = readStoredTheme();
    setThemeState(stored);
    applyTheme(stored);
    setMounted(true);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    const next = NORMALIZE[t] ?? DEFAULT_THEME;
    setThemeState(next);
    applyTheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** 使用主题：务必在 <ThemeContextProvider> 内部调用 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme 必须在 ThemeContextProvider 内使用");
  return ctx;
}

export { ThemeContext, DEFAULT_THEME, STORAGE_KEY };
