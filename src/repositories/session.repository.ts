import { randomUUID } from "crypto";
import { pool } from "../db";

export interface UserSessionRecord {
  id: string;
  user_id: number;
  user_agent: string;
  ip: string | null;
  created_at: Date;
  last_seen_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
}

const SESSION_COLUMNS = `id, user_id, user_agent, ip, created_at, last_seen_at, expires_at, revoked_at`;

export class SessionRepository {
  async create(data: {
    userId: number;
    userAgent: string;
    ip: string | null;
    expiresAt: Date;
  }): Promise<UserSessionRecord> {
    const id = randomUUID();
    const result = await pool.query<UserSessionRecord>(
      `INSERT INTO user_sessions (id, user_id, user_agent, ip, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${SESSION_COLUMNS}`,
      [id, data.userId, data.userAgent || "", data.ip, data.expiresAt]
    );
    return result.rows[0];
  }

  async findActiveById(id: string): Promise<UserSessionRecord | null> {
    const result = await pool.query<UserSessionRecord>(
      `SELECT ${SESSION_COLUMNS}
       FROM user_sessions
       WHERE id = $1
         AND revoked_at IS NULL
         AND expires_at > NOW()`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  async listActiveByUser(userId: number): Promise<UserSessionRecord[]> {
    const result = await pool.query<UserSessionRecord>(
      `SELECT ${SESSION_COLUMNS}
       FROM user_sessions
       WHERE user_id = $1
         AND revoked_at IS NULL
         AND expires_at > NOW()
       ORDER BY last_seen_at DESC`,
      [userId]
    );
    return result.rows;
  }

  async touch(id: string): Promise<void> {
    await pool.query(
      `UPDATE user_sessions
       SET last_seen_at = NOW()
       WHERE id = $1 AND revoked_at IS NULL`,
      [id]
    );
  }

  async revokeOthers(userId: number, keepSessionId: string): Promise<number> {
    const result = await pool.query(
      `UPDATE user_sessions
       SET revoked_at = NOW()
       WHERE user_id = $1
         AND id <> $2
         AND revoked_at IS NULL`,
      [userId, keepSessionId]
    );
    return result.rowCount ?? 0;
  }

  async revokeAll(userId: number): Promise<number> {
    const result = await pool.query(
      `UPDATE user_sessions
       SET revoked_at = NOW()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );
    return result.rowCount ?? 0;
  }
}

export const sessionRepository = new SessionRepository();
