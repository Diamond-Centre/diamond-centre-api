import { pool } from "../db";
import { UserRecord } from "../types";
import { ConflictError } from "../errors/AppError";

export class UserRepository {
  async create(data: {
    email: string;
    passwordHash: string;
    name: string;
    role: string;
    telephone: string;
    sexe: string;
    picture: string;
  }): Promise<UserRecord> {
    try {
      const result = await pool.query<UserRecord>(
        `INSERT INTO users (email, password_hash, name, role, telephone, sexe, picture)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, email, password_hash, name, role, telephone, sexe, picture, created_at`,
        [
          data.email,
          data.passwordHash,
          data.name,
          data.role,
          data.telephone,
          data.sexe,
          data.picture,
        ]
      );
      return result.rows[0];
    } catch (error: unknown) {
      if ((error as { code?: string }).code === "23505") {
        throw new ConflictError("Email already exists");
      }
      throw error;
    }
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const result = await pool.query<UserRecord>(
      `SELECT id, email, password_hash, name, role, telephone, sexe, picture, created_at
       FROM users WHERE lower(email) = lower($1)`,
      [email]
    );
    return result.rows[0] ?? null;
  }

  async findById(id: number): Promise<UserRecord | null> {
    const result = await pool.query<UserRecord>(
      `SELECT id, email, password_hash, name, role, telephone, sexe, picture, created_at
       FROM users WHERE id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  async listAll(): Promise<UserRecord[]> {
    const result = await pool.query<UserRecord>(
      `SELECT id, email, password_hash, name, role, telephone, sexe, picture, created_at
       FROM users
       ORDER BY created_at DESC`
    );
    return result.rows;
  }

  async countByRole(): Promise<{ admins: number; clients: number; total: number }> {
    const result = await pool.query<{ role: string; count: string }>(
      `SELECT role, COUNT(*)::text AS count FROM users GROUP BY role`
    );
    let admins = 0;
    let clients = 0;
    for (const row of result.rows) {
      const n = parseInt(row.count, 10);
      if (row.role === "admin") admins = n;
      if (row.role === "client") clients = n;
    }
    return { admins, clients, total: admins + clients };
  }
}

export const userRepository = new UserRepository();
