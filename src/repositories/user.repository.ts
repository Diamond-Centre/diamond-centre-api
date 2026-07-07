import { pool } from "../db";
import { UserRecord } from "../types";
import { ConflictError } from "../errors/AppError";

export class UserRepository {
  async create(
    email: string,
    passwordHash: string,
    name: string,
    role: string
  ): Promise<UserRecord> {
    try {
      const result = await pool.query<UserRecord>(
        `INSERT INTO users (email, password_hash, name, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, password_hash, name, role, created_at`,
        [email, passwordHash, name, role]
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
      "SELECT id, email, password_hash, name, role, created_at FROM users WHERE email = $1",
      [email]
    );
    return result.rows[0] ?? null;
  }
}

export const userRepository = new UserRepository();
