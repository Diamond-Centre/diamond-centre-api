import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
      console.log("PostgreSQL connection OK");
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("DB connection error:", (error as Error).message);
    return false;
  }
}
