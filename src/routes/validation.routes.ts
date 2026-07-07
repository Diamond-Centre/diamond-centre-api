import { Router, Response } from "express";
import { pool } from "../db";
import { authenticate, requireAdmin, AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post(
  "/scan",
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { qr_code } = req.body;

    if (!qr_code) {
      res.status(400).json({ error: "Bad Request", message: "qr_code is required" });
      return;
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const qrResult = await client.query(
        `SELECT q.*, t.id AS ticket_id, t.customer_name, t.status AS ticket_status, e.title AS event_title
         FROM qr_codes q
         JOIN tickets t ON t.id = q.ticket_id
         JOIN events e ON e.id = t.event_id
         WHERE q.code = $1
         FOR UPDATE`,
        [qr_code]
      );
      const qr = qrResult.rows[0];

      if (!qr) {
        await client.query("ROLLBACK");
        res.json({ valid: false, error: "Invalid QR code" });
        return;
      }

      if (qr.ticket_status !== "confirmed") {
        await client.query("ROLLBACK");
        res.json({ valid: false, error: "Ticket not confirmed" });
        return;
      }

      if (qr.validated) {
        await client.query("ROLLBACK");
        res.json({ valid: false, error: "Ticket already validated" });
        return;
      }

      const validatedAt = new Date();
      await client.query(
        "UPDATE qr_codes SET validated = TRUE, validated_at = $1 WHERE id = $2",
        [validatedAt, qr.id]
      );

      await client.query("COMMIT");

      res.json({
        valid: true,
        ticket_id: qr.ticket_id,
        event_title: qr.event_title,
        customer_name: qr.customer_name,
        validated_at: validatedAt.toISOString(),
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  })
);

export default router;
