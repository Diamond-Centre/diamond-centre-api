import { Router } from "express";
import { validationController } from "../controllers/validation.controller";
import { authenticate, requireAdmin } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post(
  "/scan",
  authenticate,
  requireAdmin,
  asyncHandler(validationController.scan)
);

router.post(
  "/entry-code",
  authenticate,
  requireAdmin,
  asyncHandler(validationController.validateEntryCode)
);

router.post(
  "/mobile-checkin",
  authenticate,
  asyncHandler(validationController.mobileCheckin)
);

router.get(
  "/mobile-status/:ticketId",
  authenticate,
  asyncHandler(validationController.mobileStatus)
);

export default router;
