import { Router } from "express";
import { notificationController } from "../controllers/notification.controller";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.use(authenticate);

router.get("/", asyncHandler(notificationController.list));
router.get("/unread-count", asyncHandler(notificationController.unreadCount));
router.post("/sync", asyncHandler(notificationController.sync));
router.post("/read-all", asyncHandler(notificationController.markAllRead));
router.post("/:id/read", asyncHandler(notificationController.markRead));

export default router;
