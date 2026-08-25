import { NextResponse, type NextRequest } from "next/server";
import { type RowDataPacket } from "@/lib/db";
import { requireUserId, UnauthorizedError } from "@/lib/auth";
import { query } from "@/lib/db";
import { generateReplyScripts } from "@/lib/deepseek";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* --------------------------- 参数解析工具 --------------------------- */

function parseStudentId(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const id =
    typeof value === "string" || typeof value === "number"
      ? Number(value)
      : NaN;
  return Number.isInteger(id) && id > 0 ? id : null;
}

/* --------------------------- 路由处理 --------------------------- */

interface StudentWithClassRow extends RowDataPacket {
  name: string;
  gender: string | null;
  tags: string | null;
  class_name: string | null;
}

/**
 * POST /api/generate
 * Body: { parentMessage: string, studentId?: number|string }
 *
 * 流程：
 *  1. requireUserId() 强制登录
 *  2. 若传 studentId：查询该学生（含班级名 JOIN classes）并校验归属
 *  3. 校验 parentMessage 非空且 ≤ 5000 字
 *  4. 调用 generateReplyScripts() → 返回结构化结果
 *
 * 成功返回：{ ok:true, data:{ scripts, strategy, risks } }
 * 失败返回：{ error:string }（4xx/5xx 状态码）
 */
export async function POST(request: NextRequest) {
  let body: { parentMessage?: unknown; studentId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "请求体格式错误（需为 JSON）" },
      { status: 400 }
    );
  }

  const parentMessage =
    body.parentMessage === undefined || body.parentMessage === null
      ? ""
      : String(body.parentMessage);

  const studentId = parseStudentId(body.studentId);

  // 基础参数校验
  if (!parentMessage.trim()) {
    return NextResponse.json(
      { error: "家长消息不能为空" },
      { status: 400 }
    );
  }
  if (parentMessage.length > 5000) {
    return NextResponse.json(
      { error: "家长消息不能超过 5000 字符" },
      { status: 400 }
    );
  }

  try {
    const userId = await requireUserId();

    // 查询学生信息（含班级名）并校验归属
    let studentCtx: { name: string; gender?: string; tags?: string } | null =
      null;
    let className: string | undefined;

    if (studentId !== null) {
      const rows = await query<StudentWithClassRow[]>(
        `
          SELECT
            s.name,
            s.gender,
            s.tags,
            c.name AS class_name
          FROM students s
          LEFT JOIN classes c
            ON c.id = s.class_id AND c.user_id = ?
          WHERE s.id = ? AND s.user_id = ?
          LIMIT 1
        `,
        [userId, studentId, userId]
      );

      if (rows.length === 0) {
        return NextResponse.json(
          { error: "学生不存在或无权限操作" },
          { status: 404 }
        );
      }

      const row = rows[0];
      studentCtx = {
        name: row.name,
        ...(row.gender ? { gender: row.gender } : {}),
        ...(row.tags ? { tags: row.tags } : {}),
      };
      className = row.class_name ?? undefined;
    }

    // 调用 DeepSeek 生成（内部已做解析降级）
    const result = await generateReplyScripts({
      parentMessage,
      student: studentCtx ?? undefined,
      className,
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("生成话术失败:", err);
    const message =
      err instanceof Error ? err.message : "服务器错误，请稍后重试";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
