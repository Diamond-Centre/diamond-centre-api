import { Router } from "express";
import { ticketController } from "../controllers/ticket.controller";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post("/reserve", asyncHandler(ticketController.reserve));
router.get("/:id", asyncHandler(ticketController.getById));

export default router;
