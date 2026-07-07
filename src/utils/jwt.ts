import jwt, { SignOptions } from "jsonwebtoken";

export interface JwtPayload {
  id: number;
  email: string;
  role: string;
}

function getSecret(key: "JWT_SECRET" | "REFRESH_TOKEN_SECRET"): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is not configured`);
  }
  return value;
}

export function signAccessToken(payload: JwtPayload): string {
  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN || "1d") as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, getSecret("JWT_SECRET"), options);
}

export function signRefreshToken(payload: JwtPayload): string {
  const options: SignOptions = {
    expiresIn: (process.env.REFRESH_TOKEN_EXPIRES_IN || "30d") as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, getSecret("REFRESH_TOKEN_SECRET"), options);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, getSecret("JWT_SECRET")) as JwtPayload;
}

export function getExpiresInSeconds(): number {
  const expiresIn = process.env.JWT_EXPIRES_IN || "1d";
  if (expiresIn.endsWith("d")) {
    return parseInt(expiresIn, 10) * 86400;
  }
  if (expiresIn.endsWith("h")) {
    return parseInt(expiresIn, 10) * 3600;
  }
  return 86400;
}
