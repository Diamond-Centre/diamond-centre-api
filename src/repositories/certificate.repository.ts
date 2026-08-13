import { pool } from "../db";
import { PoolClient } from "pg";
import { CertificateRecord } from "../types";

export class CertificateRepository {
  async create(
    client: PoolClient,
    data: {
      code: string;
      event_id: number;
      ticket_id: number;
      user_id: number | null;
      recipient_name: string;
      recipient_email: string;
      formation_title: string;
      issued_by: number;
    }
  ): Promise<CertificateRecord> {
    const result = await client.query<CertificateRecord>(
      `INSERT INTO certificates (
         code, event_id, ticket_id, user_id, recipient_name, recipient_email,
         formation_title, issued_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.code,
        data.event_id,
        data.ticket_id,
        data.user_id,
        data.recipient_name,
        data.recipient_email,
        data.formation_title,
        data.issued_by,
      ]
    );
    return result.rows[0];
  }

  async findByTicketId(
    ticketId: number,
    client: PoolClient | typeof pool = pool
  ): Promise<CertificateRecord | null> {
    const result = await client.query<CertificateRecord>(
      "SELECT * FROM certificates WHERE ticket_id = $1",
      [ticketId]
    );
    return result.rows[0] ?? null;
  }

  async findByCode(code: string): Promise<CertificateRecord | null> {
    const result = await pool.query<CertificateRecord>(
      `SELECT c.*,
              e.start_date AS event_start_date,
              e.end_date AS event_end_date,
              e.location AS event_location,
              u.name AS issuer_name
       FROM certificates c
       JOIN events e ON e.id = c.event_id
       JOIN users u ON u.id = c.issued_by
       WHERE c.code = $1`,
      [code]
    );
    return result.rows[0] ?? null;
  }

  async findById(id: number): Promise<CertificateRecord | null> {
    const result = await pool.query<CertificateRecord>(
      `SELECT c.*,
              e.start_date AS event_start_date,
              e.end_date AS event_end_date,
              e.location AS event_location,
              u.name AS issuer_name
       FROM certificates c
       JOIN events e ON e.id = c.event_id
       JOIN users u ON u.id = c.issued_by
       WHERE c.id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findByEventId(eventId: number): Promise<CertificateRecord[]> {
    const result = await pool.query<CertificateRecord>(
      `SELECT c.*,
              e.start_date AS event_start_date,
              e.end_date AS event_end_date,
              e.location AS event_location,
              u.name AS issuer_name
       FROM certificates c
       JOIN events e ON e.id = c.event_id
       JOIN users u ON u.id = c.issued_by
       WHERE c.event_id = $1
       ORDER BY c.issued_at DESC`,
      [eventId]
    );
    return result.rows;
  }

  async findByRecipientEmail(email: string): Promise<CertificateRecord[]> {
    const result = await pool.query<CertificateRecord>(
      `SELECT c.*,
              e.start_date AS event_start_date,
              e.end_date AS event_end_date,
              e.location AS event_location,
              u.name AS issuer_name
       FROM certificates c
       JOIN events e ON e.id = c.event_id
       JOIN users u ON u.id = c.issued_by
       WHERE LOWER(c.recipient_email) = LOWER($1)
       ORDER BY c.issued_at DESC`,
      [email]
    );
    return result.rows;
  }

  async findExistingTicketIds(
    client: PoolClient,
    ticketIds: number[]
  ): Promise<Set<number>> {
    if (ticketIds.length === 0) return new Set();
    const result = await client.query<{ ticket_id: number }>(
      `SELECT ticket_id FROM certificates WHERE ticket_id = ANY($1::int[])`,
      [ticketIds]
    );
    return new Set(result.rows.map((row) => row.ticket_id));
  }
}

export const certificateRepository = new CertificateRepository();
