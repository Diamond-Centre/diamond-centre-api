import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

function getConnectionString(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const host = process.env.DB_HOST || "localhost";
  const port = process.env.DB_PORT || "5432";
  const database = process.env.DB_NAME || "dice_db";
  const user = process.env.DB_USER || "dice_user";
  const password = process.env.DB_PASSWORD || "password";

  return `postgres://${user}:${password}@${host}:${port}/${database}`;
}

export const pool = new Pool({
  connectionString: getConnectionString(),
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
