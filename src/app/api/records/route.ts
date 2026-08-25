import { NextResponse, type NextRequest } from "next/server";
import { type RowDataPacket } from "@/lib/db";
import { requireUserId, UnauthorizedError } from "@/lib/auth";
import { scopedQuery } from "@/lib/withUserId";

interface RecordListRow extends RowDataPacket {
  id: number;
  student_id: number | null;
  student_name: string | null;
  parent_message: string;
  created_at: string;
}

function parseIntParam(v: string | null): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * GET /api/records
 *   - 支持 ?classId= & ?studentId= 筛选
 *   - 强制 user_id 隔离
 *   - LEFT JOIN 学生名（未关联学生时 student_name 为 null）
 *   - 按 classId 过滤时改为 INNER JOIN students ON class_id 匹配
 *   - ORDER BY created_at DESC
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();

    const { searchParams } = new URL(request.url);
    const classId = parseIntParam(searchParams.get("classId"));
    const studentId = parseIntParam(searchParams.get("studentId"));

    const params: unknown[] = [userId];
    const whereClauses: string[] = ["cr.user_id = ?"];

    if (studentId != null) {
      whereClauses.push("cr.student_id = ?");
      params.push(studentId);
    }

    let sql: string;

    if (classId != null) {
      // 按班级筛选：必须通过 student 关联合法学生，同时保证学生归属当前 user
      whereClauses.push("s.class_id = ?");
      whereClauses.push("s.user_id = ?");
      params.push(classId, userId);

      sql = `
        SELECT
          cr.id,
          cr.student_id,
          s.name AS student_name,
          cr.parent_message,
          cr.created_at
        FROM communication_records cr
        INNER JOIN students s
          ON s.id = cr.student_id
        WHERE ${whereClauses.join(" AND ")}
        ORDER BY cr.created_at DESC
      `;
    } else {
      // 普通列表：LEFT JOIN 取学生名，学生被删则名字为空
      sql = `
        SELECT
          cr.id,
          cr.student_id,
          s.name AS student_name,
          cr.parent_message,
          cr.created_at
        FROM communication_records cr
        LEFT JOIN students s
          ON s.id = cr.student_id AND s.user_id = ?
        WHERE ${whereClauses.join(" AND ")}
        ORDER BY cr.created_at DESC
      `;
      // LEFT JOIN ON 的 ? 先出现，因此把其 userId 放在 params 最前面
      params.unshift(userId);
    }

    const rows = await scopedQuery<RecordListRow[]>(userId, sql, params);

    const records = rows.map((r) => {
      const raw = r.parent_message ?? "";
      const summary = raw.length > 30 ? raw.slice(0, 30) + "…" : raw;
      return {
        id: r.id,
        student_id: r.student_id,
        student_name: r.student_name ?? null,
        parent_message_summary: summary,
        created_at: r.created_at,
      };
    });

    return NextResponse.json({ ok: true, records });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("获取沟通记录列表失败:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
