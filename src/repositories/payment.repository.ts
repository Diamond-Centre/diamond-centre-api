import { PoolClient } from "pg";
import { pool } from "../db";
import { PaymentRecord } from "../types";

export class PaymentRepository {
  async findById(id: number | string): Promise<PaymentRecord | null> {
    const result = await pool.query<PaymentRecord>(
      "SELECT * FROM payments WHERE id = $1",
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findByReferenceForUpdate(
    client: PoolClient,
    reference: string
  ): Promise<PaymentRecord | null> {
    const result = await client.query<PaymentRecord>(
      "SELECT * FROM payments WHERE reference = $1 FOR UPDATE",
      [reference]
    );
    return result.rows[0] ?? null;
  }

  async create(data: {
    ticket_id: number;
    amount: number | string;
    currency: string;
    method: string;
    reference: string;
    provider_fee: number;
  }): Promise<PaymentRecord> {
    const result = await pool.query<PaymentRecord>(
      `INSERT INTO payments (ticket_id, amount, currency, method, reference, provider_fee)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.ticket_id,
        data.amount,
        data.currency,
        data.method,
        data.reference,
        data.provider_fee,
      ]
    );
    return result.rows[0];
  }

  async updateStatus(
    client: PoolClient,
    paymentId: number,
    status: string,
    transactionId: string | undefined,
    paidAt: Date | null
  ): Promise<void> {
    await client.query(
      `UPDATE payments SET status = $1, transaction_id = $2, paid_at = $3 WHERE id = $4`,
      [status, transactionId ?? null, paidAt, paymentId]
    );
  }

  async refundByTicketId(
    client: PoolClient,
    ticketId: number
  ): Promise<void> {
    await client.query(
      `UPDATE payments SET status = 'refunded' WHERE ticket_id = $1 AND status = 'successful'`,
      [ticketId]
    );
  }

  async hasSuccessfulForTicket(
    ticketId: number,
    client?: PoolClient
  ): Promise<boolean> {
    const db = client ?? pool;
    const result = await db.query(
      `SELECT 1 FROM payments
        WHERE ticket_id = $1 AND status = 'successful'
        LIMIT 1`,
      [ticketId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async hasSuccessfulForBooking(
    bookingId: string,
    client?: PoolClient
  ): Promise<boolean> {
    const db = client ?? pool;
    const result = await db.query(
      `SELECT 1
         FROM payments p
         JOIN tickets t ON t.id = p.ticket_id
        WHERE t.booking_id = $1 AND p.status = 'successful'
        LIMIT 1`,
      [bookingId]
    );
    return (result.rowCount ?? 0) > 0;
  }
}

export const paymentRepository = new PaymentRepository();
