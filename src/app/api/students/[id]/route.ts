import { NextResponse, type NextRequest } from "next/server";
import { query, type ResultSetHeader, type RowDataPacket } from "@/lib/db";
import { requireUserId, UnauthorizedError } from "@/lib/auth";
import { scopedQuery } from "@/lib/withUserId";

const VALID_GENDERS = ["男", "女"] as const;
type ValidGender = (typeof VALID_GENDERS)[number];

function parseIdParam(idParam: string): number | null {
  const id = Number(idParam);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseGenderStrict(value: unknown): { ok: true; value: ValidGender | null } | { ok: false; error: string } {
  if (value === null || value === undefined || value === "") {
    return { ok: true, value: null };
  }
  const s = String(value).trim();
  if ((VALID_GENDERS as readonly string[]).includes(s)) {
    return { ok: true, value: s as ValidGender };
  }
  return { ok: false, error: "性别只能是「男」或「女」或留空" };
}

interface StudentDetailRow extends RowDataPacket {
  id: number;
  class_id: number;
  name: string;
  gender: string | null;
  tags: string | null;
  created_at: string;
  class_name: string;
  class_grade: number;
}

interface StudentRecordRow extends RowDataPacket {
  id: number;
  parent_message: string;
  created_at: string;
}

/**
 * GET /api/students/[id] — 单学生详情（含基本信息 + 历史沟通记录）
 * JOIN communication_records 按归属，records 取 created_at DESC
 * 返回 { student: {...}, records: [{id,parent_message_summary,created_at}] }
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const studentId = parseIdParam(params.id);
  if (!studentId) {
    return NextResponse.json({ error: "无效的学生 ID" }, { status: 400 });
  }

  try {
    const userId = await requireUserId();

    // 查学生基本信息 + 所属班级名/年级（归属校验）
    const studentRows = await scopedQuery<StudentDetailRow[]>(
      userId,
      `
        SELECT
          s.id,
          s.class_id,
          s.name,
          s.gender,
          s.tags,
          s.created_at,
          c.name AS class_name,
          c.grade AS class_grade
        FROM students s
        INNER JOIN classes c
          ON c.id = s.class_id AND c.user_id = ?
        WHERE s.id = ? AND s.user_id = ?
        LIMIT 1
      `,
      [userId, studentId, userId]
    );

    const row = studentRows[0];
    if (!row) {
      return NextResponse.json(
        { error: "学生不存在或无权限查看" },
        { status: 404 }
      );
    }

    // 查该学生的历史沟通记录（按 created_at DESC，取全部或前 N 条）
    const recordRows = await scopedQuery<StudentRecordRow[]>(
      userId,
      `
        SELECT
          cr.id,
          cr.parent_message,
          cr.created_at
        FROM communication_records cr
        WHERE cr.student_id = ? AND cr.user_id = ?
        ORDER BY cr.created_at DESC
        LIMIT 50
      `,
      [studentId, userId]
    );

    const records = recordRows.map((r) => {
      const raw = r.parent_message ?? "";
      const summary = raw.length > 30 ? raw.slice(0, 30) + "…" : raw;
      return {
        id: r.id,
        parent_message_summary: summary,
        created_at: r.created_at,
      };
    });

    return NextResponse.json({
      ok: true,
      student: {
        id: row.id,
        class_id: row.class_id,
        name: row.name,
        gender: row.gender,
        tags: row.tags,
        created_at: row.created_at,
        class_name: row.class_name,
        class_grade: row.class_grade,
      },
      records,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("获取学生详情失败:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

/**
 * PUT /api/students/[id] — 更新学生（需归属当前用户）
 * Body: { name?, gender?, tags?, class_id? }
 * - 归属校验（WHERE id=? AND user_id=?）
 * - 改 class_id 的话需校验新 class 归属
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const studentId = parseIdParam(params.id);
  if (!studentId) {
    return NextResponse.json({ error: "无效的学生 ID" }, { status: 400 });
  }

  let body: { name?: unknown; gender?: unknown; tags?: unknown; class_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
  }

  // 解析各字段（undefined 表示不更新）
  const name = body.name === undefined ? undefined : String(body.name).trim();
  const hasGender = Object.prototype.hasOwnProperty.call(body, "gender");
  const hasTags = Object.prototype.hasOwnProperty.call(body, "tags");
  const hasClassId = Object.prototype.hasOwnProperty.call(body, "class_id");

  let classId: number | undefined;
  if (hasClassId) {
    const raw = body.class_id;
    const n = typeof raw === "string" || typeof raw === "number" ? Number(raw) : NaN;
    if (!Number.isInteger(n) || n <= 0) {
      return NextResponse.json({ error: "无效的班级 ID" }, { status: 400 });
    }
    classId = n;
  }

  // name 校验（如果传了）
  if (name !== undefined) {
    if (!name) {
      return NextResponse.json({ error: "学生姓名不能为空" }, { status: 400 });
    }
    if (name.length > 20) {
      return NextResponse.json(
        { error: "学生姓名不能超过 20 个字符" },
        { status: 400 }
      );
    }
  }

  // gender 校验
  let genderValue: ValidGender | null | undefined;
  if (hasGender) {
    const g = parseGenderStrict(body.gender);
    if (!g.ok) {
      return NextResponse.json({ error: g.error }, { status: 400 });
    }
    genderValue = g.value;
  }

  // tags 处理
  let tagsValue: string | null | undefined;
  if (hasTags) {
    tagsValue = body.tags == null ? null : String(body.tags).trim() || null;
  }

  if (
    name === undefined &&
    !hasGender &&
    !hasTags &&
    !hasClassId
  ) {
    return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
  }

  try {
    const userId = await requireUserId();

    // 如果改了 class_id，先校验新班级归属
    if (classId !== undefined) {
      const classRows = await query<RowDataPacket[]>(
        "SELECT id FROM classes WHERE id = ? AND user_id = ? LIMIT 1",
        [classId, userId]
      );
      if (classRows.length === 0) {
        return NextResponse.json(
          { error: "目标班级不存在或无权限操作" },
          { status: 404 }
        );
      }
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    if (name !== undefined) {
      fields.push("name = ?");
      values.push(name);
    }
    if (hasGender) {
      fields.push("gender = ?");
      values.push(genderValue);
    }
    if (hasTags) {
      fields.push("tags = ?");
      values.push(tagsValue);
    }
    if (hasClassId) {
      fields.push("class_id = ?");
      values.push(classId);
    }

    values.push(studentId, userId);

    const result = await query<ResultSetHeader>(
      `UPDATE students SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: "学生不存在或无权限操作" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("更新学生失败:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

/**
 * DELETE /api/students/[id] — 删除学生（归属校验后删除）
 * 级联：schema 外键 ON DELETE CASCADE 对 students→communication_records 是 SET NULL，
 * 所以删除学生时记录保留但 student_id 变 null。
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const studentId = parseIdParam(params.id);
  if (!studentId) {
    return NextResponse.json({ error: "无效的学生 ID" }, { status: 400 });
  }

  try {
    const userId = await requireUserId();

    const result = await query<ResultSetHeader>(
      "DELETE FROM students WHERE id = ? AND user_id = ?",
      [studentId, userId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: "学生不存在或无权限操作" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("删除学生失败:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
