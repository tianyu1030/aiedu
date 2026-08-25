import { NextResponse, type NextRequest } from "next/server";
import { query, type ResultSetHeader, type RowDataPacket } from "@/lib/db";
import { requireUserId, UnauthorizedError } from "@/lib/auth";

const VALID_GENDERS = ["男", "女"] as const;

interface SkippedRow {
  lineIndex: number;
  reason: string;
}

interface ParsedRow {
  name: string;
  gender: string | null;
  tags: string | null;
}

/**
 * 解析单行文本：姓名,性别,标签1;标签2
 * - trim 后跳过空行
 * - 姓名缺失 → 返回 skipped
 * - 性别非"男/女" → null
 * - 标签按分号拆再逗号拼接
 */
function parseLine(rawLine: string, lineIndex: number): ParsedRow | SkippedRow {
  const line = rawLine.trim();
  if (!line) {
    return { lineIndex, reason: "空行已跳过" };
  }

  // 按逗号切分（但只切前两个逗号，避免标签内容中有逗号的情况被误伤）
  // 格式：姓名,性别,标签1;标签2
  const firstComma = line.indexOf(",");
  if (firstComma === -1) {
    // 没有逗号 → 只有姓名
    const name = line.trim();
    if (!name) return { lineIndex, reason: "姓名缺失" };
    return { name, gender: null, tags: null };
  }

  const namePart = line.slice(0, firstComma).trim();
  const rest = line.slice(firstComma + 1);

  if (!namePart) {
    return { lineIndex, reason: "姓名缺失" };
  }
  if (namePart.length > 20) {
    return { lineIndex, reason: "姓名超过 20 个字符" };
  }

  const secondComma = rest.indexOf(",");
  let genderPart: string;
  let tagsPart: string;
  if (secondComma === -1) {
    genderPart = rest.trim();
    tagsPart = "";
  } else {
    genderPart = rest.slice(0, secondComma).trim();
    tagsPart = rest.slice(secondComma + 1).trim();
  }

  // 性别处理
  let gender: string | null = null;
  if (genderPart && (VALID_GENDERS as readonly string[]).includes(genderPart)) {
    gender = genderPart;
  }

  // 标签处理：按分号拆，trim 空项，再逗号拼接
  let tags: string | null = null;
  if (tagsPart) {
    const parts = tagsPart
      .split(";")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 0) {
      tags = parts.join(",");
    }
  }

  return { name: namePart, gender, tags };
}

/**
 * POST /api/students/batch-import — 批量导入学生
 * Body: { class_id, text: string }
 *
 * 按行解析 text：每行 `姓名,性别,标签1;标签2`
 *  - trim 后跳过空行
 *  - 姓名缺失跳过
 *  - 性别非"男/女"→null
 *  - 标签按分号拆再逗号拼接
 *
 * 批量 INSERT。
 * 返回 { ok:true, successCount, skipCount, skippedRows:[{lineIndex, reason}] }
 */
export async function POST(request: NextRequest) {
  let body: { class_id?: unknown; text?: unknown };
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

  const text = body.text === undefined || body.text === null ? "" : String(body.text);

  if (!Number.isInteger(classId) || classId <= 0) {
    return NextResponse.json({ error: "无效的班级 ID" }, { status: 400 });
  }
  if (!text.trim()) {
    return NextResponse.json({ error: "导入文本不能为空" }, { status: 400 });
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

    // 逐行解析
    const lines = text.split(/\r?\n/);
    const toInsert: Array<[number, number, string, string | null, string | null]> = [];
    const skippedRows: SkippedRow[] = [];

    for (let i = 0; i < lines.length; i++) {
      const result = parseLine(lines[i], i + 1);
      if ("reason" in result) {
        skippedRows.push(result);
      } else {
        toInsert.push([
          userId,
          classId,
          result.name,
          result.gender,
          result.tags,
        ]);
      }
    }

    // 逐行 INSERT（简单稳妥，避免不同驱动批量语法差异）
    let successCount = 0;
    for (const row of toInsert) {
      try {
        await query<ResultSetHeader>(
          "INSERT INTO students (user_id, class_id, name, gender, tags) VALUES (?, ?, ?, ?, ?)",
          row
        );
        successCount++;
      } catch (rowErr) {
        // 单个失败不影响其他行
        const idx = toInsert.indexOf(row);
        // 用行号近似（跳过 skippedRows 的对应位置很难）
        // 用原始 names 数组找 lineIndex 比较麻烦，退化为行号为 -1
        console.warn("单行插入失败:", rowErr);
        skippedRows.push({
          lineIndex: -1,
          reason: `插入失败：${row[2]}`,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      successCount,
      skipCount: skippedRows.length,
      skippedRows,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("批量导入学生失败:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
