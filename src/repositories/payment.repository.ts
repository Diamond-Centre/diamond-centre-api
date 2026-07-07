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
}

export const paymentRepository = new PaymentRepository();
