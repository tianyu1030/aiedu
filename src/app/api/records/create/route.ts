import { NextResponse, type NextRequest } from "next/server";
import { query, type ResultSetHeader, type RowDataPacket } from "@/lib/db";
import { requireUserId, UnauthorizedError } from "@/lib/auth";

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

function optionalText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value);
  return s.length === 0 ? null : s;
}

/* --------------------------- 路由处理 --------------------------- */

/**
 * POST /api/records/create — 创建沟通记录（专用 API，原 records API 仅查/改 result）
 *
 * Body:
 *  {
 *    studentId?: number|string,     // 可选，传了则校验存在且归属当前用户
 *    parentMessage: string,          // 必填，家长原始消息
 *    reply?: string,                 // 可选，采用的回复话术
 *    strategy?: string,              // 可选，沟通策略
 *    risks?: string,                 // 可选，风险提示（前端通常 join("\n") 后传入）
 *    result?: string                 // 可选，后续进展
 *  }
 *
 * 成功返回：{ ok:true, id }
 * 失败返回：{ error:string }（4xx/5xx 状态码）
 */
export async function POST(request: NextRequest) {
  let body: {
    studentId?: unknown;
    parentMessage?: unknown;
    reply?: unknown;
    strategy?: unknown;
    risks?: unknown;
    result?: unknown;
  };
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
  const reply = optionalText(body.reply);
  const strategy = optionalText(body.strategy);
  const risks = optionalText(body.risks);
  const result = optionalText(body.result);

  // 必填校验
  if (!parentMessage.trim()) {
    return NextResponse.json(
      { error: "家长消息不能为空" },
      { status: 400 }
    );
  }

  try {
    const userId = await requireUserId();

    // 校验 studentId：传了则必须存在且归属当前 user
    if (studentId !== null) {
      const rows = await query<RowDataPacket[]>(
        "SELECT id FROM students WHERE id = ? AND user_id = ? LIMIT 1",
        [studentId, userId]
      );
      if (rows.length === 0) {
        return NextResponse.json(
          { error: "学生不存在或无权限操作" },
          { status: 404 }
        );
      }
    }

    const insertResult = await query<ResultSetHeader>(
      `
        INSERT INTO communication_records
          (user_id, student_id, parent_message, reply, strategy, risks, result)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [userId, studentId, parentMessage, reply, strategy, risks, result]
    );

    return NextResponse.json({
      ok: true,
      id: insertResult.insertId,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("创建沟通记录失败:", err);
    const message =
      err instanceof Error ? err.message : "服务器错误，请稍后重试";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
