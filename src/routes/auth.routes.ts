import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db";
import {
  signAccessToken,
  signRefreshToken,
  getExpiresInSeconds,
} from "../utils/jwt";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post(
  "/register",
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name || !role) {
      res.status(400).json({ error: "Bad Request", message: "Missing required fields" });
      return;
    }

    if (!["admin", "client"].includes(role)) {
      res.status(400).json({ error: "Bad Request", message: "Invalid role" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    try {
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, name, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, name, role, created_at`,
        [email, passwordHash, name, role]
      );

      const user = result.rows[0];
      res.status(201).json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        created_at: user.created_at.toISOString(),
      });
    } catch (error: unknown) {
      if ((error as { code?: string }).code === "23505") {
        res.status(409).json({ error: "Conflict", message: "Email already exists" });
        return;
      }
      throw error;
    }
  })
);

router.post(
  "/login",
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Bad Request", message: "Email and password required" });
      return;
    }

    const result = await pool.query(
      "SELECT id, email, name, role, password_hash FROM users WHERE email = $1",
      [email]
    );

    const user = result.rows[0];
    if (!user) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
      return;
    }

    const payload = { id: user.id, email: user.email, role: user.role };

    res.json({
      access_token: signAccessToken(payload),
      refresh_token: signRefreshToken(payload),
      expires_in: getExpiresInSeconds(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  })
);

export default router;
