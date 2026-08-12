import { Pool, PoolConfig } from "pg";
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

function buildPoolConfig(): PoolConfig {
  const connectionString = getConnectionString();
  const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
  const needsSsl =
    (!isLocal &&
      (/sslmode=require/i.test(connectionString) ||
        /\.neon\.tech/i.test(connectionString) ||
        process.env.NODE_ENV === "production" ||
        process.env.DB_SSL === "true")) ||
    process.env.DB_SSL === "true";

  const config: PoolConfig = { connectionString };

  if (needsSsl) {
    // Neon requires TLS. Set DB_SSL_REJECT_UNAUTHORIZED=false only if needed.
    config.ssl = {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false",
    };
  }

  return config;
}

export const pool = new Pool(buildPoolConfig());

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
