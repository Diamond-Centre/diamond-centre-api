import { Router } from "express";
import { validationController } from "../controllers/validation.controller";
import { authenticate, requireAdmin } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { validationRateLimiter } from "../middleware/rateLimit";

const router = Router();

router.post(
  "/scan",
  validationRateLimiter,
  authenticate,
  requireAdmin,
  asyncHandler(validationController.scan)
);

router.post(
  "/entry-code",
  validationRateLimiter,
  authenticate,
  requireAdmin,
  asyncHandler(validationController.validateEntryCode)
);

router.post(
  "/mobile-checkin",
  validationRateLimiter,
  authenticate,
  requireAdmin,
  asyncHandler(validationController.mobileCheckin)
);

router.get(
  "/mobile-status/:ticketId",
  validationRateLimiter,
  authenticate,
  asyncHandler(validationController.mobileStatus)
);

export default router;
