import { Router } from "express";
import { ticketController } from "../controllers/ticket.controller";
import { authenticate, requireAdmin } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { validateBody } from "../middleware/security";
import { reserveTicketSchema } from "../validation/schemas";
import { authRateLimiter } from "../middleware/rateLimit";

const router = Router();

router.get(
  "/",
  authenticate,
  requireAdmin,
  asyncHandler(ticketController.list)
);

router.post(
  "/reserve",
  authRateLimiter,
  validateBody(reserveTicketSchema),
  asyncHandler(ticketController.reserve)
);

router.get(
  "/:id",
  authenticate,
  asyncHandler(ticketController.getById)
);

router.delete(
  "/:id",
  authenticate,
  asyncHandler(ticketController.remove)
);

export default router;
