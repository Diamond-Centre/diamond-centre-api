import rateLimit from "express-rate-limit";

const limiterBase = {
  standardHeaders: true as const,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
};

/** Auth endpoints — brute-force protection. */
export const authRateLimiter = rateLimit({
  ...limiterBase,
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    error: "Too Many Requests",
    message: "Too many auth attempts. Try again later.",
  },
});

/** Payment initiate / status — abuse protection. */
export const paymentRateLimiter = rateLimit({
  ...limiterBase,
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: {
    error: "Too Many Requests",
    message: "Too many payment requests. Try again later.",
  },
});

/** Provider callbacks — allow bursts but cap floods. */
export const paymentCallbackRateLimiter = rateLimit({
  ...limiterBase,
  windowMs: 60 * 1000,
  max: 120,
  message: {
    error: "Too Many Requests",
    message: "Too many callback requests.",
  },
});

/** QR / entry-code validation. */
export const validationRateLimiter = rateLimit({
  ...limiterBase,
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: {
    error: "Too Many Requests",
    message: "Too many validation attempts. Try again later.",
  },
});
