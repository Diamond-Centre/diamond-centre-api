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

  async findAll(): Promise<EventRecord[]> {
    const result = await pool.query<EventRecord>(
      `SELECT * FROM events ORDER BY start_date ASC, id DESC`
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

  async findByIdForUpdate(
    client: PoolClient,
    id: number | string
  ): Promise<EventRecord | null> {
    const result = await client.query<EventRecord>(
      "SELECT * FROM events WHERE id = $1 FOR UPDATE",
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
      start_time: string;
      end_time: string;
      location: string;
      latitude?: number | null;
      longitude?: number | null;
      category: string;
      capacity: number;
      image_url?: string;
      status: string;
    }
  ): Promise<EventRecord> {
    const result = await client.query<EventRecord>(
      `INSERT INTO events (
         title, description, price, currency, start_date, end_date,
         start_time, end_time,
         location, latitude, longitude, category, capacity, available_tickets, image_url, status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13, $14, $15)
       RETURNING *`,
      [
        data.title,
        data.description ?? null,
        data.price,
        data.currency,
        data.start_date,
        data.end_date,
        data.start_time,
        data.end_time,
        data.location,
        data.latitude ?? null,
        data.longitude ?? null,
        data.category,
        data.capacity,
        data.image_url ?? null,
        data.status,
      ]
    );
    return result.rows[0];
  }

  async update(
    client: PoolClient,
    id: number,
    data: {
      title: string;
      description: string | null;
      price: number;
      currency: string;
      start_date: string;
      end_date: string;
      start_time: string;
      end_time: string;
      location: string;
      latitude?: number | null;
      longitude?: number | null;
      category: string;
      capacity: number;
      available_tickets: number;
      image_url: string | null;
      status: string;
    }
  ): Promise<EventRecord> {
    const result = await client.query<EventRecord>(
      `UPDATE events SET
         title = $1,
         description = $2,
         price = $3,
         currency = $4,
         start_date = $5,
         end_date = $6,
         start_time = $7,
         end_time = $8,
         location = $9,
         latitude = $10,
         longitude = $11,
         category = $12,
         capacity = $13,
         available_tickets = $14,
         image_url = $15,
         status = $16,
         updated_at = NOW()
       WHERE id = $17
       RETURNING *`,
      [
        data.title,
        data.description,
        data.price,
        data.currency,
        data.start_date,
        data.end_date,
        data.start_time,
        data.end_time,
        data.location,
        data.latitude ?? null,
        data.longitude ?? null,
        data.category,
        data.capacity,
        data.available_tickets,
        data.image_url,
        data.status,
        id,
      ]
    );
    return result.rows[0];
  }

  async delete(client: PoolClient, id: number): Promise<boolean> {
    const result = await client.query("DELETE FROM events WHERE id = $1", [id]);
    return (result.rowCount ?? 0) > 0;
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

  async incrementAvailableTickets(
    client: PoolClient,
    eventId: number,
    quantity: number
  ): Promise<void> {
    await client.query(
      `UPDATE events SET
         available_tickets = LEAST(capacity, available_tickets + $1),
         updated_at = NOW()
       WHERE id = $2`,
      [quantity, eventId]
    );
  }
}

export const eventRepository = new EventRepository();
