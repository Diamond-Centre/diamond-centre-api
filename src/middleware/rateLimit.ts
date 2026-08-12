import rateLimit from "express-rate-limit";

/** Auth endpoints — brute-force protection. */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too Many Requests",
    message: "Too many auth attempts. Try again later.",
  },
});

/** Payment initiate / status — abuse protection. */
export const paymentRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too Many Requests",
    message: "Too many payment requests. Try again later.",
  },
});

/** Provider callbacks — allow bursts but cap floods. */
export const paymentCallbackRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too Many Requests",
    message: "Too many callback requests.",
  },
});

/** QR / entry-code validation. */
export const validationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too Many Requests",
    message: "Too many validation attempts. Try again later.",
  },
});
