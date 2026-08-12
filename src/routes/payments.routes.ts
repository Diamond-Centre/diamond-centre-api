import { Router } from "express";
import { paymentController } from "../controllers/payment.controller";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import {
  paymentCallbackRateLimiter,
  paymentRateLimiter,
} from "../middleware/rateLimit";
import {
  requirePaymentCallbackSecret,
  validateBody,
} from "../middleware/security";
import {
  initiatePaymentSchema,
  mtnCallbackSchema,
} from "../validation/schemas";

const router = Router();

router.post(
  "/initiate",
  paymentRateLimiter,
  authenticate,
  validateBody(initiatePaymentSchema),
  asyncHandler(paymentController.initiate)
);

router.post(
  "/callback/mtn",
  paymentCallbackRateLimiter,
  requirePaymentCallbackSecret,
  validateBody(mtnCallbackSchema),
  asyncHandler(paymentController.mtnCallback)
);

router.get(
  "/:id/status",
  paymentRateLimiter,
  authenticate,
  asyncHandler(paymentController.getStatus)
);

export default router;
