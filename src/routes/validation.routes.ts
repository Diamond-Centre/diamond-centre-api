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

export default router;
