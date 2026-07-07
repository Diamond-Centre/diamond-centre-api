import { Router, Request, Response } from "express";
import { pool } from "../db";
import { authenticate, requireAdmin, AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { formatDate } from "../utils/date";

const router = Router();

function formatEvent(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    price: Number(row.price),
    currency: row.currency,
    date: formatDate(row.date),
    time: row.time,
    location: row.location,
    category: row.category,
    capacity: row.capacity,
    available_tickets: row.available_tickets,
    image_url: row.image_url,
    status: row.status,
    created_at: (row.created_at as Date).toISOString(),
    updated_at: (row.updated_at as Date).toISOString(),
  };
}

router.get("/", asyncHandler(async (_req: Request, res: Response) => {
  const result = await pool.query(
    `SELECT * FROM events WHERE status = 'published' ORDER BY date ASC, time ASC`
  );
  res.json(result.rows.map(formatEvent));
}));

router.get("/:id", asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query("SELECT * FROM events WHERE id = $1", [req.params.id]);
  const event = result.rows[0];

  if (!event) {
    res.status(404).json({ error: "Not Found", message: "Event not found" });
    return;
  }

  res.json(formatEvent(event));
}));

router.post("/", authenticate, requireAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    title,
    description,
    price,
    currency = "XAF",
    date,
    time,
    location,
    category,
    capacity,
    image_url,
    status: requestedStatus = "draft",
  } = req.body;

  if (!title || price == null || !date || !time || !location || !category || !capacity) {
    res.status(400).json({ error: "Bad Request", message: "Missing required fields" });
    return;
  }

  const status = ["draft", "published", "cancelled", "completed"].includes(requestedStatus)
    ? requestedStatus
    : "draft";

  const result = await pool.query(
    `INSERT INTO events (title, description, price, currency, date, time, location, category, capacity, available_tickets, image_url, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $10, $11)
     RETURNING *`,
    [title, description, price, currency, date, time, location, category, capacity, image_url, status]
  );

  const event = result.rows[0];
  res.status(201).json({
    id: event.id,
    title: event.title,
    price: Number(event.price),
    date: formatDate(event.date),
    status: event.status,
    created_at: event.created_at.toISOString(),
  });
}));

export default router;
