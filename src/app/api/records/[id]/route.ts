import { NextResponse, type NextRequest } from "next/server";
import { query, type ResultSetHeader, type RowDataPacket } from "@/lib/db";
import { requireUserId, UnauthorizedError } from "@/lib/auth";
import { scopedQuery } from "@/lib/withUserId";

interface RecordDetailRow extends RowDataPacket {
  id: number;
  student_id: number | null;
  student_name: string | null;
  parent_message: string;
  reply: string | null;
  strategy: string | null;
  risks: string | null;
  result: string | null;
  created_at: string;
  updated_at: string;
}

function parseIdParam(idParam: string): number | null {
  const id = Number(idParam);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * GET /api/records/[id] — 查询单条沟通记录详情（含归属校验）
 * 返回：{ id, student_id, student_name, parent_message, reply, strategy, risks, result, created_at, updated_at }
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const recordId = parseIdParam(params.id);
  if (!recordId) {
    return NextResponse.json({ error: "无效的记录 ID" }, { status: 400 });
  }

  try {
    const userId = await requireUserId();

    const rows = await scopedQuery<RecordDetailRow[]>(
      userId,
      `
        SELECT
          cr.id,
          cr.student_id,
          s.name AS student_name,
          cr.parent_message,
          cr.reply,
          cr.strategy,
          cr.risks,
          cr.result,
          cr.created_at,
          cr.updated_at
        FROM communication_records cr
        LEFT JOIN students s
          ON s.id = cr.student_id AND s.user_id = ?
        WHERE cr.id = ? AND cr.user_id = ?
        LIMIT 1
      `,
      [userId, recordId, userId]
    );

    const row = rows[0];
    if (!row) {
      return NextResponse.json(
        { error: "记录不存在或无权限查看" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      record: {
        id: row.id,
        student_id: row.student_id,
        student_name: row.student_name ?? null,
        parent_message: row.parent_message ?? "",
        reply: row.reply ?? null,
        strategy: row.strategy ?? null,
        risks: row.risks ?? null,
        result: row.result ?? null,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("获取沟通记录详情失败:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

/**
 * PATCH /api/records/[id] — 更新记录的 result 字段（仅允许更新 result）
 * Body: { result?: string }
 * 返回：{ ok: true }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const recordId = parseIdParam(params.id);
  if (!recordId) {
    return NextResponse.json({ error: "无效的记录 ID" }, { status: 400 });
  }

  let body: { result?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
  }

  const hasResult = Object.prototype.hasOwnProperty.call(body, "result");
  if (!hasResult) {
    return NextResponse.json({ error: "缺少可更新字段: result" }, { status: 400 });
  }

  const result = body.result == null ? null : String(body.result);

  try {
    const userId = await requireUserId();

    const rows = await query<ResultSetHeader>(
      `
        UPDATE communication_records
        SET result = ?
        WHERE id = ? AND user_id = ?
      `,
      [result, recordId, userId]
    );

    if (rows.affectedRows === 0) {
      return NextResponse.json(
        { error: "记录不存在或无权限操作" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("更新沟通记录结果失败:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
