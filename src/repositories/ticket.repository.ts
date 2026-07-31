import { PoolClient } from "pg";
import { pool } from "../db";
import { TicketRecord } from "../types";

export class TicketRepository {
  async findById(id: number | string): Promise<TicketRecord | null> {
    const result = await pool.query<TicketRecord>(
      "SELECT * FROM tickets WHERE id = $1",
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findByIdForUpdate(
    client: PoolClient,
    id: number | string
  ): Promise<TicketRecord | null> {
    const result = await client.query<TicketRecord>(
      "SELECT * FROM tickets WHERE id = $1 FOR UPDATE",
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findByIdWithEvent(id: number | string): Promise<
    | (TicketRecord & {
        event_start_date?: Date | string;
        event_end_date?: Date | string;
        event_start_time?: string | Date;
        event_end_time?: string | Date;
        event_location?: string;
      })
    | null
  > {
    const result = await pool.query<
      TicketRecord & {
        event_start_date: Date | string;
        event_end_date: Date | string;
        event_start_time: string | Date;
        event_end_time: string | Date;
        event_location: string;
      }
    >(
      `SELECT t.*, e.title AS event_title,
              e.start_date AS event_start_date,
              e.end_date AS event_end_date,
              e.start_time AS event_start_time,
              e.end_time AS event_end_time,
              e.location AS event_location
       FROM tickets t
       JOIN events e ON e.id = t.event_id
       WHERE t.id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  async create(
    client: PoolClient,
    data: {
      event_id: number;
      booking_id?: string | null;
      quantity: number;
      total_price: number;
      currency: string;
      customer_name: string;
      customer_email: string;
      customer_phone: string;
      expires_at: Date;
    }
  ): Promise<TicketRecord> {
    const result = await client.query<TicketRecord>(
      `INSERT INTO tickets (
         event_id, booking_id, quantity, total_price, currency,
         customer_name, customer_email, customer_phone, expires_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.event_id,
        data.booking_id ?? null,
        data.quantity,
        data.total_price,
        data.currency,
        data.customer_name,
        data.customer_email,
        data.customer_phone,
        data.expires_at,
      ]
    );
    return result.rows[0];
  }

  async findByBookingId(
    client: PoolClient | typeof pool,
    bookingId: string
  ): Promise<TicketRecord[]> {
    const result = await client.query<TicketRecord>(
      `SELECT * FROM tickets WHERE booking_id = $1 ORDER BY id ASC`,
      [bookingId]
    );
    return result.rows;
  }

  async findByBookingIdForUpdate(
    client: PoolClient,
    bookingId: string
  ): Promise<TicketRecord[]> {
    const result = await client.query<TicketRecord>(
      `SELECT * FROM tickets WHERE booking_id = $1 ORDER BY id ASC FOR UPDATE`,
      [bookingId]
    );
    return result.rows;
  }

  async confirm(client: PoolClient, ticketId: number): Promise<void> {
    await client.query(
      "UPDATE tickets SET status = 'confirme' WHERE id = $1 AND status = 'confirme'",
      [ticketId]
    );
  }

  async confirmMany(client: PoolClient, ticketIds: number[]): Promise<void> {
    if (!ticketIds.length) return;
    await client.query(
      `UPDATE tickets SET status = 'confirme' WHERE id = ANY($1::int[])`,
      [ticketIds]
    );
  }

  async markScanned(client: PoolClient, ticketId: number): Promise<void> {
    await client.query(
      `UPDATE tickets SET status = 'scanne' WHERE id = $1 AND status = 'confirme'`,
      [ticketId]
    );
  }

  async markExpired(client: PoolClient, ticketId: number): Promise<void> {
    await client.query(
      `UPDATE tickets SET status = 'expire' WHERE id = $1 AND status = 'confirme'`,
      [ticketId]
    );
  }

  /** Mark unpaid/unused confirme tickets past expires_at as expire. */
  async expireOverdue(): Promise<number> {
    const result = await pool.query(
      `UPDATE tickets
          SET status = 'expire'
        WHERE status = 'confirme'
          AND expires_at IS NOT NULL
          AND expires_at < NOW()`
    );
    return result.rowCount ?? 0;
  }

  async updateEventId(
    client: PoolClient,
    ticketId: number,
    eventId: number
  ): Promise<void> {
    await client.query("UPDATE tickets SET event_id = $1 WHERE id = $2", [
      eventId,
      ticketId,
    ]);
  }

  async markRefunded(client: PoolClient, ticketId: number): Promise<void> {
    await client.query(
      `UPDATE tickets SET status = 'rembourse'
        WHERE id = $1 AND status IN ('confirme', 'scanne', 'expire')`,
      [ticketId]
    );
  }

  async findConfirmedByEventId(
    client: PoolClient,
    eventId: number
  ): Promise<TicketRecord[]> {
    const result = await client.query<TicketRecord>(
      `SELECT * FROM tickets
       WHERE event_id = $1 AND status = 'confirme'`,
      [eventId]
    );
    return result.rows;
  }

  async findConfirmedByEventIdPool(eventId: number): Promise<TicketRecord[]> {
    const result = await pool.query<TicketRecord>(
      `SELECT * FROM tickets
       WHERE event_id = $1 AND status = 'confirme'
       ORDER BY id ASC`,
      [eventId]
    );
    return result.rows;
  }

  /** Participants for whom an admin may issue a formation certificate */
  async findIssuableByEventId(
    client: PoolClient,
    eventId: number
  ): Promise<TicketRecord[]> {
    const result = await client.query<TicketRecord>(
      `SELECT * FROM tickets
       WHERE event_id = $1 AND status IN ('confirme', 'scanne')
       ORDER BY id ASC`,
      [eventId]
    );
    return result.rows;
  }

  async findIssuableByEventIdPool(eventId: number): Promise<TicketRecord[]> {
    const result = await pool.query<TicketRecord>(
      `SELECT * FROM tickets
       WHERE event_id = $1 AND status IN ('confirme', 'scanne')
       ORDER BY id ASC`,
      [eventId]
    );
    return result.rows;
  }

  async listAll(): Promise<
    Array<
      TicketRecord & {
        event_title: string;
        event_start_date: Date | string;
        event_end_date: Date | string;
        event_start_time: string | Date;
        event_end_time: string | Date;
        event_location: string;
      }
    >
  > {
    const result = await pool.query<
      TicketRecord & {
        event_title: string;
        event_start_date: Date | string;
        event_end_date: Date | string;
        event_start_time: string | Date;
        event_end_time: string | Date;
        event_location: string;
      }
    >(
      `SELECT t.*, e.title AS event_title,
              e.start_date AS event_start_date,
              e.end_date AS event_end_date,
              e.start_time AS event_start_time,
              e.end_time AS event_end_time,
              e.location AS event_location
       FROM tickets t
       JOIN events e ON e.id = t.event_id
       ORDER BY t.created_at DESC, t.id DESC`
    );
    return result.rows;
  }
}

export const ticketRepository = new TicketRepository();
