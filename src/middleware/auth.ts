import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, JwtPayload } from "../utils/jwt";
import { sessionRepository } from "../repositories/session.repository";

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized", message: "Missing or invalid token" });
    return;
  }

  let payload: JwtPayload;
  try {
    payload = verifyAccessToken(header.slice(7));
  } catch {
    res.status(401).json({ error: "Unauthorized", message: "Invalid or expired token" });
    return;
  }

  // Legacy tokens issued before sessions: still valid until they expire.
  if (!payload.sid) {
    req.user = payload;
    next();
    return;
  }

  sessionRepository
    .findActiveById(payload.sid)
    .then((session) => {
      if (!session || session.user_id !== payload.id) {
        res.status(401).json({
          error: "Unauthorized",
          message: "Invalid or expired token",
        });
        return;
      }
      req.user = payload;
      sessionRepository.touch(session.id).catch(() => undefined);
      next();
    })
    .catch(next);
}

/** Admin panel access: admin or super_admin. */
export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.user?.role !== "admin" && req.user?.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden", message: "Admin access required" });
    return;
  }
  next();
}

/** Only the bootstrap super admin may create/delete other admins. */
export function requireSuperAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.user?.role !== "super_admin") {
    res.status(403).json({
      error: "Forbidden",
      message: "Super admin access required",
    });
    return;
  }
  next();
}
