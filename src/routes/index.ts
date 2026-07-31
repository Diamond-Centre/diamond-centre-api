import { Router } from "express";
import authRoutes from "./auth.routes";
import eventsRoutes from "./events.routes";
import ticketsRoutes from "./tickets.routes";
import paymentsRoutes from "./payments.routes";
import validationRoutes from "./validation.routes";
import notificationsRoutes from "./notifications.routes";
import usersRoutes from "./users.routes";
import uploadsRoutes from "./uploads.routes";
import eventChangesRoutes from "./event_changes.routes";
import certificatesRoutes from "./certificates.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/events", eventsRoutes);
router.use("/tickets", ticketsRoutes);
router.use("/payments", paymentsRoutes);
router.use("/validation", validationRoutes);
router.use("/notifications", notificationsRoutes);
router.use("/users", usersRoutes);
router.use("/uploads", uploadsRoutes);
router.use("/event-changes", eventChangesRoutes);
router.use("/certificates", certificatesRoutes);

export default router;
