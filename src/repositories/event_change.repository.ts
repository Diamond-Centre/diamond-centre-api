import { PoolClient } from "pg";
import { pool } from "../db";
import { formatDate, formatTime } from "../utils/date";

export interface ScheduleChangeRecord {
  id: number;
  event_id: number;
  old_start_date: Date | string;
  old_end_date: Date | string;
  old_start_time: string | Date;
  old_end_time: string | Date;
  old_location: string;
  new_start_date: Date | string;
  new_end_date: Date | string;
  new_start_time: string | Date;
  new_end_time: string | Date;
  new_location: string;
  created_by: number | null;
  created_at: Date;
  event_title?: string;
}

export interface TicketChangeResponseRecord {
  id: number;
  change_id: number;
  ticket_id: number;
  status: "pending" | "accepted" | "swapped" | "refunded";
  alternative_event_id: number | null;
  updated_at: Date;
}

export class EventChangeRepository {
  async createChange(
    client: PoolClient,
    data: {
      event_id: number;
      old_start_date: string;
      old_end_date: string;
      old_start_time: string;
      old_end_time: string;
      old_location: string;
      new_start_date: string;
      new_end_date: string;
      new_start_time: string;
      new_end_time: string;
      new_location: string;
      created_by: number | null;
    }
  ): Promise<ScheduleChangeRecord> {
    const result = await client.query<ScheduleChangeRecord>(
      `INSERT INTO event_schedule_changes (
         event_id,
         old_start_date, old_end_date, old_start_time, old_end_time, old_location,
         new_start_date, new_end_date, new_start_time, new_end_time, new_location,
         created_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        data.event_id,
        data.old_start_date,
        data.old_end_date,
        data.old_start_time,
        data.old_end_time,
        data.old_location,
        data.new_start_date,
        data.new_end_date,
        data.new_start_time,
        data.new_end_time,
        data.new_location,
        data.created_by,
      ]
    );
    return result.rows[0];
  }

  async findChangeById(
    id: number | string
  ): Promise<ScheduleChangeRecord | null> {
    const result = await pool.query<ScheduleChangeRecord>(
      `SELECT c.*, e.title AS event_title
       FROM event_schedule_changes c
       JOIN events e ON e.id = c.event_id
       WHERE c.id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  async createResponse(
    client: PoolClient,
    changeId: number,
    ticketId: number
  ): Promise<TicketChangeResponseRecord> {
    const result = await client.query<TicketChangeResponseRecord>(
      `INSERT INTO ticket_change_responses (change_id, ticket_id, status)
       VALUES ($1, $2, 'pending')
       ON CONFLICT (change_id, ticket_id) DO UPDATE
         SET status = ticket_change_responses.status
       RETURNING *`,
      [changeId, ticketId]
    );
    return result.rows[0];
  }

  async findResponse(
    changeId: number,
    ticketId: number,
    client?: PoolClient
  ): Promise<TicketChangeResponseRecord | null> {
    const db = client ?? pool;
    const result = await db.query<TicketChangeResponseRecord>(
      `SELECT * FROM ticket_change_responses
       WHERE change_id = $1 AND ticket_id = $2`,
      [changeId, ticketId]
    );
    return result.rows[0] ?? null;
  }

  async updateResponseStatus(
    client: PoolClient,
    changeId: number,
    ticketId: number,
    status: "accepted" | "swapped" | "refunded",
    alternativeEventId?: number | null
  ): Promise<TicketChangeResponseRecord | null> {
    const result = await client.query<TicketChangeResponseRecord>(
      `UPDATE ticket_change_responses
       SET status = $1,
           alternative_event_id = COALESCE($2, alternative_event_id),
           updated_at = NOW()
       WHERE change_id = $3 AND ticket_id = $4
       RETURNING *`,
      [status, alternativeEventId ?? null, changeId, ticketId]
    );
    return result.rows[0] ?? null;
  }

  toChangeResponse(change: ScheduleChangeRecord) {
    return {
      id: change.id,
      event_id: change.event_id,
      event_title: change.event_title ?? null,
      old_start_date: formatDate(change.old_start_date),
      old_end_date: formatDate(change.old_end_date),
      old_start_time: formatTime(change.old_start_time),
      old_end_time: formatTime(change.old_end_time),
      old_location: change.old_location,
      new_start_date: formatDate(change.new_start_date),
      new_end_date: formatDate(change.new_end_date),
      new_start_time: formatTime(change.new_start_time),
      new_end_time: formatTime(change.new_end_time),
      new_location: change.new_location,
      created_at: change.created_at,
    };
  }
}

export const eventChangeRepository = new EventChangeRepository();
