import { query, type RowDataPacket, type ResultSetHeader } from "./db";

/** 校验 userId 为有效正整数，否则抛错（防止未隔离查询）。 */
export function assertUserId(userId: number): number {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("无效的 userId，拒绝执行未隔离查询");
  }
  return userId;
}

/**
 * 业务查询封装：先校验 userId，再执行 SQL。
 * 约定：所有业务表（classes / students / communication_records）查询 SQL 必须在
 * WHERE 中包含 `user_id = ?` 并把 userId 放入 params。
 * 开发环境下若 SQL 未出现 user_id 将输出警告，提醒补充隔离条件。
 */
export async function scopedQuery<T = RowDataPacket[] | ResultSetHeader>(
  userId: number,
  sql: string,
  params: unknown[] = []
): Promise<T> {
  assertUserId(userId);
  if (process.env.NODE_ENV !== "production" && !/user_id/i.test(sql)) {
    console.warn(
      "[scopedQuery] SQL 未包含 user_id 过滤条件，请确认是否需要隔离：",
      sql
    );
  }
  return query<T>(sql, params);
}
