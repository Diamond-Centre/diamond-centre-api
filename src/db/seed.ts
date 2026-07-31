import fs from "fs";
import path from "path";
import { pool } from "../db";

function resolveSeedPath(): string {
  const candidates = [
    path.join(__dirname, "seed.sql"),
    path.join(process.cwd(), "src", "db", "seed.sql"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error("seed.sql not found");
}

export async function runSeed(): Promise<void> {
  const sql = fs.readFileSync(resolveSeedPath(), "utf-8");
  await pool.query(sql);
  console.log("Database seeded (events, promotions, tickets, qr_codes, payments)");
  console.log("Users table was not modified");
}

if (require.main === module) {
  runSeed()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
