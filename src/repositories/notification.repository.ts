import { pool } from "../db";
import { PoolClient } from "pg";

export type NotificationType =
  | "reservation"
  | "rappel"
  | "info"
  | "annulation"
  | "modification"
  | "remboursement"
  | "certificat";

export interface NotificationRecord {
  id: number;
  user_id: number;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  ticket_id: number | null;
  event_id: number | null;
  change_id: number | null;
  dedupe_key: string | null;
  created_at: Date;
}

export class NotificationRepository {
  async create(
    data: {
      user_id: number;
      type: NotificationType;
      title: string;
      message: string;
      ticket_id?: number | null;
      event_id?: number | null;
      change_id?: number | null;
      dedupe_key?: string | null;
    },
    client?: PoolClient
  ): Promise<NotificationRecord | null> {
    const db = client ?? pool;

    if (data.dedupe_key) {
      const existing = await db.query<{ id: number }>(
        `SELECT id FROM notifications
         WHERE user_id = $1 AND dedupe_key = $2
         LIMIT 1`,
        [data.user_id, data.dedupe_key]
      );
      if (existing.rows[0]) return null;
    }

    const result = await db.query<NotificationRecord>(
      `INSERT INTO notifications
         (user_id, type, title, message, ticket_id, event_id, change_id, dedupe_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.user_id,
        data.type,
        data.title,
        data.message,
        data.ticket_id ?? null,
        data.event_id ?? null,
        data.change_id ?? null,
        data.dedupe_key ?? null,
      ]
    );
    return result.rows[0] ?? null;
  }

  async listForUser(userId: number): Promise<NotificationRecord[]> {
    const result = await pool.query<NotificationRecord>(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [userId]
    );
    return result.rows;
  }

  async markRead(userId: number, id: number): Promise<NotificationRecord | null> {
    const result = await pool.query<NotificationRecord>(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );
    return result.rows[0] ?? null;
  }

  async markAllRead(userId: number): Promise<number> {
    const result = await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );
    return result.rowCount ?? 0;
  }

  async unreadCount(userId: number): Promise<number> {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM notifications
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );
    return parseInt(result.rows[0]?.count ?? "0", 10);
  }
}

export const notificationRepository = new NotificationRepository();
