import { Router } from "express";
import { eventController } from "../controllers/event.controller";
import { authenticate, requireAdmin } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/", asyncHandler(eventController.list));
router.get("/:id", asyncHandler(eventController.getById));
router.post("/", authenticate, requireAdmin, asyncHandler(eventController.create));

export default router;
