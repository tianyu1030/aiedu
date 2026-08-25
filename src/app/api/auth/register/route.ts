import { NextResponse, type NextRequest } from "next/server";
import { query, type ResultSetHeader } from "@/lib/db";
import { hashPassword, signToken, setAuthCookie } from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);

  try {
    const result = await query<ResultSetHeader>(
      "INSERT INTO users (email, password_hash) VALUES (?, ?)",
      [email, passwordHash]
    );
    const userId = result.insertId;
    const token = await signToken(userId);
    const res = NextResponse.json({ ok: true, user: { id: userId, email } });
    setAuthCookie(res, token);
    return res;
  } catch (err) {
    const e = err as { code?: string; errno?: number };
    if (e?.code === "ER_DUP_ENTRY" || e?.errno === 1062) {
      return NextResponse.json({ error: "该邮箱已注册" }, { status: 409 });
    }
    console.error("注册失败:", err);
    return NextResponse.json({ error: "注册失败，请稍后重试" }, { status: 500 });
  }
}
