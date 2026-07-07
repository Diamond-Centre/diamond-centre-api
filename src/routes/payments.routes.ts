import { Router, Request, Response } from "express";
import { pool } from "../db";
import { generatePaymentReference } from "../utils/qr";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post(
  "/initiate",
  asyncHandler(async (req: Request, res: Response) => {
    const { ticket_id, method, phone } = req.body;

    if (!ticket_id || !method || !phone) {
      res.status(400).json({ error: "Bad Request", message: "Missing required fields" });
      return;
    }

    if (!["mtn_momo", "orange_money"].includes(method)) {
      res.status(400).json({ error: "Bad Request", message: "Invalid payment method" });
      return;
    }

    const ticketResult = await pool.query("SELECT * FROM tickets WHERE id = $1", [ticket_id]);
    const ticket = ticketResult.rows[0];

    if (!ticket) {
      res.status(404).json({ error: "Not Found", message: "Ticket not found" });
      return;
    }

    if (ticket.status !== "pending") {
      res.status(400).json({ error: "Bad Request", message: "Ticket is not pending payment" });
      return;
    }

    const reference = generatePaymentReference(method);
    const providerFee = Math.round(Number(ticket.total_price) * 0.005);

    const result = await pool.query(
      `INSERT INTO payments (ticket_id, amount, currency, method, reference, provider_fee)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [ticket_id, ticket.total_price, ticket.currency, method, reference, providerFee]
    );

    const payment = result.rows[0];

    res.status(201).json({
      id: payment.id,
      ticket_id: payment.ticket_id,
      amount: Number(payment.amount),
      currency: payment.currency,
      method: payment.method,
      status: payment.status,
      reference: payment.reference,
      provider_fee: Number(payment.provider_fee),
      created_at: payment.created_at.toISOString(),
    });
  })
);

router.post(
  "/callback/mtn",
  asyncHandler(async (req: Request, res: Response) => {
    const { reference, status, transaction_id } = req.body;

    if (!reference || !status) {
      res.status(400).json({ error: "Bad Request", message: "Missing required fields" });
      return;
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const paymentResult = await client.query(
        "SELECT * FROM payments WHERE reference = $1 FOR UPDATE",
        [reference]
      );
      const payment = paymentResult.rows[0];

      if (!payment) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Not Found", message: "Payment not found" });
        return;
      }

      const paymentStatus = status === "successful" ? "successful" : "failed";
      const paidAt = paymentStatus === "successful" ? new Date() : null;

      await client.query(
        `UPDATE payments SET status = $1, transaction_id = $2, paid_at = $3 WHERE id = $4`,
        [paymentStatus, transaction_id, paidAt, payment.id]
      );

      if (paymentStatus === "successful") {
        await client.query("UPDATE tickets SET status = 'confirmed' WHERE id = $1", [
          payment.ticket_id,
        ]);
      }

      await client.query("COMMIT");
      res.json({ message: "Callback processed", status: paymentStatus });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  })
);

router.get(
  "/:id/status",
  asyncHandler(async (req: Request, res: Response) => {
    const result = await pool.query("SELECT * FROM payments WHERE id = $1", [req.params.id]);
    const payment = result.rows[0];

    if (!payment) {
      res.status(404).json({ error: "Not Found", message: "Payment not found" });
      return;
    }

    res.json({
      id: payment.id,
      ticket_id: payment.ticket_id,
      amount: Number(payment.amount),
      method: payment.method,
      status: payment.status,
      reference: payment.reference,
      paid_at: payment.paid_at?.toISOString() ?? null,
    });
  })
);

export default router;
