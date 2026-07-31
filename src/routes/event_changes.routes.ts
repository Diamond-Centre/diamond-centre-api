import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { eventChangeController } from "../controllers/event_change.controller";

const router = Router();

router.use(authenticate);

router.get(
  "/:changeId",
  asyncHandler(eventChangeController.getChange)
);

router.post(
  "/:changeId/accept",
  asyncHandler(eventChangeController.accept)
);

router.get(
  "/:changeId/alternatives",
  asyncHandler(eventChangeController.alternatives)
);

router.post(
  "/:changeId/swap",
  asyncHandler(eventChangeController.swap)
);

router.post(
  "/:changeId/refund",
  asyncHandler(eventChangeController.refund)
);

export default router;
