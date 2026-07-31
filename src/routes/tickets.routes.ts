import { Router } from "express";
import { ticketController } from "../controllers/ticket.controller";
import { authenticate, requireAdmin } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get(
  "/",
  authenticate,
  requireAdmin,
  asyncHandler(ticketController.list)
);
router.post("/reserve", asyncHandler(ticketController.reserve));
router.get("/:id", asyncHandler(ticketController.getById));

export default router;
