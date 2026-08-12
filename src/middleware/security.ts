import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { BadRequestError, ForbiddenError, UnauthorizedError } from "../errors/AppError";
import { AuthRequest } from "./auth";
import { isAdminRole } from "../models/mappers";
import { safeEqual, isProduction } from "../utils/security";

/** Validate req.body against a Zod schema; replaces body with parsed data. */
export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues
        .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
        .join("; ");
      next(new BadRequestError(message));
      return;
    }
    req.body = result.data;
    next();
  };
}

/**
 * MTN / payment provider callback must send:
 *   X-Payment-Callback-Secret: <PAYMENT_CALLBACK_SECRET>
 * In non-production, if the env var is unset, callbacks are allowed with a warning.
 */
export function requirePaymentCallbackSecret(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const expected = process.env.PAYMENT_CALLBACK_SECRET?.trim();
  const provided = String(
    req.headers["x-payment-callback-secret"] || ""
  ).trim();

  if (!expected) {
    if (isProduction()) {
      next(new UnauthorizedError("Payment callback secret not configured"));
      return;
    }
    console.warn(
      "[security] PAYMENT_CALLBACK_SECRET unset — allowing callback in development"
    );
    next();
    return;
  }

  if (!provided || !safeEqual(provided, expected)) {
    next(new UnauthorizedError("Invalid payment callback secret"));
    return;
  }
  next();
}

/** Admin or same email as ticket customer. */
export function assertTicketAccess(
  req: AuthRequest,
  customerEmail: string
): void {
  if (!req.user) {
    throw new UnauthorizedError("Unauthorized");
  }
  if (isAdminRole(req.user.role)) return;
  if (
    req.user.email &&
    customerEmail &&
    req.user.email.toLowerCase() === customerEmail.toLowerCase()
  ) {
    return;
  }
  throw new ForbiddenError("You do not have access to this ticket");
}
