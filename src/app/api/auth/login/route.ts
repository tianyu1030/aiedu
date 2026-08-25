import { NextResponse, type NextRequest } from "next/server";
import { query, type RowDataPacket } from "@/lib/db";
import { comparePassword, signToken, setAuthCookie } from "@/lib/auth";

interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  password_hash: string;
}

export async function POST(request: NextRequest) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email || !password) {
    return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
  }

  const rows = await query<UserRow[]>(
    "SELECT id, email, password_hash FROM users WHERE email = ?",
    [email]
  );
  const user = rows[0];

  // 统一返回 401，防止邮箱枚举
  if (!user || !(await comparePassword(password, user.password_hash))) {
    return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
  }

  const token = await signToken(user.id);
  const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email } });
  setAuthCookie(res, token);
  return res;
}
