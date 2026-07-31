import { PoolClient } from "pg";
import { pool } from "../db";
import { QrCodeRecord } from "../types";

export class QrCodeRepository {
  async create(
    client: PoolClient,
    ticketId: number,
    code: string,
    entryCode: string
  ): Promise<void> {
    await client.query(
      "INSERT INTO qr_codes (ticket_id, code, entry_code) VALUES ($1, $2, $3)",
      [ticketId, code, entryCode]
    );
  }

  async findByTicketId(ticketId: number): Promise<
    Array<{ code: string; entry_code: string; validated: boolean }>
  > {
    const result = await pool.query<{
      code: string;
      entry_code: string;
      validated: boolean;
    }>(
      `SELECT code, entry_code, validated
       FROM qr_codes
       WHERE ticket_id = $1
       ORDER BY id`,
      [ticketId]
    );
    return result.rows;
  }

  async findByTicketIds(ticketIds: number[]): Promise<
    Array<{
      ticket_id: number;
      code: string;
      entry_code: string;
      validated: boolean;
    }>
  > {
    if (ticketIds.length === 0) return [];
    const result = await pool.query<{
      ticket_id: number;
      code: string;
      entry_code: string;
      validated: boolean;
    }>(
      `SELECT ticket_id, code, entry_code, validated
       FROM qr_codes
       WHERE ticket_id = ANY($1::int[])
       ORDER BY id`,
      [ticketIds]
    );
    return result.rows;
  }

  async findByCodeForUpdate(
    client: PoolClient,
    code: string
  ): Promise<QrCodeRecord | null> {
    const result = await client.query<QrCodeRecord>(
      `SELECT q.*, t.id AS ticket_id, t.customer_name, t.status AS ticket_status, e.title AS event_title
       FROM qr_codes q
       JOIN tickets t ON t.id = q.ticket_id
       JOIN events e ON e.id = t.event_id
       WHERE q.code = $1
       FOR UPDATE`,
      [code]
    );
    return result.rows[0] ?? null;
  }

  async findByEntryCodeForUpdate(
    client: PoolClient,
    entryCode: string
  ): Promise<QrCodeRecord | null> {
    const result = await client.query<QrCodeRecord>(
      `SELECT q.*, t.id AS ticket_id, t.customer_name, t.status AS ticket_status, e.title AS event_title
       FROM qr_codes q
       JOIN tickets t ON t.id = q.ticket_id
       JOIN events e ON e.id = t.event_id
       WHERE q.entry_code = $1
       FOR UPDATE`,
      [entryCode]
    );
    return result.rows[0] ?? null;
  }

  async entryCodeExists(
    client: PoolClient,
    entryCode: string
  ): Promise<boolean> {
    const result = await client.query(
      "SELECT 1 FROM qr_codes WHERE entry_code = $1 LIMIT 1",
      [entryCode]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async markValidated(
    client: PoolClient,
    qrId: number,
    validatedAt: Date
  ): Promise<void> {
    await client.query(
      "UPDATE qr_codes SET validated = TRUE, validated_at = $1 WHERE id = $2",
      [validatedAt, qrId]
    );
  }
}

export const qrCodeRepository = new QrCodeRepository();
