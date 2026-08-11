import { pool } from "../db";
import { AuthProvider, UserRecord, UserRole } from "../types";
import { ConflictError } from "../errors/AppError";

const USER_COLUMNS = `id, email, password_hash, name, role, telephone, sexe, picture,
       COALESCE(auth_provider, 'local') AS auth_provider, provider_id, created_at`;

export class UserRepository {
  async create(data: {
    email: string;
    passwordHash: string | null;
    name: string;
    role: string;
    telephone: string;
    sexe: string;
    picture: string;
    authProvider?: AuthProvider;
    providerId?: string | null;
  }): Promise<UserRecord> {
    try {
      const result = await pool.query<UserRecord>(
        `INSERT INTO users (
           email, password_hash, name, role, telephone, sexe, picture,
           auth_provider, provider_id
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING ${USER_COLUMNS}`,
        [
          data.email,
          data.passwordHash,
          data.name,
          data.role,
          data.telephone,
          data.sexe,
          data.picture,
          data.authProvider ?? "local",
          data.providerId ?? null,
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
      `SELECT ${USER_COLUMNS}
       FROM users WHERE lower(email) = lower($1)`,
      [email]
    );
    return result.rows[0] ?? null;
  }

  async findById(id: number): Promise<UserRecord | null> {
    const result = await pool.query<UserRecord>(
      `SELECT ${USER_COLUMNS}
       FROM users WHERE id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findByProvider(
    provider: AuthProvider,
    providerId: string
  ): Promise<UserRecord | null> {
    const result = await pool.query<UserRecord>(
      `SELECT ${USER_COLUMNS}
       FROM users
       WHERE auth_provider = $1 AND provider_id = $2`,
      [provider, providerId]
    );
    return result.rows[0] ?? null;
  }

  async listAll(): Promise<UserRecord[]> {
    const result = await pool.query<UserRecord>(
      `SELECT ${USER_COLUMNS}
       FROM users
       ORDER BY created_at DESC`
    );
    return result.rows;
  }

  async update(
    id: number,
    data: {
      email?: string;
      passwordHash?: string;
      name?: string;
      telephone?: string;
      sexe?: string;
      picture?: string;
      authProvider?: AuthProvider;
      providerId?: string | null;
    }
  ): Promise<UserRecord | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    const push = (column: string, value: unknown) => {
      fields.push(`${column} = $${i++}`);
      values.push(value);
    };

    if (data.email !== undefined) push("email", data.email);
    if (data.passwordHash !== undefined) push("password_hash", data.passwordHash);
    if (data.name !== undefined) push("name", data.name);
    if (data.telephone !== undefined) push("telephone", data.telephone);
    if (data.sexe !== undefined) push("sexe", data.sexe);
    if (data.picture !== undefined) push("picture", data.picture);
    if (data.authProvider !== undefined) push("auth_provider", data.authProvider);
    if (data.providerId !== undefined) push("provider_id", data.providerId);

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    try {
      const result = await pool.query<UserRecord>(
        `UPDATE users SET ${fields.join(", ")}
         WHERE id = $${i}
         RETURNING ${USER_COLUMNS}`,
        values
      );
      return result.rows[0] ?? null;
    } catch (error: unknown) {
      if ((error as { code?: string }).code === "23505") {
        throw new ConflictError("Email already exists");
      }
      throw error;
    }
  }

  async deleteById(id: number): Promise<boolean> {
    const result = await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async countAdmins(): Promise<number> {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM users WHERE role = 'admin'`
    );
    return parseInt(result.rows[0]?.count ?? "0", 10) || 0;
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

  async findByIdAndRole(
    id: number,
    role: UserRole
  ): Promise<UserRecord | null> {
    const result = await pool.query<UserRecord>(
      `SELECT ${USER_COLUMNS}
       FROM users WHERE id = $1 AND role = $2`,
      [id, role]
    );
    return result.rows[0] ?? null;
  }
}

export const userRepository = new UserRepository();
