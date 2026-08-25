import { NextResponse, type NextRequest } from "next/server";
import { query, type ResultSetHeader } from "@/lib/db";
import { requireUserId, UnauthorizedError } from "@/lib/auth";

const VALID_GRADES = [1, 2, 3, 4, 5, 6];

function parseIdParam(idParam: string): number | null {
  const id = Number(idParam);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** PUT /api/classes/[id] — 更新班级（需归属当前用户） */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const classId = parseIdParam(params.id);
  if (!classId) {
    return NextResponse.json({ error: "无效的班级 ID" }, { status: 400 });
  }

  let body: { name?: unknown; grade?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
  }

  const name = body.name === undefined ? undefined : String(body.name).trim();
  const grade =
    body.grade === undefined
      ? undefined
      : typeof body.grade === "string" || typeof body.grade === "number"
        ? Number(body.grade)
        : NaN;

  if (name !== undefined && !name) {
    return NextResponse.json({ error: "班级名称不能为空" }, { status: 400 });
  }
  if (name !== undefined && name.length > 30) {
    return NextResponse.json(
      { error: "班级名称不能超过 30 个字符" },
      { status: 400 }
    );
  }
  if (grade !== undefined && !VALID_GRADES.includes(grade)) {
    return NextResponse.json(
      { error: "年级必须为 1 至 6 之间的整数" },
      { status: 400 }
    );
  }

  if (name === undefined && grade === undefined) {
    return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
  }

  try {
    const userId = await requireUserId();

    const fields: string[] = [];
    const values: unknown[] = [];

    if (name !== undefined) {
      fields.push("name = ?");
      values.push(name);
    }
    if (grade !== undefined) {
      fields.push("grade = ?");
      values.push(grade);
    }

    values.push(classId, userId);

    const result = await query<ResultSetHeader>(
      `UPDATE classes SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: "班级不存在或无权限操作" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("更新班级失败:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

/** DELETE /api/classes/[id] — 删除班级（级联删除学生/记录） */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const classId = parseIdParam(params.id);
  if (!classId) {
    return NextResponse.json({ error: "无效的班级 ID" }, { status: 400 });
  }

  try {
    const userId = await requireUserId();

    const result = await query<ResultSetHeader>(
      "DELETE FROM classes WHERE id = ? AND user_id = ?",
      [classId, userId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: "班级不存在或无权限操作" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("删除班级失败:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
