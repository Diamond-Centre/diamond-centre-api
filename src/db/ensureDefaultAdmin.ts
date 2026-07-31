import bcrypt from "bcryptjs";
import { pool } from "../db";

/** Ensures a default admin exists for first-time setup. */
export async function ensureDefaultAdmin(): Promise<void> {
  const email = process.env.DEFAULT_ADMIN_EMAIL || "admin@dice.cm";
  const password = process.env.DEFAULT_ADMIN_PASSWORD || "Admin@123";
  const name = process.env.DEFAULT_ADMIN_NAME || "Admin DiCe";

  const existing = await pool.query(
    `SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1`,
    [email]
  );
  if (existing.rows[0]) {
    console.log(`Default admin already present (${email})`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users (email, password_hash, name, role, telephone, sexe, picture)
     VALUES ($1, $2, $3, 'admin', $4, 'homme', $5)`,
    [
      email.toLowerCase(),
      passwordHash,
      name,
      "+237600000000",
      `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0A89F2&color=fff`,
    ]
  );
  console.log(`Default admin created: ${email} / ${password}`);
}
