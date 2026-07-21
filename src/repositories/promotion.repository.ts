import { PoolClient } from "pg";
import { pool } from "../db";
import { PromotionRecord } from "../types";

export class PromotionRepository {
  async findByEventId(eventId: number | string): Promise<PromotionRecord | null> {
    const result = await pool.query<PromotionRecord>(
      "SELECT * FROM promotions WHERE event_id = $1",
      [eventId]
    );
    return result.rows[0] ?? null;
  }

  async findByEventIds(eventIds: number[]): Promise<PromotionRecord[]> {
    if (eventIds.length === 0) {
      return [];
    }

    const result = await pool.query<PromotionRecord>(
      "SELECT * FROM promotions WHERE event_id = ANY($1::int[])",
      [eventIds]
    );
    return result.rows;
  }

  async create(
    client: PoolClient,
    data: {
      event_id: number;
      nombre: number;
      sexe: string;
      pourcentage: number;
      duree: number;
      description?: string;
    }
  ): Promise<PromotionRecord> {
    const result = await client.query<PromotionRecord>(
      `INSERT INTO promotions (event_id, nombre, sexe, pourcentage, duree, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.event_id,
        data.nombre,
        data.sexe,
        data.pourcentage,
        data.duree,
        data.description ?? null,
      ]
    );
    return result.rows[0];
  }
}

export const promotionRepository = new PromotionRepository();
