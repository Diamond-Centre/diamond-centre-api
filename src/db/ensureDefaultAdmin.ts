import bcrypt from "bcryptjs";
import { pool } from "../db";

/**
 * Ensures one bootstrap super_admin exists.
 * Only this account can create other admins via POST /api/users/admins.
 */
export async function ensureDefaultAdmin(): Promise<void> {
  const email = (process.env.DEFAULT_ADMIN_EMAIL || "admin@dice.cm").toLowerCase();
  const password = process.env.DEFAULT_ADMIN_PASSWORD || "Admin@123";
  const name = process.env.DEFAULT_ADMIN_NAME || "Admin DiCe";

  const existing = await pool.query<{ id: number; role: string }>(
    `SELECT id, role FROM users WHERE lower(email) = lower($1) LIMIT 1`,
    [email]
  );

  if (existing.rows[0]) {
    if (existing.rows[0].role !== "super_admin") {
      await pool.query(`UPDATE users SET role = 'super_admin' WHERE id = $1`, [
        existing.rows[0].id,
      ]);
      console.log(`Promoted ${email} to super_admin`);
    } else {
      console.log(`Default super_admin already present (${email})`);
    }
    return;
  }

  // Prefer promoting any existing lone admin if the default email is unused
  const anySuper = await pool.query(`SELECT id FROM users WHERE role = 'super_admin' LIMIT 1`);
  if (anySuper.rows[0]) {
    console.log("A super_admin already exists — skipping default bootstrap");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users (email, password_hash, name, role, telephone, sexe, picture, auth_provider)
     VALUES ($1, $2, $3, 'super_admin', $4, 'homme', $5, 'local')`,
    [
      email,
      passwordHash,
      name,
      "+237600000000",
      `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0A89F2&color=fff`,
    ]
  );

  if (process.env.NODE_ENV === "production") {
    console.log(`Default super_admin created: ${email} (change password immediately)`);
  } else {
    console.log(`Default super_admin created: ${email} / ${password}`);
  }
}
