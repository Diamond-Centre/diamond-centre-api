import { PoolClient } from "pg";
import { pool } from "../db";
import { EventRecord } from "../types";

export class EventRepository {
  async findPublished(): Promise<EventRecord[]> {
    const result = await pool.query<EventRecord>(
      `SELECT * FROM events WHERE status = 'published' ORDER BY start_date ASC`
    );
    return result.rows;
  }

  async findById(id: number | string): Promise<EventRecord | null> {
    const result = await pool.query<EventRecord>(
      "SELECT * FROM events WHERE id = $1",
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findPublishedForUpdate(
    client: PoolClient,
    id: number
  ): Promise<EventRecord | null> {
    const result = await client.query<EventRecord>(
      "SELECT * FROM events WHERE id = $1 AND status = 'published' FOR UPDATE",
      [id]
    );
    return result.rows[0] ?? null;
  }

  async create(
    client: PoolClient,
    data: {
      title: string;
      description?: string;
      price: number;
      currency: string;
      start_date: string;
      end_date: string;
      location: string;
      category: string;
      capacity: number;
      image_url?: string;
      status: string;
    }
  ): Promise<EventRecord> {
    const result = await client.query<EventRecord>(
      `INSERT INTO events (
         title, description, price, currency, start_date, end_date,
         location, category, capacity, available_tickets, image_url, status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $10, $11)
       RETURNING *`,
      [
        data.title,
        data.description ?? null,
        data.price,
        data.currency,
        data.start_date,
        data.end_date,
        data.location,
        data.category,
        data.capacity,
        data.image_url ?? null,
        data.status,
      ]
    );
    return result.rows[0];
  }

  async decrementAvailableTickets(
    client: PoolClient,
    eventId: number,
    quantity: number
  ): Promise<void> {
    await client.query(
      "UPDATE events SET available_tickets = available_tickets - $1, updated_at = NOW() WHERE id = $2",
      [quantity, eventId]
    );
  }
}

export const eventRepository = new EventRepository();
