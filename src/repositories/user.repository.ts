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
       FROM users WHERE email = $1`,
      [email]
    );
    return result.rows[0] ?? null;
  }
}

export const userRepository = new UserRepository();
