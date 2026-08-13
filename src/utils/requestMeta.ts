import { Request } from "express";

export function getClientIp(req: Request): string | null {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim().slice(0, 64);
  }
  const ip = req.ip || req.socket?.remoteAddress;
  return ip ? String(ip).slice(0, 64) : null;
}

export function getUserAgent(req: Request): string {
  const ua = req.headers["user-agent"];
  return typeof ua === "string" ? ua.slice(0, 512) : "";
}
