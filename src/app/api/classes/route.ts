import { NextResponse, type NextRequest } from "next/server";
import { query, type ResultSetHeader, type RowDataPacket } from "@/lib/db";
import { requireUserId, UnauthorizedError } from "@/lib/auth";

export interface ClassRow extends RowDataPacket {
  id: number;
  name: string;
  grade: number;
  created_at: string;
  student_count?: number;
}

const VALID_GRADES = [1, 2, 3, 4, 5, 6];

/** GET /api/classes — 返回当前用户所有班级（含学生数统计） */
export async function GET() {
  try {
    const userId = await requireUserId();

    const rows = await query<ClassRow[]>(
      `SELECT
        c.id,
        c.name,
        c.grade,
        c.created_at,
        COUNT(s.id) AS student_count
      FROM classes c
      LEFT JOIN students s ON s.class_id = c.id AND s.user_id = ?
      WHERE c.user_id = ?
      GROUP BY c.id
      ORDER BY c.created_at DESC`,
      [userId, userId]
    );

    const classes = rows.map((r) => ({
      id: r.id,
      name: r.name,
      grade: r.grade,
      created_at: r.created_at,
      studentCount: Number(r.student_count ?? 0),
    }));

    return NextResponse.json({ ok: true, classes });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("获取班级列表失败:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

/** POST /api/classes — 新建班级 */
export async function POST(request: NextRequest) {
  let body: { name?: unknown; grade?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const gradeRaw = body.grade;
  const grade =
    typeof gradeRaw === "string" || typeof gradeRaw === "number"
      ? Number(gradeRaw)
      : NaN;

  if (!name) {
    return NextResponse.json({ error: "班级名称不能为空" }, { status: 400 });
  }
  if (name.length > 30) {
    return NextResponse.json(
      { error: "班级名称不能超过 30 个字符" },
      { status: 400 }
    );
  }
  if (!VALID_GRADES.includes(grade)) {
    return NextResponse.json(
      { error: "年级必须为 1 至 6 之间的整数" },
      { status: 400 }
    );
  }

  try {
    const userId = await requireUserId();

    const result = await query<ResultSetHeader>(
      "INSERT INTO classes (user_id, name, grade) VALUES (?, ?, ?)",
      [userId, name, grade]
    );

    const newClass = {
      id: result.insertId,
      name,
      grade,
      created_at: new Date().toISOString(),
      studentCount: 0,
    };

    return NextResponse.json({ ok: true, class: newClass });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("创建班级失败:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
