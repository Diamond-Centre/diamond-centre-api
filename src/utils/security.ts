import { timingSafeEqual } from "crypto";

/** True when NODE_ENV is production. */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function isWeakSecret(value: string | undefined): boolean {
  if (!value) return true;
  const v = value.trim().toLowerCase();
  return (
    v.length < 16 ||
    v === "change_me" ||
    v === "change_me_too" ||
    v === "secret" ||
    v === "password"
  );
}

/**
 * Fail fast in production if JWT / callback secrets are missing or weak.
 * In development, only warn.
 */
export function assertSecurityConfig(): void {
  const jwt = process.env.JWT_SECRET;
  const refresh = process.env.REFRESH_TOKEN_SECRET;
  const callback = process.env.PAYMENT_CALLBACK_SECRET;

  const problems: string[] = [];

  if (isWeakSecret(jwt)) {
    problems.push("JWT_SECRET is missing or too weak (min 16 chars, not a placeholder)");
  }
  if (isWeakSecret(refresh)) {
    problems.push(
      "REFRESH_TOKEN_SECRET is missing or too weak (min 16 chars, not a placeholder)"
    );
  }
  if (isProduction() && isWeakSecret(callback)) {
    problems.push(
      "PAYMENT_CALLBACK_SECRET is required in production (min 16 chars)"
    );
  }

  if (problems.length === 0) return;

  const message = problems.join("; ");
  if (isProduction()) {
    throw new Error(`Security config invalid: ${message}`);
  }
  console.warn(`[security] ${message}`);
}

/** Constant-time string compare for secrets. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
