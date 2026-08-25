/**
 * DeepSeek API 客户端：封装话术生成请求。
 *
 * 核心导出：generateReplyScripts(opts)
 *  - 系统提示词 = 角色设定 + buildSystemPrompt()（20 场景话术库）+ 用户上下文字段 + 输出 JSON 指令
 *  - 调用 deepseek-chat 模型，temperature 0.7，response_format json_object
 *  - 解析失败 / 网络异常时返回带风险提示的降级响应，便于前端提示
 */

import { buildSystemPrompt, getScriptScenarios } from "./scriptLibrary";

/* ------------------------------ 类型定义 ------------------------------ */

/** 传入学上下文（可选），用于在系统提示词中注入更精准的替换信息。 */
export interface StudentContext {
  /** 学生姓名 */
  name: string;
  /** 性别：男 / 女 */
  gender?: string;
  /** 标签（逗号分隔或数组字符串，原样展示给模型参考） */
  tags?: string;
}

/** generateReplyScripts() 入参。 */
export interface GenerateScriptOpts {
  /** 家长发来的原始消息（质疑 / 投诉内容）。 */
  parentMessage: string;
  /** 学生上下文（可选）。 */
  student?: StudentContext;
  /** 班级名称（可选），用于替换占位符 {班级名称}。 */
  className?: string;
}

/** 标准化输出结构（解析成功 / 失败最终都会收敛到这个结构）。 */
export interface GeneratedScripts {
  /** 1-3 条可直接发给家长的回复话术（字符串数组）。 */
  scripts: string[];
  /** 本次沟通策略提示。 */
  strategy: string;
  /** 风险点提示（若解析异常则包含解析异常的提示）。 */
  risks: string[];
}

/* ------------------------------ 内部工具 ------------------------------ */

const API_URL = "https://api.deepseek.com/chat/completions";

/** 获取 API Key，缺失时抛出自定义错误便于路由捕获。 */
function getApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    throw new Error("DEEPSEEK_API_KEY 未配置");
  }
  return key;
}

/**
 * 基于 opts 组装完整的系统提示词：
 *  - 基础话术库提示（buildSystemPrompt，话术库从数据库读取）
 *  - 追加用户上下文字段（学生姓名 / 性别 / 标签 / 班级名）
 *  - 再次强调纯 JSON 输出（response_format=json_object 仍建议文字强调）
 */
async function assembleSystemPrompt(opts: GenerateScriptOpts): Promise<string> {
  const scenarios = await getScriptScenarios();
  const base = buildSystemPrompt(scenarios);

  const contextLines: string[] = [];
  if (opts.student?.name) {
    contextLines.push(`- 学生姓名：${opts.student.name}`);
  }
  if (opts.student?.gender) {
    contextLines.push(`- 学生性别：${opts.student.gender}`);
  }
  if (opts.student?.tags) {
    contextLines.push(`- 学生标签/特点：${opts.student.tags}`);
  }
  if (opts.className) {
    contextLines.push(`- 所在班级：${opts.className}`);
  }

  if (contextLines.length === 0) {
    return base;
  }

  return (
    base +
    "\n\n【当前对话的学生上下文】\n" +
    contextLines.join("\n") +
    "\n请在生成时把这些实际信息替换进话术模板的对应占位符（或直接使用自然表述），不要保留占位符。"
  );
}

/** DeepSeek 返回的 raw JSON 类型（仅用于类型收敛，不强校验）。 */
interface RawGeneratedScripts {
  scripts?: unknown;
  strategy?: unknown;
  risks?: unknown;
}

/**
 * 解析 JSON，返回 GeneratedScripts。
 *  - 如果 scripts / strategy / risks 类型不匹配，会尽量降级为合理格式。
 *  - 彻底解析失败时返回 null（由调用方构造 fallback）。
 */
function parseRawJson(rawText: string): GeneratedScripts | null {
  let parsed: RawGeneratedScripts;
  try {
    parsed = JSON.parse(rawText) as RawGeneratedScripts;
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  // scripts：期望 string[]，长度 1-3；否则尽量转数组，长度为 0 返回 null
  let scripts: string[] = [];
  if (Array.isArray(parsed.scripts)) {
    scripts = parsed.scripts
      .map((s) => (s === undefined || s === null ? "" : String(s)))
      .filter((s) => s.length > 0);
  } else if (typeof parsed.scripts === "string" && parsed.scripts.length > 0) {
    scripts = [parsed.scripts];
  }
  if (scripts.length === 0) {
    return null;
  }
  // 限制最多 3 条
  if (scripts.length > 3) {
    scripts = scripts.slice(0, 3);
  }

  const strategy =
    parsed.strategy === undefined || parsed.strategy === null
      ? "（未返回策略，请参考上方话术）"
      : String(parsed.strategy);

  let risks: string[] = [];
  if (Array.isArray(parsed.risks)) {
    risks = parsed.risks
      .map((r) => (r === undefined || r === null ? "" : String(r)))
      .filter((r) => r.length > 0);
  } else if (typeof parsed.risks === "string" && parsed.risks.length > 0) {
    risks = [parsed.risks];
  }

  return { scripts, strategy, risks };
}

/* ------------------------------ 公开 API ------------------------------ */

/**
 * 生成回复话术（核心）。
 *
 * @throws Error 当 API Key 未配置 / 网络错误时抛出，调用方应捕获并转换为用户可读错误。
 * @returns 标准化的 GeneratedScripts，解析失败时内容包含降级提示但不会抛错。
 */
export async function generateReplyScripts(
  opts: GenerateScriptOpts
): Promise<GeneratedScripts> {
  const apiKey = getApiKey();
  const systemPrompt = await assembleSystemPrompt(opts);

  // 控制超时：60 秒（DeepSeek 通常在 10-30 秒内返回）
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);

  let rawText = "";
  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: opts.parentMessage },
        ],
      }),
      signal: controller.signal,
      // 禁止 Next.js 路由层缓存（每次都请求最新结果）
      cache: "no-store",
    } as RequestInit);

    if (!resp.ok) {
      const errBody = await resp.text().catch(() => "");
      throw new Error(
        `DeepSeek API 请求失败（${resp.status}）：${errBody || resp.statusText}`
      );
    }

    const data = (await resp.json()) as any;
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.length === 0) {
      throw new Error("DeepSeek API 返回内容为空");
    }
    rawText = content;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error("生成超时，请稍后重试");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  const parsed = parseRawJson(rawText);
  if (parsed) {
    return parsed;
  }

  // 解析失败：降级（不抛错，前端根据 risks 判断是否需人工审查）
  return {
    scripts: [rawText],
    strategy: "（解析失败，请参考上方整段建议）",
    risks: ["解析异常，建议人工审查回复"],
  };
}

export default generateReplyScripts;
