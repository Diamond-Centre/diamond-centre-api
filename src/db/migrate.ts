import fs from "fs";
import path from "path";
import { pool } from "../db";

function resolveSchemaPath(): string {
  const candidates = [
    path.join(__dirname, "schema.sql"),
    path.join(process.cwd(), "src", "db", "schema.sql"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error("schema.sql not found");
}

export async function runMigrations(): Promise<void> {
  const schema = fs.readFileSync(resolveSchemaPath(), "utf-8");
  await pool.query(schema);
  console.log("Database migrations applied");
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
