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

  async findByIdWithEvent(id: number | string): Promise<TicketRecord | null> {
    const result = await pool.query<TicketRecord>(
      `SELECT t.*, e.title AS event_title
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
      `INSERT INTO tickets (event_id, quantity, total_price, currency, customer_name, customer_email, customer_phone, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.event_id,
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

  async confirm(client: PoolClient, ticketId: number): Promise<void> {
    await client.query("UPDATE tickets SET status = 'confirmed' WHERE id = $1", [
      ticketId,
    ]);
  }
}

export const ticketRepository = new TicketRepository();
