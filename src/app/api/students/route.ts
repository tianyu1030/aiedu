import { NextResponse, type NextRequest } from "next/server";
import { query, type ResultSetHeader, type RowDataPacket } from "@/lib/db";
import { requireUserId, UnauthorizedError } from "@/lib/auth";
import { scopedQuery } from "@/lib/withUserId";

export interface StudentRow extends RowDataPacket {
  id: number;
  user_id: number;
  class_id: number;
  name: string;
  gender: string | null;
  tags: string | null;
  created_at: string;
}

const VALID_GENDERS = ["男", "女"] as const;
type ValidGender = (typeof VALID_GENDERS)[number];

function parseGender(value: unknown): ValidGender | null {
  if (value === null || value === undefined || value === "") return null;
  const s = String(value).trim();
  if ((VALID_GENDERS as readonly string[]).includes(s)) {
    return s as ValidGender;
  }
  return null;
}

function parseIntParam(v: string | null): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * GET /api/students?classId=（可选）
 * - 列表，带 user_id + class_id 过滤
 * - 返回 { students: [{id,class_id,name,gender,tags,created_at}] }
 * - 如果 classId 传了，SQL 需校验 class 归属 user_id
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();

    const { searchParams } = new URL(request.url);
    const classId = parseIntParam(searchParams.get("classId"));

    const params: unknown[] = [userId];
    const whereClauses: string[] = ["s.user_id = ?"];

    if (classId != null) {
      // 通过子查询校验 class 归属当前 user_id
      whereClauses.push("s.class_id = ?");
      whereClauses.push(
        "EXISTS (SELECT 1 FROM classes c WHERE c.id = s.class_id AND c.user_id = ?)"
      );
      params.push(classId, userId);
    }

    const sql = `
      SELECT
        s.id,
        s.class_id,
        s.name,
        s.gender,
        s.tags,
        s.created_at
      FROM students s
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY s.created_at DESC
    `;

    const rows = await scopedQuery<StudentRow[]>(userId, sql, params);

    const students = rows.map((r) => ({
      id: r.id,
      class_id: r.class_id,
      name: r.name,
      gender: r.gender,
      tags: r.tags,
      created_at: r.created_at,
    }));

    return NextResponse.json({ ok: true, students });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("获取学生列表失败:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

/**
 * POST /api/students — 新建学生
 * Body: { class_id, name, gender?, tags? }
 * 校验：
 *  - name 非空 ≤20 字
 *  - gender 仅 "男"/"女"/null
 *  - tags 原样字符串（逗号分隔）
 *  - 插入前校验 class_id 归属当前 user_id
 */
export async function POST(request: NextRequest) {
  let body: { class_id?: unknown; name?: unknown; gender?: unknown; tags?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
  }

  const classIdRaw = body.class_id;
  const classId =
    typeof classIdRaw === "string" || typeof classIdRaw === "number"
      ? Number(classIdRaw)
      : NaN;

  const name = String(body.name ?? "").trim();
  const gender = parseGender(body.gender);
  const tagsRaw = body.tags;
  const tags =
    tagsRaw === undefined || tagsRaw === null ? null : String(tagsRaw).trim() || null;

  // 校验 class_id
  if (!Number.isInteger(classId) || classId <= 0) {
    return NextResponse.json({ error: "无效的班级 ID" }, { status: 400 });
  }
  // 校验 name
  if (!name) {
    return NextResponse.json({ error: "学生姓名不能为空" }, { status: 400 });
  }
  if (name.length > 20) {
    return NextResponse.json(
      { error: "学生姓名不能超过 20 个字符" },
      { status: 400 }
    );
  }
  // gender 校验：如果原字段传了非空但非法值，返回错误（而不是静默转 null）
  if (
    body.gender !== undefined &&
    body.gender !== null &&
    body.gender !== "" &&
    gender === null
  ) {
    return NextResponse.json(
      { error: "性别只能是「男」或「女」或留空" },
      { status: 400 }
    );
  }

  try {
    const userId = await requireUserId();

    // 校验 class_id 归属当前 user_id
    const classRows = await query<RowDataPacket[]>(
      "SELECT id FROM classes WHERE id = ? AND user_id = ? LIMIT 1",
      [classId, userId]
    );
    if (classRows.length === 0) {
      return NextResponse.json(
        { error: "班级不存在或无权限操作" },
        { status: 404 }
      );
    }

    const result = await query<ResultSetHeader>(
      "INSERT INTO students (user_id, class_id, name, gender, tags) VALUES (?, ?, ?, ?, ?)",
      [userId, classId, name, gender, tags]
    );

    const newStudent = {
      id: result.insertId,
      class_id: classId,
      name,
      gender,
      tags,
      created_at: new Date().toISOString(),
    };

    return NextResponse.json({ ok: true, student: newStudent });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("创建学生失败:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
