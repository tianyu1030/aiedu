import { NextResponse } from "next/server";
import { query, type RowDataPacket } from "@/lib/db";
import { getSession, UnauthorizedError } from "@/lib/auth";

interface UserRow extends RowDataPacket {
  id: number;
  email: string;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) throw new UnauthorizedError();

    const rows = await query<UserRow[]>(
      "SELECT id, email FROM users WHERE id = ?",
      [session.userId]
    );
    const user = rows[0];
    if (!user) throw new UnauthorizedError();

    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email } });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("获取用户信息失败:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
