import type { Config } from "tailwindcss";

/**
 * 颜色扩展全部以 CSS 变量为来源，通过 <html data-theme> 切换即可生效。
 * 命名约定：
 *   bg / fg / muted / border / accent
 *   primary.{DEFAULT,fg,foreground}
 *   card.{DEFAULT,fg,foreground}
 *   input / ring（用于表单聚焦环）
 */
const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundColor: {
        DEFAULT: "var(--bg)",
        bg: "var(--bg)",
        card: "var(--card)",
        primary: "var(--primary)",
        "primary-fg": "var(--primary-fg)",
        accent: "var(--accent)",
        input: "var(--input)",
      },
      textColor: {
        DEFAULT: "var(--fg)",
        fg: "var(--fg)",
        muted: "var(--muted)",
        primary: "var(--primary)",
        "primary-fg": "var(--primary-fg)",
        card: "var(--card-fg)",
        "card-fg": "var(--card-fg)",
      },
      borderColor: {
        DEFAULT: "var(--border)",
        border: "var(--border)",
        primary: "var(--primary)",
        input: "var(--input)",
      },
      colors: {
        bg: "var(--bg)",
        fg: "var(--fg)",
        muted: "var(--muted)",
        primary: {
          DEFAULT: "var(--primary)",
          fg: "var(--primary-fg)",
          foreground: "var(--primary-fg)",
        },
        card: {
          DEFAULT: "var(--card)",
          fg: "var(--card-fg)",
          foreground: "var(--card-fg)",
        },
        border: "var(--border)",
        accent: "var(--accent)",
        input: "var(--input)",
        ring: "var(--ring)",
      },
      ringColor: {
        DEFAULT: "var(--ring)",
        ring: "var(--ring)",
        primary: "var(--ring)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;
