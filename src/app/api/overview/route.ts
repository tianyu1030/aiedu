import { NextResponse } from "next/server";
import { type RowDataPacket } from "@/lib/db";
import { requireUserId, UnauthorizedError } from "@/lib/auth";
import { scopedQuery } from "@/lib/withUserId";

/* ------------------------------ 类型 ------------------------------ */

interface CountRow extends RowDataPacket {
  c: number;
}

interface RecentRecordRow extends RowDataPacket {
  id: number;
  parent_message: string;
  created_at: string;
  student_name: string | null;
}

export interface OverviewRecentRecord {
  id: number;
  parent_message_summary: string;
  created_at: string;
  student_name: string | null;
}

export interface OverviewResponse {
  ok: true;
  classCount: number;
  studentCount: number;
  recentRecords: OverviewRecentRecord[];
}

/* ------------------------------ 工具 ------------------------------ */

function summarize(text: string | null | undefined, max = 30): string {
  const raw = text ?? "";
  return raw.length > max ? raw.slice(0, max) + "…" : raw;
}

/* ------------------------------ 路由 ------------------------------ */

/**
 * GET /api/overview
 *  - 强制 user_id 隔离
 *  - 返回班级数、学生数、最近 5 条沟通记录（含学生名、消息摘要）
 */
export async function GET() {
  try {
    const userId = await requireUserId();

    // a) 班级数量
    const [classRow] = await scopedQuery<CountRow[]>(
      userId,
      "SELECT COUNT(*) AS c FROM classes WHERE user_id = ?",
      [userId]
    );
    const classCount = Number(classRow?.c ?? 0);

    // b) 学生总数
    const [studentRow] = await scopedQuery<CountRow[]>(
      userId,
      "SELECT COUNT(*) AS c FROM students WHERE user_id = ?",
      [userId]
    );
    const studentCount = Number(studentRow?.c ?? 0);

    // c) 最近 5 条沟通记录（LEFT JOIN 学生名）
    const recentRows = await scopedQuery<RecentRecordRow[]>(
      userId,
      `SELECT
        cr.id,
        cr.parent_message,
        cr.created_at,
        s.name AS student_name
      FROM communication_records cr
      LEFT JOIN students s
        ON s.id = cr.student_id AND s.user_id = ?
      WHERE cr.user_id = ?
      ORDER BY cr.created_at DESC
      LIMIT 5`,
      [userId, userId]
    );

    const recentRecords: OverviewRecentRecord[] = recentRows.map((r) => ({
      id: r.id,
      parent_message_summary: summarize(r.parent_message, 30),
      created_at: r.created_at,
      student_name: r.student_name ?? null,
    }));

    return NextResponse.json({
      ok: true as const,
      classCount,
      studentCount,
      recentRecords,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("获取概览数据失败:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
