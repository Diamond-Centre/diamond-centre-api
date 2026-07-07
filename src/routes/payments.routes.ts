import { Router } from "express";
import { paymentController } from "../controllers/payment.controller";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post("/initiate", asyncHandler(paymentController.initiate));
router.post("/callback/mtn", asyncHandler(paymentController.mtnCallback));
router.get("/:id/status", asyncHandler(paymentController.getStatus));

export default router;
