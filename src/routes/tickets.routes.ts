import { Router, Request, Response } from "express";
import { pool } from "../db";
import { generateQrCode } from "../utils/qr";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post(
  "/reserve",
  asyncHandler(async (req: Request, res: Response) => {
    const { event_id, quantity, customer_name, customer_email, customer_phone } = req.body;

    if (!event_id || !quantity || !customer_name || !customer_email || !customer_phone) {
      res.status(400).json({ error: "Bad Request", message: "Missing required fields" });
      return;
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const eventResult = await client.query(
        "SELECT * FROM events WHERE id = $1 AND status = 'published' FOR UPDATE",
        [event_id]
      );
      const event = eventResult.rows[0];

      if (!event) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Not Found", message: "Event not found or not published" });
        return;
      }

      if (event.available_tickets < quantity) {
        await client.query("ROLLBACK");
        res.status(400).json({ error: "Bad Request", message: "Not enough tickets available" });
        return;
      }

      const totalPrice = Number(event.price) * quantity;
      const expiresAt = new Date(`${event.date.toISOString().split("T")[0]}T${event.time}:00Z`);

      const ticketResult = await client.query(
        `INSERT INTO tickets (event_id, quantity, total_price, currency, customer_name, customer_email, customer_phone, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [event_id, quantity, totalPrice, event.currency, customer_name, customer_email, customer_phone, expiresAt]
      );
      const ticket = ticketResult.rows[0];

      await client.query(
        "UPDATE events SET available_tickets = available_tickets - $1, updated_at = NOW() WHERE id = $2",
        [quantity, event_id]
      );

      const qrCodes: string[] = [];
      for (let i = 0; i < quantity; i++) {
        const code = generateQrCode(ticket.id);
        await client.query("INSERT INTO qr_codes (ticket_id, code) VALUES ($1, $2)", [ticket.id, code]);
        qrCodes.push(code);
      }

      await client.query("COMMIT");

      res.status(201).json({
        id: ticket.id,
        event_id: ticket.event_id,
        event_title: event.title,
        quantity: ticket.quantity,
        total_price: Number(ticket.total_price),
        currency: ticket.currency,
        status: ticket.status,
        qr_codes: qrCodes,
        expires_at: ticket.expires_at?.toISOString(),
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const ticketResult = await pool.query(
      `SELECT t.*, e.title AS event_title
       FROM tickets t
       JOIN events e ON e.id = t.event_id
       WHERE t.id = $1`,
      [req.params.id]
    );
    const ticket = ticketResult.rows[0];

    if (!ticket) {
      res.status(404).json({ error: "Not Found", message: "Ticket not found" });
      return;
    }

    const qrResult = await pool.query(
      "SELECT code, validated FROM qr_codes WHERE ticket_id = $1 ORDER BY id",
      [ticket.id]
    );

    res.json({
      id: ticket.id,
      event_id: ticket.event_id,
      event_title: ticket.event_title,
      quantity: ticket.quantity,
      total_price: Number(ticket.total_price),
      currency: ticket.currency,
      status: ticket.status,
      customer_name: ticket.customer_name,
      customer_email: ticket.customer_email,
      qr_codes: qrResult.rows.map((qr) => ({
        code: qr.code,
        validated: qr.validated,
      })),
      created_at: ticket.created_at.toISOString(),
    });
  })
);

export default router;
