import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const COOKIE_NAME = "token";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 天

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET 未配置");
  return new TextEncoder().encode(secret);
}

/* ----------------------------- 密码工具 ----------------------------- */

/** bcrypt 哈希，cost = 10。 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/** 校验明文密码与哈希是否匹配。 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/* ----------------------------- JWT 工具 ----------------------------- */

/** 签发 JWT（HS256，7 天有效）。统一使用 jose，与 middleware 校验同一实现。 */
export async function signToken(userId: number): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

/** 校验 JWT，成功返回 { userId }，失败返回 null。 */
export async function verifyToken(token: string): Promise<{ userId: number } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ["HS256"],
    });
    const userId = Number((payload as JWTPayload & { userId?: number }).userId);
    if (!Number.isFinite(userId)) return null;
    return { userId };
  } catch {
    return null;
  }
}

/* ----------------------------- 会话工具 ----------------------------- */

/** 读取当前登录会话，未登录返回 null。 */
export async function getSession(): Promise<{ userId: number } | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** 未登录错误（含 401 状态码，便于路由捕获）。 */
export class UnauthorizedError extends Error {
  status = 401;
  constructor(message = "未登录") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/** 要求已登录，否则抛出 UnauthorizedError（401）。 */
export async function requireUserId(): Promise<number> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  return session.userId;
}

/* ----------------------------- Cookie 工具 ----------------------------- */

/** 在 NextResponse 上写入鉴权 Cookie。 */
export function setAuthCookie(res: NextResponse, token: string): void {
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_TTL_SECONDS,
  });
}

/** 清除鉴权 Cookie。 */
export function clearAuthCookie(res: NextResponse): void {
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export const AUTH_COOKIE_NAME = COOKIE_NAME;
